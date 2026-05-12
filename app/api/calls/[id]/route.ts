import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import CallSession from "@/models/CallSession";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;

    await connectToDatabase();

    const callSession = await CallSession.findById(id)
      .select("channelId teacherId studentId callerId status mode roomName startedAt endedAt")
      .lean();

    if (!callSession) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    const teacherId = callSession.teacherId.toString();
    const studentId = callSession.studentId.toString();

    if (user.id !== teacherId && user.id !== studentId) {
      return NextResponse.json({ error: "Not a participant" }, { status: 403 });
    }

    return NextResponse.json({
      callSessionId: id,
      channelId: callSession.channelId.toString(),
      teacherId,
      studentId,
      callerId: callSession.callerId?.toString() ?? null,
      status: callSession.status,
      mode: callSession.mode,
      roomName: callSession.roomName,
      startedAt: callSession.startedAt ?? null,
      endedAt: callSession.endedAt ?? null,
    });
  } catch (error) {
    console.error("[GET /api/calls/[id]]", error);
    return NextResponse.json({ error: "Failed to get call session" }, { status: 500 });
  }
}
