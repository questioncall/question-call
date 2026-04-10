import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";
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

    const { adminNote } = await req.json();

    await connectToDatabase();

    const withdrawalRequest = await WithdrawalRequest.findById(id);

    if (!withdrawalRequest || withdrawalRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request not found or not pending" },
        { status: 404 }
      );
    }

    withdrawalRequest.status = "REJECTED";
    withdrawalRequest.processedAt = new Date();
    withdrawalRequest.processedBy = session.user.id;
    withdrawalRequest.adminNote = adminNote || null;
    await withdrawalRequest.save();

    const notif = await Notification.create({
      userId: withdrawalRequest.teacherId,
      type: "PAYMENT",
      message: `Your withdrawal request of ${withdrawalRequest.pointsRequested} pts was rejected. Reason: ${adminNote || "No reason given."}`,
      isRead: false,
    }).catch(() => null);

    if (notif) {
      await emitNotification(withdrawalRequest.teacherId.toString(), notif).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/admin/withdrawals/reject]", error);
    return NextResponse.json(
      { error: "Failed to reject withdrawal" },
      { status: 500 }
    );
  }
}
