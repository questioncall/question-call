import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { processExpiredChannels } from "@/lib/channel-expiration";
import { connectToDatabase } from "@/lib/mongodb";
import { pusherServer, emitNotification } from "@/lib/pusher/pusherServer";
import { ANSWER_SUBMITTED_EVENT, getChannelPusherName } from "@/lib/pusher/events";
import Answer from "@/models/Answer";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { getPlatformConfig } from "@/models/PlatformConfig";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, markedMessageIds } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    await connectToDatabase();

    // Verify channel and access
    let channel = await Channel.findById(channelId).populate("questionId");
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.acceptorId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only the acceptor (teacher) can submit an answer" },
        { status: 403 },
      );
    }

    if (channel.status === "ACTIVE") {
      const timerDeadlineMs = new Date(channel.timerDeadline).getTime();
      if (timerDeadlineMs <= Date.now()) {
        await processExpiredChannels({ channelId });
        channel = await Channel.findById(channelId).populate("questionId");

        if (!channel) {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }
      }
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is not active" }, { status: 400 });
    }

    // Check if answer already submitted
    const existingAnswer = await Answer.findOne({ channelId });
    if (existingAnswer) {
      return NextResponse.json({ error: "Answer already submitted" }, { status: 400 });
    }

    const selectedMessageIds = Array.isArray(markedMessageIds)
      ? [...new Set(markedMessageIds.filter((id): id is string => typeof id === "string"))]
      : [];

    if (selectedMessageIds.some((id) => !Types.ObjectId.isValid(id))) {
      return NextResponse.json({ error: "One or more selected messages are invalid." }, { status: 400 });
    }

    let messages;

    if (selectedMessageIds.length > 0) {
      messages = await Message.find({
        _id: { $in: selectedMessageIds },
        channelId,
        senderId: session.user.id,
      }).sort({ sentAt: 1 });

      if (messages.length !== selectedMessageIds.length) {
        return NextResponse.json(
          { error: "Some selected messages could not be matched to this channel." },
          { status: 400 },
        );
      }

      // Keep the DB in sync with the messages the teacher actually selected in the UI.
      await Message.updateMany(
        { channelId, senderId: session.user.id },
        { $set: { isMarkedAsAnswer: false } }
      );
      await Message.updateMany(
        { _id: { $in: selectedMessageIds }, channelId, senderId: session.user.id },
        { $set: { isMarkedAsAnswer: true } }
      );
    } else {
      messages = await Message.find({
        channelId,
        senderId: session.user.id,
        isMarkedAsAnswer: true,
      }).sort({ sentAt: 1 });
    }
    
    if (messages.length === 0) {
      return NextResponse.json({ error: "Please mark at least one message as the answer before submitting." }, { status: 400 });
    }

    const question = channel.questionId as {
      _id: Types.ObjectId;
      answerFormat?: "TEXT" | "PHOTO" | "VIDEO" | "ANY";
      answerVisibility?: "PUBLIC" | "PRIVATE";
    };
    const requiredFormat = question.answerFormat ?? "ANY";

    // Analyze what the teacher actually marked
    const hasText = messages.some((m) => m.content && m.content.trim().length > 0);
    const hasImage = messages.some((m) => m.mediaType === "IMAGE");
    const hasVideo = messages.some((m) => m.mediaType === "VIDEO");

    // ─── Strict format validation ────────────────────────────
    if (requiredFormat === "TEXT") {
      if (!hasText) {
        return NextResponse.json(
          { error: "This question requires a text answer. Please mark at least one text message as the answer." },
          { status: 400 },
        );
      }
    } else if (requiredFormat === "PHOTO") {
      if (!hasImage) {
        return NextResponse.json(
          { error: "This question requires a photo answer. Please mark at least one image message as part of the answer." },
          { status: 400 },
        );
      }
    } else if (requiredFormat === "VIDEO") {
      if (!hasVideo) {
        return NextResponse.json(
          { error: "This question requires a video answer. Please mark at least one video message as part of the answer." },
          { status: 400 },
        );
      }
    }
    // ANY → no constraint, teacher can answer in any format

    // Determine the actual format used (stored on the Answer for display)
    let resolvedFormat = requiredFormat;
    if (requiredFormat === "ANY") {
      if (hasVideo) resolvedFormat = "VIDEO";
      else if (hasImage) resolvedFormat = "PHOTO";
      else resolvedFormat = "TEXT";
    }

    const content = messages.map((m) => m.content).filter(Boolean).join("\n\n");
    const mediaUrls = messages.map((m) => m.mediaUrl).filter(Boolean);

    // Based on the question, map the visibility
    const isPublic = question.answerVisibility === "PUBLIC";

    // Create the Answer
    const answer = await Answer.create({
      questionId: question._id,
      channelId,
      acceptorId: session.user.id,
      answerFormat: resolvedFormat,
      content,
      mediaUrls,
      isPublic,
      submittedAt: new Date(),
    });

    // ─── Monetization Tracking (Phase 7) ─────────────────────
    // Check if teacher should unlock monetization
    const config = await getPlatformConfig();
    const threshold = config.qualificationThreshold;

    const updatedTeacher = await User.findByIdAndUpdate(
      session.user.id,
      { $inc: { totalAnswered: 1 } },
      { new: true },
    );

    if (
      updatedTeacher &&
      !updatedTeacher.isMonetized &&
      updatedTeacher.totalAnswered >= threshold
    ) {
      await User.findByIdAndUpdate(session.user.id, { isMonetized: true });

      // Notify teacher they are now monetized
      const monetizationNotif = await Notification.create({
        userId: session.user.id,
        type: "CHANNEL_CLOSED",
        message: `🎉 Congratulations! You've completed ${threshold} answers. You can now earn points for every answer!`,
      }).catch(() => null);

      if (monetizationNotif) {
        await emitNotification(session.user.id, monetizationNotif);
      }
    }

    // Notify the asker perfectly in real-time
    if (pusherServer) {
      await pusherServer.trigger(
        getChannelPusherName(channelId),
        ANSWER_SUBMITTED_EVENT,
        {
          answerId: answer._id.toString(),
          submittedAt: answer.submittedAt,
        }
      );
    }

    // Create notification for asker
    const askerNotif = await Notification.create({
      userId: channel.askerId,
      type: "ANSWER_SUBMITTED",
      message: "The teacher has submitted an answer to your question. Please review and rate it.",
    }).catch(() => null);
    if (askerNotif) {
      await emitNotification(channel.askerId.toString(), askerNotif);
    }

    return NextResponse.json(answer);
  } catch (error) {
    console.error("[POST /api/answers]", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}
