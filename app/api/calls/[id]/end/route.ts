import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CallSession from "@/models/CallSession";
import Message from "@/models/Message";
import { emitChannelMessage } from "@/lib/pusher/pusherServer";
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

    const teacherId = callSession.teacherId.toString();
    const studentId = callSession.studentId.toString();

    if (userId !== teacherId && userId !== studentId) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    // Mark ended if it hasn't already been marked gracefully
    const wasAlreadyEnded = callSession.status === "ENDED" || callSession.status === "MISSED" || callSession.status === "REJECTED";

    if (!wasAlreadyEnded) {
      callSession.status = "ENDED";
      callSession.endedAt = new Date();
      await callSession.save();

      // Calculate duration in seconds
      const startedAt = callSession.startedAt ? new Date(callSession.startedAt).getTime() : callSession.createdAt ? new Date(callSession.createdAt).getTime() : 0;
      const endedAt = callSession.endedAt ? new Date(callSession.endedAt).getTime() : Date.now();
      const durationSeconds = startedAt ? Math.max(0, Math.round((endedAt - startedAt) / 1000)) : null;

      // Determine who initiated the call (the person who created the CallSession — teacherId is acceptor, studentId is asker)
      // The caller is whoever triggered the /api/calls/create, which stores the channelId
      const callerName = session.user.name || "Unknown";

      // Create a system message in the channel with call metadata
      const channelId = callSession.channelId.toString();
      const modeLabel = callSession.mode === "VIDEO" ? "Video" : "Audio";
      const contentText = durationSeconds && durationSeconds > 0
        ? `${modeLabel} call · ${formatCallDuration(durationSeconds)}`
        : `${modeLabel} call`;

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
          callerId: userId,
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
          callerId: userId,
        },
      };

      await emitChannelMessage(channelId, chatMessage).catch(console.error);
    }

    return NextResponse.json({ success: true, status: callSession.status });
  } catch (error) {
    console.error("[POST /api/calls/[id]/end]", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 },
    );
  }
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remainM = m % 60;
  return remainM > 0 ? `${h}h ${remainM}m` : `${h}h`;
}
