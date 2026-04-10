import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { emitNotification } from "@/lib/pusher/pusherServer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactionId, amountSent, adminNote } = await req.json();

    if (!transactionId || !amountSent) {
      return NextResponse.json(
        { error: "transactionId and amountSent are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const withdrawalRequest = await WithdrawalRequest.findById(id);

    if (!withdrawalRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (withdrawalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request is not in PENDING status" },
        { status: 400 }
      );
    }

    const requester = await User.findById(withdrawalRequest.teacherId).select(
      "role points pointBalance",
    );

    if (!requester) {
      return NextResponse.json({ error: "Requester not found" }, { status: 404 });
    }

    const balanceField =
      requester.role === "STUDENT" ? "points" : "pointBalance";
    const currentBalance =
      requester.role === "STUDENT"
        ? requester.points ?? 0
        : requester.pointBalance ?? 0;

    if (currentBalance < withdrawalRequest.pointsRequested) {
      return NextResponse.json(
        { error: "Requester no longer has enough points (balance may have changed)" },
        { status: 400 }
      );
    }

    await User.findByIdAndUpdate(withdrawalRequest.teacherId, {
      $inc: { [balanceField]: -withdrawalRequest.pointsRequested },
    });

    withdrawalRequest.status = "COMPLETED";
    withdrawalRequest.transactionId = transactionId;
    withdrawalRequest.amountSent = amountSent;
    withdrawalRequest.processedAt = new Date();
    withdrawalRequest.processedBy = session.user.id;
    withdrawalRequest.adminNote = adminNote || null;
    await withdrawalRequest.save();

    const notif = await Notification.create({
      userId: withdrawalRequest.teacherId,
      type: "PAYMENT",
      message: `Your withdrawal of NPR ${amountSent} has been processed. eSewa Txn ID: ${transactionId}`,
      isRead: false,
    }).catch(() => null);

    if (notif) {
      await emitNotification(withdrawalRequest.teacherId.toString(), notif).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/withdrawals/complete]", error);
    return NextResponse.json(
      { error: "Failed to complete withdrawal" },
      { status: 500 }
    );
  }
}
