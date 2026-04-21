import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { processExpiredChannels } from "@/lib/channel-expiration";
import { connectToDatabase } from "@/lib/mongodb";
import { emitChannelMessage, pusherServer, emitNotification } from "@/lib/pusher/pusherServer";
import { getUserPusherName, CHANNEL_UPDATED_EVENT } from "@/lib/pusher/events";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import Answer from "@/models/Answer";
import Notification from "@/models/Notification";
import type { ChatMessage, SendMessagePayload } from "@/types/channel";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await context.params;
    const userId = session.user.id;

    await connectToDatabase();

    // Verify channel exists and user is a participant
    let channel = await Channel.findById(channelId).lean();
    
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const askerId = channel.askerId.toString();
    const acceptorId = channel.acceptorId.toString();

    if (userId !== askerId && userId !== acceptorId) {
      return NextResponse.json(
        { error: "You are not a participant of this channel" },
        { status: 403 },
      );
    }

    if (channel.status === "ACTIVE") {
      const timerDeadlineMs = new Date(channel.timerDeadline).getTime();
      if (timerDeadlineMs <= Date.now()) {
        await processExpiredChannels({ channelId });
        channel = await Channel.findById(channelId).lean();

        if (!channel) {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }
      }
    }

    // Channel must be ACTIVE to send messages
    if (channel.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This channel is no longer active" },
        { status: 409 },
      );
    }

    // Check if deadline has passed - send warning notification if at 80%
    const now = new Date();
    const deadline = new Date(channel.timerDeadline);
    const totalTime = deadline.getTime() - new Date(channel.openedAt).getTime();
    const elapsed = now.getTime() - new Date(channel.openedAt).getTime();
    const percentElapsed = totalTime > 0 ? (elapsed / totalTime) * 100 : 0;

    if (percentElapsed >= 80 && percentElapsed < 100) {
      const existingAnswer = await Answer.findOne({ channelId });
      if (!existingAnswer) {
        const notif = await Notification.create({
          userId: channel.acceptorId,
          type: "DEADLINE_WARNING",
          message: "Hurry! Time is running out to answer the question.",
        }).catch(() => null);

        if (notif) {
          await emitNotification(channel.acceptorId.toString(), notif).catch(console.error);
        }
      }
    }

    const body = (await request.json()) as SendMessagePayload;

    // Must have content or media
    if (!body.content?.trim() && !body.mediaUrl) {
      return NextResponse.json(
        { error: "Message must have content or media" },
        { status: 400 },
      );
    }

    // Save message
    const message = await Message.create({
      channelId,
      senderId: userId,
      content: body.content?.trim() || "",
      mediaUrl: body.mediaUrl || null,
      mediaType: body.mediaType || null,
      isSeen: false,
      isDelivered: true,
      sentAt: new Date(),
    });

    const chatMessage: ChatMessage = {
      id: message._id.toString(),
      channelId,
      senderId: userId,
      senderName: session.user.name || "Unknown",
      content: message.content,
      mediaUrl: message.mediaUrl,
      mediaType: message.mediaType,
      isSystemMessage: false,
      isOwn: false, // Will be set correctly on the receiving end
      isSeen: false,
      isDelivered: true,
      sentAt: message.sentAt.toISOString(),
    };

    // Broadcast via Pusher (non-fatal)
    await emitChannelMessage(channelId, chatMessage).catch(console.error);

    // Also notify counterpart's channel list via user-specific Pusher channel
    const counterpartId = userId === askerId ? acceptorId : askerId;
    if (pusherServer) {
      await pusherServer
        .trigger(getUserPusherName(counterpartId), CHANNEL_UPDATED_EVENT, {
          channelId,
          lastMessagePreview: chatMessage.content.substring(0, 80) || "Media message",
          lastMessageAt: chatMessage.sentAt,
          unreadCountIncrement: 1, // We just added an unseen message
        })
        .catch(console.error);
    }

    // Return the message with isOwn = true for the sender
    return NextResponse.json({ ...chatMessage, isOwn: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/channels/[id]/messages]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
