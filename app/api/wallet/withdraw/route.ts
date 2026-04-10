import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT } from "@/lib/pusher/events";
import { connectToDatabase } from "@/lib/mongodb";
import { emitNotification, pusherServer } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      (session.user.role !== "STUDENT" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pointsRequested, esewaNumber } = await req.json();

    if (!pointsRequested || !esewaNumber) {
      return NextResponse.json(
        { error: "pointsRequested and esewaNumber are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const config = await getPlatformConfig();
    const minPoints = config.minWithdrawalPoints;
    const rate = config.pointToNprRate;

    if (pointsRequested < minPoints) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minPoints} points` },
        { status: 400 },
      );
    }

    const user = await User.findById(session.user.id).select(
      "name email role points pointBalance isMonetized",
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.user.role === "TEACHER" && !user.isMonetized) {
      return NextResponse.json(
        { error: "Complete your qualification milestone before withdrawing." },
        { status: 400 },
      );
    }

    const availablePoints =
      session.user.role === "TEACHER"
        ? user.pointBalance ?? 0
        : user.points ?? 0;

    if (availablePoints < pointsRequested) {
      return NextResponse.json(
        { error: "Insufficient point balance" },
        { status: 400 },
      );
    }

    const existingPending = await WithdrawalRequest.findOne({
      teacherId: session.user.id,
      status: "PENDING",
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error:
            "You already have a pending withdrawal request. Wait for it to be processed.",
        },
        { status: 400 },
      );
    }

    const nprEquivalent = pointsRequested * rate;
    const requesterLabel =
      session.user.role === "TEACHER" ? "Teacher" : "Student";

    const request = await WithdrawalRequest.create({
      teacherId: session.user.id,
      pointsRequested,
      nprEquivalent,
      esewaNumber,
      status: "PENDING",
    });

    const admins = await User.find({ role: "ADMIN" });
    const adminNotifications = admins.map((admin) => ({
      userId: admin._id,
      type: "PAYMENT",
      message: `${requesterLabel} ${user.name} requested a withdrawal of ${pointsRequested} pts (NPR ${nprEquivalent}). eSewa: ${esewaNumber}`,
      isRead: false,
    }));

    if (adminNotifications.length > 0) {
      const createdNotifs = await Notification.insertMany(adminNotifications);

      for (const notif of createdNotifs) {
        await emitNotification(notif.userId.toString(), notif).catch(() => {});
      }
    }

    if (pusherServer) {
      await pusherServer
        .trigger(ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT, {
          request: {
            _id: request._id,
            teacherId: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            pointsRequested: request.pointsRequested,
            nprEquivalent: request.nprEquivalent,
            esewaNumber: request.esewaNumber,
            status: request.status,
            transactionId: request.transactionId,
            amountSent: request.amountSent,
            processedAt: request.processedAt,
            processedBy: request.processedBy,
            adminNote: request.adminNote,
            createdAt: request.createdAt,
          },
        })
        .catch(console.error);
    }

    return NextResponse.json({ success: true, requestId: request._id });
  } catch (error) {
    console.error("[POST /api/wallet/withdraw]", error);
    return NextResponse.json(
      { error: "Failed to submit withdrawal request" },
      { status: 500 },
    );
  }
}
