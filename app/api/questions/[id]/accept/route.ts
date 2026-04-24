import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionUpdated, emitChannelMessage, emitNotification, emitNewChannel } from "@/lib/pusher/pusherServer";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import { getPlatformConfig, getFormatDurationMinutes } from "@/models/PlatformConfig";
import Question from "@/models/Question";
import User from "@/models/User";
import type { FeedQuestion } from "@/types/question";
import Notification from "@/models/Notification";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectToDatabase();

    const question = await Question.findById(id).populate(
      "askerId",
      "name username userImage",
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Cannot accept own question
    if (question.askerId._id.toString() === session.user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own question" },
        { status: 403 },
      );
    }

    // Only OPEN or RESET questions can be accepted
    if (question.status !== "OPEN" && question.status !== "RESET") {
      return NextResponse.json(
        { error: "This question is no longer open for acceptance" },
        { status: 409 },
      );
    }

    // Get platform config for format time limits
    const config = await getPlatformConfig();
    const formatDurationMinutes = getFormatDurationMinutes(config, question.answerFormat);

    const now = new Date();
    const timerDeadline = new Date(now.getTime() + formatDurationMinutes * 60 * 1000);

    // Update question status
    question.status = "ACCEPTED";
    question.acceptedById = session.user.id;
    question.acceptedAt = now;
    await question.save();

    // Create the channel
    const channel = await Channel.create({
      questionId: question._id,
      askerId: question.askerId._id,
      acceptorId: session.user.id,
      openedAt: now,
      timerDeadline,
      status: "ACTIVE",
    });

    // Get acceptor's name for the auto-message
    const acceptor = await User.findById(session.user.id).select("name").lean();
    const acceptorName = (acceptor as { name?: string })?.name || session.user.name || "Someone";

    // Format duration for the message
    const durationText =
      formatDurationMinutes >= 60
        ? `${Math.floor(formatDurationMinutes / 60)} hour${Math.floor(formatDurationMinutes / 60) > 1 ? "s" : ""}`
        : `${formatDurationMinutes} minutes`;

    // Create the auto-message from acceptor
    const autoMessageContent = `Hey there! I accepted your question — the answer will be with you within ${durationText}. 🚀`;
    const autoMessage = await Message.create({
      channelId: channel._id,
      senderId: session.user.id,
      content: autoMessageContent,
      isSystemMessage: true,
      sentAt: now,
    });

    // Broadcast the auto-message via Pusher (non-fatal if fails)
    await emitChannelMessage(channel._id.toString(), {
      id: autoMessage._id.toString(),
      channelId: channel._id.toString(),
      senderId: session.user.id,
      senderName: acceptorName,
      content: autoMessageContent,
      mediaUrl: null,
      mediaType: null,
      isSystemMessage: true,
      isOwn: false,
      isSeen: false,
      isDelivered: true,
      sentAt: now.toISOString(),
    }).catch(() => {});

    // Build the FeedQuestion shape for broadcast
    const asker = question.askerId as unknown as {
      _id: { toString(): string };
      name?: string;
      username?: string;
      userImage?: string;
    };

    const reactions = Array.isArray(question.reactions) ? question.reactions : [];

    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      channelId: channel._id.toString(),
      askerId: asker._id.toString(),
      askerName: asker.name || "Anonymous",
      askerUsername: asker.username || undefined,
      askerImage: asker.userImage || undefined,
      title: question.title,
      body: question.body,
      answerFormat: question.answerFormat,
      answerVisibility: question.answerVisibility,
      status: question.status,
      subject: question.subject || undefined,
      stream: question.stream || undefined,
      level: question.level || undefined,
      resetCount: question.resetCount,
      reactions: reactions.map((r: { userId: { toString(): string }; type: string }) => ({
        userId: r.userId?.toString() || "",
        type: r.type as "like" | "insightful" | "same_doubt",
      })),
      acceptedById: session.user.id,
      acceptedAt: question.acceptedAt!.toISOString(),
      acceptedByName: acceptorName,
      answerCount: 0,
      reactionCount: reactions.length,
      commentCount: 0,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };

    await emitQuestionUpdated(feedQuestion).catch(() => {});

    // Notify Asker that their question was accepted
    const acceptNotif = await Notification.create({
      userId: asker._id,
      type: "QUESTION_ACCEPTED",
      message: `${acceptorName} accepted your question. Channel is now open.`,
      href: `/channel/${channel._id.toString()}`,
    }).catch(() => null);
    if (acceptNotif) {
      await emitNotification(asker._id.toString(), acceptNotif);
    }

    // Emit the new channel to the asker so their sidebar updates in real-time
    const channelListItem = {
      id: channel._id.toString(),
      questionTitle: question.title,
      counterpartName: acceptorName,
      counterpartImage: session.user.image || undefined,
      status: "ACTIVE",
      lastMessagePreview: autoMessageContent,
      lastMessageAt: now.toISOString(),
      unreadCount: 1, // The auto-message is unread for the asker
      timerDeadline: timerDeadline.toISOString(),
      role: "asker",
    };
    await emitNewChannel(asker._id.toString(), channelListItem).catch(() => {});

    // Return channelId so the UI can redirect
    return NextResponse.json({
      ...feedQuestion,
      channelId: channel._id.toString(),
      timerDeadline: timerDeadline.toISOString(),
      formatDurationMinutes,
    });
  } catch (error) {
    console.error("[POST /api/questions/[id]/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept question" },
      { status: 500 },
    );
  }
}
