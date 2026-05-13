import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

import { logCallLifecycle } from "@/lib/call-logging";
import { CALL_RATE_LIMITS } from "@/lib/call-policies";
import { getCallParticipantIds } from "@/lib/call-utils";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import CallSession from "@/models/CallSession";
import Channel from "@/models/Channel";
import { emitCallStatusToUser } from "@/lib/pusher/pusherServer";
import { CALL_ACCEPTED_EVENT } from "@/lib/pusher/events";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;
    const { id } = await context.params;

    await connectToDatabase();

    const rateLimit = await enforceRequestRateLimit({
      ...CALL_RATE_LIMITS.accept,
      userId,
      request,
    });
    if (!rateLimit.ok) {
      logCallLifecycle("rate_limited", {
        action: CALL_RATE_LIMITS.accept.action,
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
        { error: "Only the receiving participant can accept this call." },
        { status: 403 },
      );
    }

    // Only RINGING calls can be accepted
    if (callSession.status !== "RINGING") {
      return NextResponse.json(
        { error: `Call cannot be accepted (status: ${callSession.status})` },
        { status: 409 },
      );
    }

    callSession.status = "ACTIVE";
    callSession.startedAt = new Date();
    await callSession.save();

    // ── Generate LiveKit token for the accepting user (OPT-1) ──
    // By returning the token here we eliminate a separate GET /token round-trip,
    // shaving ~400-1000ms off the accept-to-connected time.
    let token: string | null = null;
    let serverUrl: string | null = null;
    let channelId: string = callSession.channelId.toString();
    let timerDeadline: string | null = null;
    let timeExtensionCount = 0;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (apiKey && apiSecret && wsUrl) {
      const participantName = userId === teacherId ? "Teacher" : "Student";
      const at = new AccessToken(apiKey, apiSecret, {
        identity: userId,
        name: user.name || participantName,
        ttl: 7200,
      });
      at.addGrant({ roomJoin: true, room: callSession.roomName, roomRecord: false });
      token = await at.toJwt();
      serverUrl = wsUrl;

      // Fetch channel timer info in parallel — avoids a separate /token call
      const channel = await Channel.findById(callSession.channelId)
        .select("timerDeadline timeExtensionCount")
        .lean();
      if (channel) {
        timerDeadline = new Date(channel.timerDeadline).toISOString();
        timeExtensionCount = channel.timeExtensionCount ?? 0;
      }

      logCallLifecycle("token_issued", {
        callSessionId: id,
        channelId,
        issuedTo: userId,
        roomName: callSession.roomName,
        issuedVia: "accept",
      });
    }

    // Notify the caller that the call was accepted
    const resolvedCallerId = callerId || (userId === teacherId ? studentId : teacherId);
    await emitCallStatusToUser(resolvedCallerId, CALL_ACCEPTED_EVENT, {
      callSessionId: id,
      channelId,
      acceptedBy: userId,
    }).catch(console.error);

    logCallLifecycle("accepted", {
      callSessionId: id,
      channelId,
      callerId: resolvedCallerId,
      acceptedBy: userId,
    });

    return NextResponse.json({
      success: true,
      callSessionId: id,
      status: "ACTIVE",
      // Token payload — lets the client skip a separate GET /token call
      token,
      serverUrl,
      channelId,
      timerDeadline,
      timeExtensionCount,
    });
  } catch (error) {
    console.error("[POST /api/calls/[id]/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept call" },
      { status: 500 },
    );
  }
}
