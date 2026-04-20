import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { ADMIN_UPDATES_CHANNEL, ADMIN_WITHDRAWAL_EVENT } from "@/lib/pusher/events";
import { connectToDatabase } from "@/lib/mongodb";
import { roundPoints } from "@/lib/points";
import { emitNotification, pusherServer } from "@/lib/pusher/pusherServer";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import { getMasterAdminEmails } from "@/lib/user-directory";
import { sendTransactionEmail } from "@/lib/sendEmails/sendTransactionEmail";

class WithdrawalRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WithdrawalRequestError";
    this.status = status;
  }
}

function isDuplicatePendingWithdrawal(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      (session.user.role !== "STUDENT" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      pointsRequested,
      esewaNumber: providedEsewaNumber,
      saveEsewaNumber,
    } = await req.json();
    const requestedPoints = roundPoints(Number(pointsRequested));
    const trimmedEsewaNumber =
      typeof providedEsewaNumber === "string" ? providedEsewaNumber.trim() : "";

    await connectToDatabase();
    const config = await getPlatformConfig();
    const minPoints = config.minWithdrawalPoints;
    const rate = config.pointToNprRate;

    if (!requestedPoints || requestedPoints <= 0) {
      return NextResponse.json(
        { error: "pointsRequested and esewaNumber are required" },
        { status: 400 },
      );
    }

    if (requestedPoints < minPoints) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minPoints} points` },
        { status: 400 },
      );
    }

    const dbSession = await mongoose.startSession();
    const createdPayload = await (async () => {
      try {
        return await dbSession.withTransaction(async () => {
          const user = await User.findById(session.user.id)
            .select("name email role points pointBalance esewaNumber")
            .session(dbSession);

          if (!user) {
            throw new WithdrawalRequestError("User not found", 404);
          }

          const esewaNumber = trimmedEsewaNumber || user.esewaNumber?.trim() || "";
          if (!esewaNumber) {
            throw new WithdrawalRequestError(
              "pointsRequested and esewaNumber are required",
              400,
            );
          }

          const existingPending = await WithdrawalRequest.findOne({
            teacherId: session.user.id,
            status: "PENDING",
          }).session(dbSession);

          if (existingPending) {
            throw new WithdrawalRequestError(
              "You already have a pending withdrawal request. Wait for it to be processed.",
              400,
            );
          }

          const balanceField = user.role === "TEACHER" ? "pointBalance" : "points";
          const updatedUser = await User.findOneAndUpdate(
            {
              _id: user._id,
              [balanceField]: { $gte: requestedPoints },
            },
            {
              $inc: { [balanceField]: -requestedPoints },
              ...(saveEsewaNumber === true
                ? { $set: { esewaNumber } }
                : {}),
            },
            {
              new: true,
              session: dbSession,
            },
          );

          if (!updatedUser) {
            throw new WithdrawalRequestError("Insufficient point balance", 400);
          }

          const nprEquivalent = roundPoints(requestedPoints * rate);
          const [createdRequest] = await WithdrawalRequest.create(
            [
              {
                teacherId: session.user.id,
                pointsRequested: requestedPoints,
                nprEquivalent,
                esewaNumber,
                status: "PENDING",
                pointsReserved: true,
              },
            ],
            { session: dbSession },
          );

          return {
            request: {
              _id: createdRequest._id.toString(),
              pointsRequested: createdRequest.pointsRequested,
              nprEquivalent: createdRequest.nprEquivalent,
              esewaNumber: createdRequest.esewaNumber,
              status: "PENDING" as const,
              transactionId: null,
              amountSent: null,
              processedAt: null,
              processedBy: null,
              adminNote: null,
              createdAt: createdRequest.createdAt,
            },
            requester: {
              _id: updatedUser._id.toString(),
              name: updatedUser.name,
              email: updatedUser.email,
              role: updatedUser.role as "STUDENT" | "TEACHER",
            },
          };
        });
      } finally {
        await dbSession.endSession();
      }
    })();

    const finalizedRequest = createdPayload?.request;
    const finalizedRequester = createdPayload?.requester;

    if (!finalizedRequest || !finalizedRequester) {
      throw new Error("Failed to create withdrawal request.");
    }

    const requesterLabel =
      finalizedRequester.role === "TEACHER" ? "Teacher" : "Student";

    const admins = await User.find({ role: "ADMIN" });
    const adminNotifications = admins.map((admin) => ({
      userId: admin._id,
      type: "PAYMENT",
      message: `${requesterLabel} ${finalizedRequester.name} requested a withdrawal of ${finalizedRequest.pointsRequested} pts (NPR ${finalizedRequest.nprEquivalent}). eSewa: ${finalizedRequest.esewaNumber}`,
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
            _id: finalizedRequest._id,
            teacherId: {
              _id: finalizedRequester._id,
              name: finalizedRequester.name,
              email: finalizedRequester.email,
              role: finalizedRequester.role,
            },
            pointsRequested: finalizedRequest.pointsRequested,
            nprEquivalent: finalizedRequest.nprEquivalent,
            esewaNumber: finalizedRequest.esewaNumber,
            status: finalizedRequest.status,
            transactionId: finalizedRequest.transactionId,
            amountSent: finalizedRequest.amountSent,
            processedAt: finalizedRequest.processedAt,
            processedBy: finalizedRequest.processedBy,
            adminNote: finalizedRequest.adminNote,
            createdAt: finalizedRequest.createdAt,
          },
        })
        .catch(console.error);
    }

    const masterAdminEmails = await getMasterAdminEmails();
    if (masterAdminEmails.length > 0) {
      const withdrawalMessage = `${requesterLabel} ${finalizedRequester.name} (${finalizedRequester.email}) requested a withdrawal of ${finalizedRequest.pointsRequested} pts (NPR ${finalizedRequest.nprEquivalent}). eSewa: ${finalizedRequest.esewaNumber}`;
      void sendTransactionEmail(
        masterAdminEmails,
        "New Withdrawal Request",
        withdrawalMessage,
        finalizedRequest._id,
        `NPR ${finalizedRequest.nprEquivalent}`,
        finalizedRequester.email,
      ).catch(console.error);
    }

    return NextResponse.json({ success: true, requestId: finalizedRequest._id });
  } catch (error) {
    if (error instanceof WithdrawalRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (isDuplicatePendingWithdrawal(error)) {
      return NextResponse.json(
        {
          error:
            "You already have a pending withdrawal request. Wait for it to be processed.",
        },
        { status: 400 },
      );
    }

    console.error("[POST /api/wallet/withdraw]", error);
    return NextResponse.json(
      { error: "Failed to submit withdrawal request" },
      { status: 500 },
    );
  }
}
