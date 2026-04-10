import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import { emitNotification, pusherServer } from "@/lib/pusher/pusherServer";
import { ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT } from "@/lib/pusher/events";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pointsRequested, esewaNumber } = await req.json();

    if (!pointsRequested || !esewaNumber) {
      return NextResponse.json(
        { error: "pointsRequested and esewaNumber are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const config = await getPlatformConfig();
    const minPoints = config.minWithdrawalPoints;
    const rate = config.pointToNprRate;

    if (pointsRequested < minPoints) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minPoints} points` },
        { status: 400 }
      );
    }

    const teacher = await User.findById(session.user.id);

    if (!teacher || (teacher.pointBalance ?? 0) < pointsRequested) {
      return NextResponse.json(
        { error: "Insufficient point balance" },
        { status: 400 }
      );
    }

    // Check: no other PENDING request already exists for this teacher
    const existingPending = await WithdrawalRequest.findOne({
      teacherId: session.user.id,
      status: "PENDING",
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending withdrawal request. Wait for it to be processed." },
        { status: 400 }
      );
    }

    const nprEquivalent = pointsRequested * rate;

    // Create the withdrawal request
    const request = await WithdrawalRequest.create({
      teacherId: session.user.id,
      pointsRequested,
      nprEquivalent,
      esewaNumber,
      status: "PENDING",
    });

    // Notify all admins
    const admins = await User.find({ role: "ADMIN" });
    const adminNotifications = admins.map((admin) => ({
      userId: admin._id,
      type: "PAYMENT",
      message: `Teacher ${teacher.name} has requested a withdrawal of ${pointsRequested} pts (NPR ${nprEquivalent}). eSewa: ${esewaNumber}`,
      isRead: false,
    }));

    if (adminNotifications.length > 0) {
      const createdNotifs = await Notification.insertMany(adminNotifications);
      // Emit real-time notifications to each admin
      for (const notif of createdNotifs) {
        await emitNotification(notif.userId.toString(), notif).catch(() => {});
      }
    }

    if (pusherServer) {
      await pusherServer.trigger(ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT, { 
        request: {
          _id: request._id,
          teacherId: request.teacherId,
          pointsRequested: request.pointsRequested,
          nprEquivalent: request.nprEquivalent,
          esewaNumber: request.esewaNumber,
          status: request.status,
          createdAt: request.createdAt,
          teacherName: teacher.name, // To easily display in the admin table
          teacherEmail: teacher.email
        } 
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, requestId: request._id });
  } catch (error) {
    console.error("[POST /api/wallet/withdraw]", error);
    return NextResponse.json(
      { error: "Failed to submit withdrawal request" },
      { status: 500 }
    );
  }
}
