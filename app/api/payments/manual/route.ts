import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";

cloudinary.config({
  secure: true,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const transactionId = formData.get("transactionId") as string;
    const transactorName = formData.get("transactorName") as string;
    const planSlug = formData.get("planSlug") as string;
    const file = formData.get("screenshot") as File | null;

    if (!transactionId || !transactorName || !planSlug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = SUBSCRIPTION_PLANS.find((p) => p.slug === planSlug);
    if (!plan) {
      return NextResponse.json({ error: "Invalid subscription plan" }, { status: 400 });
    }
    const totalAmount = plan.price + plan.tax;

    await connectToDatabase();

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
      userId: session.user.id, 
      status: "PENDING"
    });

    if (existingPendingAccount) {
      existingPendingAccount.transactorName = transactorName;
      if (screenshotUrl) {
        existingPendingAccount.screenshotUrl = screenshotUrl;
      }
      await existingPendingAccount.save();

      return NextResponse.json(
        { message: "Transaction updated successfully. We will verify it shortly." },
        { status: 200 }
      );
    }

    // 3. Rule -> Final Fallback: Create new manually pending transaction.
    // Notice how we don't block differing userIds, so Admin can resolve conflicts.
    await Transaction.create({
      userId: session.user.id,
      type: "SUBSCRIPTION_MANUAL",
      amount: totalAmount,
      status: "PENDING",
      transactionId,
      transactorName,
      planSlug,
      screenshotUrl,
    });

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
