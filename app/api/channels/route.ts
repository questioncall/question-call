import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Types } from "mongoose";
import "@/models/User";
import "@/models/Question";
import Channel from "@/models/Channel";
import Message from "@/models/Message";
import type { ChannelListItem } from "@/types/channel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = session.user.id;

    // Validate userId is a valid ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Find all channels where user is asker or acceptor
    const channels = await Channel.find({
      $or: [{ askerId: userId }, { acceptorId: userId }],
    })
      .sort({ updatedAt: -1 })
      .populate("questionId", "title")
      .populate("askerId", "name username userImage")
      .populate("acceptorId", "name username userImage")
      .lean();

    // For each channel, get the last message and unread count
    const channelIds = channels.map((c) => c._id);
    
    if (channelIds.length === 0) {
      return NextResponse.json([]);
    }

    const lastMessages = await Message.aggregate([
      { $match: { channelId: { $in: channelIds } } },
      { $sort: { sentAt: -1 } },
      {
        $group: {
          _id: "$channelId",
          content: { $first: "$content" },
          sentAt: { $first: "$sentAt" },
        },
      },
    ]);

    const unreadCounts = await Message.aggregate([
      { 
        $match: { 
          channelId: { $in: channelIds },
          senderId: { $ne: new Types.ObjectId(userId) },
          isSeen: false 
        } 
      },
      {
        $group: {
          _id: "$channelId",
          count: { $sum: 1 },
        },
      },
    ]);

    const lastMessageMap = new Map(
      lastMessages.map((m) => [m._id.toString(), { content: m.content, sentAt: m.sentAt }]),
    );

    const unreadCountMap = new Map(
      unreadCounts.map((m) => [m._id.toString(), m.count]),
    );

    const items: ChannelListItem[] = channels.map((ch) => {
      // Handle cases where populate might return null
      const askerIdObj = ch.askerId as unknown as { _id?: { toString(): string }; name?: string; userImage?: string } | null;
      const acceptorIdObj = ch.acceptorId as unknown as { _id?: { toString(): string }; name?: string; userImage?: string } | null;
      const questionObj = ch.questionId as unknown as { title?: string } | null;
      
      const isAsker = askerIdObj?._id?.toString() === userId;
      
      const counterpart = isAsker ? acceptorIdObj : askerIdObj;
      const lastMsg = lastMessageMap.get(ch._id.toString());
      const unreadCount = unreadCountMap.get(ch._id.toString()) || 0;

      return {
        id: ch._id.toString(),
        questionTitle: questionObj?.title || "Untitled",
        counterpartName: counterpart?.name || "Unknown",
        counterpartImage: counterpart?.userImage || undefined,
        status: ch.status as ChannelListItem["status"],
        lastMessagePreview: lastMsg?.content?.substring(0, 80) || undefined,
        lastMessageAt: lastMsg?.sentAt ? new Date(lastMsg.sentAt).toISOString() : undefined,
        unreadCount,
        timerDeadline: new Date(ch.timerDeadline).toISOString(),
        role: isAsker ? "asker" : "acceptor",
      };
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error("[GET /api/channels]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch channels", details: message },
      { status: 500 },
    );
  }
}
