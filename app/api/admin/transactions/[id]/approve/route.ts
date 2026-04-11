import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitNotification } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

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

    if (transaction.type !== "SUBSCRIPTION_MANUAL") {
      return NextResponse.json(
        { error: "Only manual subscription transactions can be approved" },
        { status: 400 },
      );
    }

    if (transaction.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending transactions can be approved" },
        { status: 400 },
      );
    }

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
    await user.save();

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

    const notification = await Notification.create({
      userId: transaction.userId,
      type: "PAYMENT",
      message: `Your manual payment for ${plan.name} was approved. Access is active until ${nextSubscriptionEnd.toLocaleDateString()}.`,
      isRead: false,
    }).catch(() => null);

    if (notification) {
      await emitNotification(transaction.userId.toString(), notification).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      subscriptionEnd: nextSubscriptionEnd.toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/admin/transactions/[id]/approve]", error);
    return NextResponse.json(
      { error: "Failed to approve transaction" },
      { status: 500 },
    );
  }
}
