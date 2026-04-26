import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { logCallLifecycle } from "@/lib/call-logging";
import { CALL_RATE_LIMITS } from "@/lib/call-policies";
import { processExpiredChannels } from "@/lib/channel-expiration";
import { connectToDatabase } from "@/lib/mongodb";
import { enforceRequestRateLimit } from "@/lib/request-rate-limit";
import { sendPushNotificationToUser } from "@/lib/push/web-push";
import Channel from "@/models/Channel";
import CallSession from "@/models/CallSession";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

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
      .select("status timerDeadline askerId acceptorId")
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
          .select("status timerDeadline askerId acceptorId")
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

    const roomName = `call_${channelId}_${Date.now()}`;

    const newCall = await CallSession.create({
      channelId,
      roomName,
      teacherId,
      studentId,
      callerId: userId,
      mode,
      status: "RINGING",
    });

    // Fetch caller's avatar for the incoming call overlay
    const callerUser = await User.findById(userId).select("userImage").lean();
    const callerImage = callerUser?.userImage || null;

    // Notify the other participant via Pusher (user-scoped channel for global reach)
    const otherUserId = userId === askerId ? acceptorId : askerId;
    const { emitIncomingCall } = await import("@/lib/pusher/pusherServer");
    emitIncomingCall(otherUserId, {
      callSessionId: newCall._id.toString(),
      channelId,
      callerName: session.user.name || "A user",
      callerImage,
      callerId: userId,
      mode: mode as "AUDIO" | "VIDEO",
    }).catch(console.error);

    // Fire a device push notification so the callee is alerted even when the
    // app is closed or backgrounded (Pusher alone won't wake the device).
    void sendPushNotificationToUser(otherUserId, {
      type: "SYSTEM",
      message: `${session.user.name || "Someone"} is calling you (${mode === "VIDEO" ? "video" : "audio"} call)`,
      href: `/calls/${newCall._id.toString()}`,
    }).catch(() => {/* non-fatal */});

    logCallLifecycle("created", {
      callSessionId: newCall._id.toString(),
      channelId,
      callerId: userId,
      calleeId: otherUserId,
      mode,
      callerHasAvatar: Boolean(callerImage),
    });

    return NextResponse.json({ callSessionId: newCall._id.toString() }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/calls/create]", error);
    return NextResponse.json(
      { error: "Failed to create call session" },
      { status: 500 }
    );
  }
}
