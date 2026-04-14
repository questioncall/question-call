import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { completeCoursePurchase } from "@/lib/course-purchases";
import { connectToDatabase } from "@/lib/mongodb";
import { emitNotification, emitSubscriptionUpdated } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import { sendTransactionEmail } from "@/lib/sendEmails/sendTransactionEmail";
import { getMasterAdminEmails } from "@/lib/user-directory";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adminNote } = (await req.json().catch(() => ({}))) as {
      adminNote?: string | null;
    };

    await connectToDatabase();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending transactions can be approved" },
        { status: 400 },
      );
    }

    let successPayload: Record<string, unknown> = { success: true };
    let notificationMessage = "Your payment was approved.";

    if (transaction.type === "SUBSCRIPTION_MANUAL") {
      const user = await User.findById(transaction.userId).select(
        "name subscriptionStatus subscriptionEnd trialUsed",
      );

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const config = await getPlatformConfig();
      const plans = getHydratedPlans(config);
      const plan = plans.find((entry) => entry.slug === transaction.planSlug);

      if (!plan) {
        return NextResponse.json(
          { error: "Transaction plan is missing or invalid" },
          { status: 400 },
        );
      }

      const now = new Date();
      const currentSubscriptionEnd =
        user.subscriptionEnd && new Date(user.subscriptionEnd) > now
          ? new Date(user.subscriptionEnd)
          : now;
      const nextSubscriptionEnd = new Date(
        currentSubscriptionEnd.getTime() +
          plan.durationDays * 24 * 60 * 60 * 1000,
      );

      user.subscriptionStatus = "ACTIVE";
      user.subscriptionEnd = nextSubscriptionEnd;
      user.trialUsed = true;
      user.planSlug = transaction.planSlug;
      user.questionsAsked = 0;
      await user.save();

      await emitSubscriptionUpdated(transaction.userId.toString(), {
        subscriptionStatus: "ACTIVE",
        subscriptionEnd: nextSubscriptionEnd.toISOString(),
        planSlug: transaction.planSlug,
        questionsAsked: 0,
      }).catch(console.error);

      transaction.status = "COMPLETED";
      transaction.gateway = "MANUAL";
      transaction.meta = {
        ...(transaction.meta || {}),
        adminAction: "APPROVED",
        adminApprovedAt: now.toISOString(),
        adminApprovedBy: session.user.id,
        adminNote: adminNote?.trim() || null,
        subscriptionEndsAt: nextSubscriptionEnd.toISOString(),
      };
      await transaction.save();

      notificationMessage = `Your manual payment for ${plan.name} was approved. Access is active until ${nextSubscriptionEnd.toLocaleDateString()}.`;
      successPayload = {
        success: true,
        subscriptionEnd: nextSubscriptionEnd.toISOString(),
      };
    } else if (transaction.type === "COURSE_PURCHASE") {
      const coursePurchase = await completeCoursePurchase({
        transactionDocumentId: transaction._id.toString(),
        gateway: "MANUAL",
        metaPatch: {
          adminAction: "APPROVED",
          adminApprovedAt: new Date().toISOString(),
          adminApprovedBy: session.user.id,
          adminNote: adminNote?.trim() || null,
          paymentChannel:
            transaction.meta &&
            typeof transaction.meta === "object" &&
            "paymentChannel" in transaction.meta
              ? transaction.meta.paymentChannel
              : "ESEWA_MANUAL",
        },
      });

      notificationMessage = `Your manual payment for ${coursePurchase.courseName} was approved. Course access is now unlocked.`;
      successPayload = {
        success: true,
        courseId: coursePurchase.courseId,
        enrollmentId: coursePurchase.enrollmentId,
        teacherEarnings: coursePurchase.teacherEarnings,
      };
    } else {
      return NextResponse.json(
        {
          error:
            "Only manual subscription and manual course purchase transactions can be approved",
        },
        { status: 400 },
      );
    }

    const notification = await Notification.create({
      userId: transaction.userId,
      type: "PAYMENT",
      message: notificationMessage,
      isRead: false,
    }).catch(() => null);

    if (notification) {
      await emitNotification(transaction.userId.toString(), notification).catch(() => {});
    }

    const recipientUser = await User.findById(transaction.userId).select("email");
    if (recipientUser?.email) {
      void sendTransactionEmail(
        recipientUser.email,
        "Transaction Approved",
        notificationMessage,
        transaction.transactionId,
        `Amount: ${transaction.amount}`,
        recipientUser.email
      ).catch(console.error);
    }

    const masterAdminEmails = await getMasterAdminEmails();
    if (masterAdminEmails.length > 0) {
      void sendTransactionEmail(
        masterAdminEmails,
        "Manual Transaction Approved",
        `Admin has approved a manual transaction for ${recipientUser?.email ?? "Unknown"}.`,
        transaction.transactionId,
        `Amount: ${transaction.amount}`,
        recipientUser?.email ?? "Unknown"
      ).catch(console.error);
    }

    return NextResponse.json(successPayload);
  } catch (error) {
    console.error("[POST /api/admin/transactions/[id]/approve]", error);
    return NextResponse.json(
      { error: "Failed to approve transaction" },
      { status: 500 },
    );
  }
}
