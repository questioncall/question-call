import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { logCallLifecycle } from "@/lib/call-logging";
import { CALL_RATE_LIMITS } from "@/lib/call-policies";
import { getCallParticipantIds } from "@/lib/call-utils";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";
import CallSession from "@/models/CallSession";
import { emitCallStatusToUser } from "@/lib/pusher/pusherServer";
import { CALL_ACCEPTED_EVENT } from "@/lib/pusher/events";

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

    // Notify the caller that the call was accepted
    const resolvedCallerId = callerId || (userId === teacherId ? studentId : teacherId);
    await emitCallStatusToUser(resolvedCallerId, CALL_ACCEPTED_EVENT, {
      callSessionId: id,
      channelId: callSession.channelId.toString(),
      acceptedBy: userId,
    }).catch(console.error);

    logCallLifecycle("accepted", {
      callSessionId: id,
      channelId: callSession.channelId.toString(),
      callerId: resolvedCallerId,
      acceptedBy: userId,
    });

    return NextResponse.json({
      success: true,
      callSessionId: id,
      status: "ACTIVE",
    });
  } catch (error) {
    console.error("[POST /api/calls/[id]/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept call" },
      { status: 500 },
    );
  }
}
