import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import "@/models/User";
import "@/models/Question";
import { getFormatDurationMinutes, getPlatformConfig } from "@/models/PlatformConfig";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import Answer from "@/models/Answer";
import type { ChannelDetail, ChatMessage } from "@/types/channel";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const userId = session.user.id;

    await connectToDatabase();

    const channel = await Channel.findById(id)
      .populate("questionId", "title body answerFormat answerVisibility")
      .populate("askerId", "name username userImage")
      .populate("acceptorId", "name username userImage")
      .lean();

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Only participants can view the channel
    const askerId = (channel.askerId as unknown as { _id: { toString(): string } })._id.toString();
    const acceptorId = (channel.acceptorId as unknown as { _id: { toString(): string } })._id.toString();

    if (userId !== askerId && userId !== acceptorId) {
      return NextResponse.json(
        { error: "You are not a participant of this channel" },
        { status: 403 },
      );
    }

    const question = channel.questionId as unknown as {
      title?: string;
      body?: string;
      answerFormat?: string;
      answerVisibility?: string;
    };

    const asker = channel.askerId as unknown as {
      _id: { toString(): string };
      name?: string;
      username?: string;
      userImage?: string;
    };

    const acceptor = channel.acceptorId as unknown as {
      _id: { toString(): string };
      name?: string;
      username?: string;
      userImage?: string;
    };

    const config = await getPlatformConfig();
    const formatDurationMinutes = getFormatDurationMinutes(config, question.answerFormat || "ANY");

    const isAnswerSubmitted = await Answer.exists({ channelId: id });

    const channelDetail: ChannelDetail = {
      id: channel._id.toString(),
      questionId: (channel.questionId as unknown as { _id: { toString(): string } })._id.toString(),
      askerId: askerId,
      acceptorId: acceptorId,
      openedAt: new Date(channel.openedAt).toISOString(),
      timerDeadline: new Date(channel.timerDeadline).toISOString(),
      closedAt: channel.closedAt ? new Date(channel.closedAt).toISOString() : null,
      status: channel.status as ChannelDetail["status"],
      isClosedByAsker: channel.isClosedByAsker,
      ratingGiven: channel.ratingGiven ?? null,
      createdAt: new Date(channel.createdAt!).toISOString(),
      updatedAt: new Date(channel.updatedAt!).toISOString(),
      questionTitle: question.title || "Untitled",
      questionBody: question.body || "",
      answerFormat: question.answerFormat || "ANY",
      answerVisibility: question.answerVisibility || "PUBLIC",
      askerName: asker.name || "Anonymous",
      askerUsername: asker.username || undefined,
      askerImage: asker.userImage || undefined,
      acceptorName: acceptor.name || "Anonymous",
      acceptorUsername: acceptor.username || undefined,
      acceptorImage: acceptor.userImage || undefined,
      formatDurationMinutes,
      isAnswerSubmitted: !!isAnswerSubmitted,
    };

    // Fetch messages
    const messages = await Message.find({ channelId: id })
      .sort({ sentAt: 1 })
      .populate("senderId", "name")
      .lean();

    const chatMessages: ChatMessage[] = messages.map((msg) => {
      const sender = msg.senderId as unknown as {
        _id: { toString(): string };
        name?: string;
      };

      return {
        id: msg._id.toString(),
        channelId: msg.channelId.toString(),
        senderId: sender._id.toString(),
        senderName: sender.name || "Unknown",
        content: msg.content || "",
        mediaUrl: msg.mediaUrl || null,
        mediaType: msg.mediaType || null,
        isSystemMessage: msg.isSystemMessage || false,
        isOwn: sender._id.toString() === userId,
        isSeen: msg.isSeen || false,
        isDelivered: msg.isDelivered || false,
        isMarkedAsAnswer: msg.isMarkedAsAnswer || false,
        sentAt: new Date(msg.sentAt).toISOString(),
      };
    });

    return NextResponse.json({ channel: channelDetail, messages: chatMessages });
  } catch (error) {
    console.error("[GET /api/channels/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch channel" },
      { status: 500 },
    );
  }
}
