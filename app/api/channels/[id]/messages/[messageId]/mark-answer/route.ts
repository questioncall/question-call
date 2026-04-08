import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pusherServer } from "@/lib/pusher/pusherServer";
import { MESSAGE_MARKED_EVENT, getChannelPusherName } from "@/lib/pusher/events";
import Channel from "@/models/Channel";
import Message from "@/models/Message";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isMarkedAsAnswer } = await req.json();

    if (typeof isMarkedAsAnswer !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await connectToDatabase();

    const channel = await Channel.findById(id);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is not active" }, { status: 400 });
    }

    if (channel.acceptorId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only the acceptor (teacher) can mark messages as answers" },
        { status: 403 }
      );
    }

    const message = await Message.findOne({ _id: messageId, channelId: id });
    if (!message) {
      return NextResponse.json({ error: "Message not found in this channel" }, { status: 404 });
    }

    if (message.senderId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You can only mark your own messages as answers" },
        { status: 403 }
      );
    }

    message.isMarkedAsAnswer = isMarkedAsAnswer;
    await message.save();

    if (pusherServer) {
      await pusherServer.trigger(
        getChannelPusherName(id),
        MESSAGE_MARKED_EVENT,
        {
          messageId,
          isMarkedAsAnswer,
        }
      );
    }

    return NextResponse.json({ success: true, isMarkedAsAnswer });
  } catch (error) {
    console.error("[POST /api/channels/messages/mark-answer]", error);
    return NextResponse.json(
      { error: "Failed to mark message" },
      { status: 500 }
    );
  }
}
