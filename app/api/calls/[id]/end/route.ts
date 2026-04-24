import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { logCallLifecycle } from "@/lib/call-logging";
import {
  getCallParticipantIds,
  getCallSummaryText,
} from "@/lib/call-utils";
import { connectToDatabase } from "@/lib/mongodb";
import CallSession from "@/models/CallSession";
import Message from "@/models/Message";
import { emitChannelMessage, pusherServer } from "@/lib/pusher/pusherServer";
import { CALL_ENDED_EVENT, getChannelPusherName } from "@/lib/pusher/events";
import User from "@/models/User";
import type { ChatMessage } from "@/types/channel";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await context.params;

    await connectToDatabase();

    const callSession = await CallSession.findById(id);
    if (!callSession) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    const { teacherId, studentId, callerId } = getCallParticipantIds(callSession);
    const channelId = callSession.channelId.toString();

    if (userId !== teacherId && userId !== studentId) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Mark ended if it hasn't already been marked gracefully
    const wasAlreadyEnded = callSession.status === "ENDED" || callSession.status === "MISSED" || callSession.status === "REJECTED";

    if (!wasAlreadyEnded) {
      callSession.status = "ENDED";
      callSession.endedAt = new Date();
      await callSession.save();

      await pusherServer
        .trigger(getChannelPusherName(channelId), CALL_ENDED_EVENT, {
          callSessionId: id,
          channelId,
          endedBy: userId,
        })
        .catch(console.error);

      // Calculate duration in seconds
      const startedAt = callSession.startedAt ? new Date(callSession.startedAt).getTime() : callSession.createdAt ? new Date(callSession.createdAt).getTime() : 0;
      const endedAt = callSession.endedAt ? new Date(callSession.endedAt).getTime() : Date.now();
      const durationSeconds = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : null;

      const resolvedCallerId = callerId || userId;
      const callerUser = await User.findById(resolvedCallerId)
        .select("name")
        .lean<{ name?: string | null } | null>();
      const callerName = callerUser?.name || session.user.name || "Unknown";

      // Create a system message in the channel with call metadata
      const contentText = getCallSummaryText({
        mode: callSession.mode,
        status: "ENDED",
        durationSeconds,
      });

      const systemMsg = await Message.create({
        channelId,
        senderId: userId,
        content: contentText,
        isSystemMessage: true,
        callMetadata: {
          callSessionId: id,
          mode: callSession.mode,
          status: callSession.status,
          durationSeconds,
          callerName,
          callerId: resolvedCallerId,
        },
        sentAt: new Date(),
      });

      // Broadcast via Pusher so both participants see it in real-time
      const chatMessage: ChatMessage = {
        id: systemMsg._id.toString(),
        channelId,
        senderId: userId,
        senderName: callerName,
        content: contentText,
        mediaUrl: null,
        mediaType: null,
        isSystemMessage: true,
        isOwn: false,
        isSeen: false,
        isDelivered: true,
        sentAt: systemMsg.sentAt.toISOString(),
        callInfo: {
          callSessionId: id,
          mode: callSession.mode,
          status: callSession.status,
          durationSeconds,
          callerName,
          callerId: resolvedCallerId,
        },
      };

      await emitChannelMessage(channelId, chatMessage).catch(console.error);

      logCallLifecycle("ended", {
        callSessionId: id,
        channelId,
        endedBy: userId,
        callerId: resolvedCallerId,
        durationSeconds,
      });
    }

    return NextResponse.json({ success: true, status: callSession.status, channelId });
  } catch (error) {
    console.error("[POST /api/calls/[id]/end]", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 },
    );
  }
}
