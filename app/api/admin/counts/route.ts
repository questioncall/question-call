import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Notification from "@/models/Notification";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const [
      pendingWithdrawalsCount,
      expiredSubscriptionsCount,
      pendingManualSubscriptionsCount,
      unreadNotificationsCount,
    ] = await Promise.all([
      WithdrawalRequest.countDocuments({ status: "PENDING" }),
      User.countDocuments({
        role: "STUDENT",
        subscriptionStatus: "EXPIRED",
      }),
      Transaction.countDocuments({
        type: "SUBSCRIPTION_MANUAL",
        status: "PENDING",
      }),
      Notification.countDocuments({
        userId: session.user.id,
        isRead: false,
      }),
    ]);

    return NextResponse.json({
      pendingWithdrawals: pendingWithdrawalsCount,
      expiredSubscriptions: expiredSubscriptionsCount,
      pendingManualSubscriptions: pendingManualSubscriptionsCount,
      unreadNotifications: unreadNotificationsCount,
    });
  } catch (error) {
    console.error("Admin counts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch counts" },
      { status: 500 }
    );
  }
}