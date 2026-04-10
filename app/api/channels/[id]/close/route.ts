import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pusherServer, emitNotification } from "@/lib/pusher/pusherServer";
import { CHANNEL_CLOSED_EVENT, getChannelPusherName, getUserPusherName, CHANNEL_UPDATED_EVENT } from "@/lib/pusher/events";
import Channel from "@/models/Channel";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { getPlatformConfig } from "@/models/PlatformConfig";
import { calcTotalPointsEarned } from "@/lib/points";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Valid rating (1-5) is required" }, { status: 400 });
    }

    await connectToDatabase();

    const channel = await Channel.findById(id);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is already closed or expired" }, { status: 400 });
    }

    if (channel.askerId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Only the asker can close the channel" }, { status: 403 });
    }

    // Process Closing
    channel.status = "CLOSED";
    channel.closedAt = new Date();
    channel.isClosedByAsker = true;
    channel.ratingGiven = rating;
    await channel.save();

    // 1. Update Question status to SOLVED
    const question = await Question.findById(channel.questionId);
    if (question) {
      question.status = "SOLVED";
      
      // If Answer exists, link it to the Question
      const answer = await Answer.findOne({ channelId: channel._id });
      if (answer) {
        answer.rating = rating;
        await answer.save();

        if (answer.isPublic) {
          question.answerId = answer._id;
        }
      }
      await question.save();
    }

    // 2. Get the answer for point calculation
    const answer = await Answer.findOne({ channelId: channel._id });

    // 3. Update Teacher's stats + credit points
    const teacher = await User.findById(channel.acceptorId);
    if (teacher) {
      // Update rating stats (new Phase 7 fields)
      teacher.overallRatingSum = (teacher.overallRatingSum || 0) + rating;
      teacher.overallRatingCount = (teacher.overallRatingCount || 0) + 1;

      // Also update legacy overallScore for backward compatibility
      const totalRatings = teacher.totalAnswered || 0;
      const seedVotes = 5;
      const seedScore = 1.0;
      const currentScore = teacher.overallScore || 0;
      const accumulatedRealScore = currentScore * totalRatings;
      const accumulatedTotalScore = (seedScore * seedVotes) + accumulatedRealScore + rating;
      teacher.overallScore = accumulatedTotalScore / (seedVotes + (totalRatings + 1));

      // Increment total answered (we do it here if not already done in /api/answers)
      // Note: totalAnswered is counted per channel close, not per answer submission
      teacher.totalAnswered = (teacher.totalAnswered || 0) + 1;

      if (teacher.totalAnswered >= 10) {
        teacher.teacherModeVerified = true;
      }

      // Credit points to teacher if monetized and answer exists
      if (teacher.isMonetized && answer) {
        const config = await getPlatformConfig();
        const pointsEarned = calcTotalPointsEarned(
          answer.answerFormat,
          rating,
          config,
        );

        teacher.pointBalance = (teacher.pointBalance || 0) + pointsEarned;
      }

      await teacher.save();

      // 4. Create Notification for Teacher
      const notifMessage = teacher.isMonetized && answer
        ? `Student rated your solution ${rating}/5 stars. Points credited!`
        : `Student rated your solution ${rating}/5 stars.`;

      const notif = await Notification.create({
        userId: teacher._id,
        type: "RATING_RECEIVED",
        message: notifMessage,
      }).catch(() => null);
      if (notif) await emitNotification(teacher._id.toString(), notif);
    }

    // Notify clients instantly
    if (pusherServer) {
      // Broadcast Channel Status Change
      await pusherServer.trigger(
        getChannelPusherName(channel._id.toString()),
        CHANNEL_CLOSED_EVENT,
        {
          status: "CLOSED",
          ratingGiven: rating,
        }
      );
      
      // Force refresh on the opponent's sidebar list
      await pusherServer.trigger(
        getUserPusherName(channel.acceptorId.toString()),
        CHANNEL_UPDATED_EVENT,
        {
          channelId: channel._id.toString(),
        }
      );
    }

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    console.error("[POST /api/channels/close]", error);
    return NextResponse.json(
      { error: "Failed to close channel" },
      { status: 500 }
    );
  }
}
