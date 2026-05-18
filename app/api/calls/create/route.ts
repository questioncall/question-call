import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

import { logCallLifecycle } from "@/lib/call-logging";
import { CALL_RATE_LIMITS } from "@/lib/call-policies";
import { processExpiredChannels } from "@/lib/channel-expiration";
import { getChannelRoomName, prepareChannelRoom } from "@/lib/livekit-room";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";
import { sendPushNotificationToUser } from "@/lib/push/web-push";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import Channel from "@/models/Channel";
import CallSession from "@/models/CallSession";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { channelId, mode } = await request.json();
    if (!channelId || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (mode !== "AUDIO" && mode !== "VIDEO") {
      return NextResponse.json({ error: "Invalid call mode" }, { status: 400 });
    }

    await connectToDatabase();

    const rateLimit = await enforceRequestRateLimit({
      ...CALL_RATE_LIMITS.create,
      userId,
      request,
    });
    if (!rateLimit.ok) {
      logCallLifecycle("rate_limited", {
        action: CALL_RATE_LIMITS.create.action,
        userId,
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

    let channel = await Channel.findById(channelId)
      .select("status timerDeadline timeExtensionCount askerId acceptorId roomName")
      .lean();
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const askerId = channel.askerId.toString();
    const acceptorId = channel.acceptorId.toString();

    if (userId !== askerId && userId !== acceptorId) {
      return NextResponse.json({ error: "You are not a participant of this channel." }, { status: 403 });
    }

    if (channel.status === "ACTIVE") {
      const timerDeadlineMs = new Date(channel.timerDeadline).getTime();
      if (timerDeadlineMs <= Date.now()) {
        await processExpiredChannels({ channelId });
        channel = await Channel.findById(channelId)
          .select("status timerDeadline timeExtensionCount askerId acceptorId roomName")
          .lean();

        if (!channel) {
          return NextResponse.json({ error: "Channel not found" }, { status: 404 });
        }
      }
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is not active. Call cannot be started." }, { status: 403 });
    }

    if (new Date(channel.timerDeadline).getTime() < Date.now()) {
      return NextResponse.json({ error: "Channel time has expired." }, { status: 403 });
    }

    // acceptorId is considered the teacher, askerId is the student
    const teacherId = acceptorId;
    const studentId = askerId;

    // Deterministic room name per channel — shared across every call in the
    // channel so clients can pre-warm a LiveKit connection in the workspace
    // before any call is initiated. Stored on the Channel doc at accept time;
    // fall back to the deterministic value for legacy channels that predate
    // that field, and self-heal by kicking off room prep async.
    const roomName = channel.roomName || getChannelRoomName(channelId);
    if (!channel.roomName) {
      void prepareChannelRoom(channelId);
    }
    const otherUserId = userId === askerId ? acceptorId : askerId;

    const newCallPromise = CallSession.create({
      channelId,
      roomName,
      teacherId,
      studentId,
      callerId: userId,
      mode,
      status: "RINGING",
    });

    const callerUserPromise = User.findById(userId).select("userImage name").lean();

    // Issue LiveKit tokens for BOTH participants up-front. The callee token
    // travels in the Pusher payload so they can pre-warm the room while the
    // ringtone plays — eliminating the GET /token round-trip on accept.
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;
    const livekitConfigured = Boolean(apiKey && apiSecret && wsUrl);

    async function mintToken(identity: string, displayName: string) {
      if (!livekitConfigured) return null;
      const at = new AccessToken(apiKey!, apiSecret!, {
        identity,
        name: displayName,
        ttl: 7200,
      });
      at.addGrant({ roomJoin: true, room: roomName, roomRecord: false });
      return at.toJwt();
    }

    const [newCall, callerUser, callerToken, calleeToken] = await Promise.all([
      newCallPromise,
      callerUserPromise,
      mintToken(userId, user.name || "Caller"),
      mintToken(otherUserId, "Callee"),
    ]);

    const callerImage = callerUser?.userImage || null;
    const callSessionId = newCall._id.toString();
    const timerDeadlineIso = new Date(channel.timerDeadline).toISOString();
    const timeExtensionCount = channel.timeExtensionCount ?? 0;

    const { emitIncomingCall } = await import("@/lib/pusher/pusherServer");

    // Pusher is awaited — if it fails the callee never rings, which we want
    // surfaced as an error. The push notification is fire-and-forget; it's a
    // wake-up signal not a correctness requirement.
    await emitIncomingCall(otherUserId, {
      callSessionId,
      channelId,
      callerName: user.name || "A user",
      callerImage,
      callerId: userId,
      mode: mode as "AUDIO" | "VIDEO",
      token: calleeToken,
      serverUrl: wsUrl || null,
      timerDeadline: timerDeadlineIso,
      timeExtensionCount,
    });

    void sendPushNotificationToUser(otherUserId, {
      type: "SYSTEM",
      title: user.name || "Incoming Call",
      message: mode === "VIDEO" ? "📹 Video call" : "📞 Audio call",
      href: `/call/${callSessionId}`,
      icon: callerImage,
      extraData: {
        callSessionId,
        callerId: userId,
        callerName: user.name || "Someone",
        mode,
      },
    }).catch((err) => {
      console.warn("[calls/create] push notification failed:", err);
    });

    logCallLifecycle("created", {
      callSessionId,
      channelId,
      callerId: userId,
      calleeId: otherUserId,
      mode,
      callerHasAvatar: Boolean(callerImage),
    });

    return NextResponse.json(
      {
        callSessionId,
        channelId,
        roomName,
        mode,
        callerId: userId,
        teacherId,
        studentId,
        status: "RINGING",
        token: callerToken,
        serverUrl: wsUrl || null,
        timerDeadline: timerDeadlineIso,
        timeExtensionCount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/calls/create]", error);
    return NextResponse.json(
      { error: "Failed to create call session" },
      { status: 500 }
    );
  }
}
