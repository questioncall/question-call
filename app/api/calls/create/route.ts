import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Channel from "@/models/Channel";
import CallSession from "@/models/CallSession";

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

    const channel = await Channel.findById(channelId).select("status timerDeadline askerId acceptorId").lean();
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (channel.status !== "ACTIVE") {
      return NextResponse.json({ error: "Channel is not active. Call cannot be started." }, { status: 403 });
    }

    if (new Date(channel.timerDeadline).getTime() < Date.now()) {
      return NextResponse.json({ error: "Channel time has expired." }, { status: 403 });
    }

    const askerId = channel.askerId.toString();
    const acceptorId = channel.acceptorId.toString();

    if (userId !== askerId && userId !== acceptorId) {
      return NextResponse.json({ error: "You are not a participant of this channel." }, { status: 403 });
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
      mode,
      status: "CREATED",
    });

    // Notify the other participant via Pusher
    const otherUserId = userId === askerId ? acceptorId : askerId;
    const { emitIncomingCall } = await import("@/lib/pusher/pusherServer");
    emitIncomingCall(otherUserId, {
      callSessionId: newCall._id.toString(),
      channelId,
      callerName: session.user.name || "A user",
      mode: mode as "AUDIO" | "VIDEO",
    }).catch(console.error);

    return NextResponse.json({ callSessionId: newCall._id.toString() }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/calls/create]", error);
    return NextResponse.json(
      { error: "Failed to create call session" },
      { status: 500 }
    );
  }
}
