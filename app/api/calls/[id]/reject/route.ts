import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { logCallLifecycle } from "@/lib/call-logging";
import { CALL_RATE_LIMITS } from "@/lib/call-policies";
import { getCallParticipantIds, getCallSummaryText } from "@/lib/call-utils";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";
import CallSession from "@/models/CallSession";
import Message from "@/models/Message";
import { emitCallStatusToUser, emitChannelMessage } from "@/lib/pusher/pusherServer";
import { CALL_REJECTED_EVENT } from "@/lib/pusher/events";
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

    const rateLimit = await enforceRequestRateLimit({
      ...CALL_RATE_LIMITS.reject,
      userId,
      request,
    });
    if (!rateLimit.ok) {
      logCallLifecycle("rate_limited", {
        action: CALL_RATE_LIMITS.reject.action,
        userId,
        callSessionId: id,
      });
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const callSession = await CallSession.findById(id);
    if (!callSession) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    const { teacherId, studentId, callerId, calleeId } =
      getCallParticipantIds(callSession);

    if (userId !== teacherId && userId !== studentId) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    if (callerId && calleeId && userId !== calleeId) {
      return NextResponse.json(
        { error: "Only the receiving participant can reject this call." },
        { status: 403 },
      );
    }

    // Only RINGING calls can be rejected
    if (callSession.status !== "RINGING") {
      return NextResponse.json(
        { error: `Call cannot be rejected (status: ${callSession.status})` },
        { status: 409 },
      );
    }

    callSession.status = "REJECTED";
    callSession.endedAt = new Date();
    await callSession.save();

    // Notify the caller that the call was rejected
    const resolvedCallerId = callerId || (userId === teacherId ? studentId : teacherId);
    await emitCallStatusToUser(resolvedCallerId, CALL_REJECTED_EVENT, {
      callSessionId: id,
      channelId: callSession.channelId.toString(),
      rejectedBy: userId,
    }).catch(console.error);

    // Insert a system message so both participants see the rejected call in history
    const channelId = callSession.channelId.toString();
    const callerUser = await User.findById(resolvedCallerId)
      .select("name")
      .lean<{ name?: string | null } | null>();
    const resolvedCallerName = callerUser?.name || "Unknown";
    const contentText = getCallSummaryText({
      mode: callSession.mode,
      status: "REJECTED",
    });

    const systemMsg = await Message.create({
      channelId,
      senderId: userId,
      content: contentText,
      isSystemMessage: true,
      callMetadata: {
        callSessionId: id,
        mode: callSession.mode,
        status: "REJECTED",
        durationSeconds: null,
        callerName: resolvedCallerName,
        callerId: resolvedCallerId,
      },
      sentAt: new Date(),
    });

    const chatMessage: ChatMessage = {
      id: systemMsg._id.toString(),
      channelId,
      senderId: userId,
      senderName: session.user.name || "Unknown",
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
        status: "REJECTED",
        durationSeconds: null,
        callerName: resolvedCallerName,
        callerId: resolvedCallerId,
      },
    };

    await emitChannelMessage(channelId, chatMessage).catch(console.error);

    logCallLifecycle("rejected", {
      callSessionId: id,
      channelId,
      callerId: resolvedCallerId,
      rejectedBy: userId,
    });

    return NextResponse.json({ success: true, status: "REJECTED" });
  } catch (error) {
    console.error("[POST /api/calls/[id]/reject]", error);
    return NextResponse.json(
      { error: "Failed to reject call" },
      { status: 500 },
    );
  }
}
