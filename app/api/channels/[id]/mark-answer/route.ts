import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { markChannelMessageAsAnswer } from "@/lib/channel-answer-marking";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await context.params;
    const { messageId, isMarkedAsAnswer } = await request.json();

    if (!messageId || typeof messageId !== "string" || typeof isMarkedAsAnswer !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await markChannelMessageAsAnswer({
      channelId,
      messageId,
      userId: session.user.id,
      isMarkedAsAnswer,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, isMarkedAsAnswer: result.isMarkedAsAnswer });
  } catch (error) {
    console.error("[POST /api/channels/[id]/mark-answer]", error);
    return NextResponse.json({ error: "Failed to mark message" }, { status: 500 });
  }
}
