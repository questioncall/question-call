import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import Transaction from "@/models/Transaction";
import Course from "@/models/Course";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { sendTransactionEmail } from "@/lib/sendEmails/sendTransactionEmail";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { ADMIN_UPDATES_CHANNEL } from "@/lib/pusher/events";
import { getMasterAdminEmails } from "@/lib/user-directory";

cloudinary.config({
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const authenticatedUser = await getAuthenticatedUser(req);
    if (!authenticatedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const transactionId = formData.get("transactionId") as string;
    const transactorName = formData.get("transactorName") as string;
    const planSlug = formData.get("planSlug") as string | null;
    const courseId = formData.get("courseId") as string | null;
    const file = formData.get("screenshot") as File | null;

    const isCourseMode = !!courseId;

    if (!transactionId || !transactorName || (!planSlug && !courseId)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    let totalAmount: number;
    let transactionType: "SUBSCRIPTION_MANUAL" | "COURSE_PURCHASE";
    let courseMeta: Record<string, unknown> | undefined;

    if (isCourseMode) {
      const course = await Course.findById(courseId).select("_id title price pricingModel instructorId status").lean();
      if (!course || course.status !== "ACTIVE") {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }
      if (course.pricingModel !== "PAID") {
        return NextResponse.json({ error: "This course does not require payment." }, { status: 400 });
      }
      totalAmount = typeof course.price === "number" ? course.price : 0;
      transactionType = "COURSE_PURCHASE";
      courseMeta = {
        courseId: course._id.toString(),
        courseName: course.title,
        instructorId: course.instructorId?.toString(),
        pricingModel: course.pricingModel,
        grossAmount: totalAmount,
        studentId: authenticatedUser.id,
        paymentChannel: "ESEWA_MANUAL",
      };
    } else {
      const config = await getPlatformConfig();
      const hydratedPlans = getHydratedPlans(config);
      const plan = hydratedPlans.find((p) => p.slug === planSlug);
      if (!plan) {
        return NextResponse.json({ error: "Invalid subscription plan" }, { status: 400 });
      }
      totalAmount = plan.price + plan.tax;
      transactionType = "SUBSCRIPTION_MANUAL";
    }

    // 1. Rule -> Completed Check
    const existingCompleted = await Transaction.findOne({ transactionId, status: "COMPLETED" });
    if (existingCompleted) {
      return NextResponse.json(
        { error: "This transaction ID has already been verified and processed." },
        { status: 409 } // Conflict
      );
    }

    // Process file upload if provided
    let screenshotUrl = undefined;
    // Check both if file exists and if it has actual data 
    // (formData sometimes passes empty files of 0 bytes if input is left blank)
    if (file && file.size > 0) {
      if (!process.env.CLOUDINARY_URL && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)) {
        return NextResponse.json({ error: "Server missing Cloudinary credentials." }, { status: 500 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult: any = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "eduask_payments", resource_type: "auto" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
      screenshotUrl = uploadResult.secure_url;
    }

    // 2. Rule -> Smart Typo Fix Check (User submitted previously but made a typo)
    const existingPendingAccount = await Transaction.findOne({
      transactionId,
      userId: authenticatedUser.id,
      status: "PENDING"
    });

    if (existingPendingAccount) {
      existingPendingAccount.transactorName = transactorName;
      if (screenshotUrl) {
        existingPendingAccount.screenshotUrl = screenshotUrl;
      }
      await existingPendingAccount.save();

      const masterEmails = await getMasterAdminEmails();
      if (masterEmails.length > 0) {
        const updateSubject = isCourseMode ? "Manual Course Payment Updated" : "Manual Subscription Updated";
        const updateBody = isCourseMode
          ? `A user has submitted an update for a pending manual course payment for "${courseMeta?.courseName ?? courseId}".`
          : `A user has submitted an update for an existing pending manual subscription for plan "${planSlug}".`;
        void sendTransactionEmail(
          masterEmails,
          updateSubject,
          updateBody,
          existingPendingAccount._id.toString(),
          `NPR ${totalAmount}`,
          authenticatedUser.email ?? "Unknown"
        ).catch(console.error);
      }

      return NextResponse.json(
        { message: "Transaction updated successfully. We will verify it shortly." },
        { status: 200 }
      );
    }

    // 3. Rule -> Final Fallback: Create new manually pending transaction.
    // Notice how we don't block differing userIds, so Admin can resolve conflicts.
    await Transaction.create({
      userId: authenticatedUser.id,
      type: transactionType,
      amount: totalAmount,
      status: "PENDING",
      transactionId,
      transactorName,
      ...(isCourseMode ? { metadata: courseMeta } : { planSlug }),
      screenshotUrl,
    });

    // Notify admins via Pusher for real-time count update
    if (pusherServer) {
      await pusherServer.trigger(ADMIN_UPDATES_CHANNEL, "admin:manual-payment-submitted", {
        transactionId,
        ...(isCourseMode ? { courseId, courseName: courseMeta?.courseName } : { planName: planSlug }),
        amount: totalAmount,
        userId: authenticatedUser.id,
      }).catch(console.error);
    }

    const masterEmailsNew = await getMasterAdminEmails();
    if (masterEmailsNew.length > 0) {
      const newSubject = isCourseMode ? "New Manual Course Payment Initiated" : "New Manual Subscription Initiated";
      const newBody = isCourseMode
        ? `A user has initiated a manual payment for course "${courseMeta?.courseName ?? courseId}".`
        : `A user has initiated a manual payment for subscription plan "${planSlug}".`;
      void sendTransactionEmail(
        masterEmailsNew,
        newSubject,
        newBody,
        transactionId,
        `NPR ${totalAmount}`,
        authenticatedUser.email ?? "Unknown"
      ).catch(console.error);
    }

    return NextResponse.json(
      { message: "Transaction submitted successfully. We will verify it shortly." },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Manual payment error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
