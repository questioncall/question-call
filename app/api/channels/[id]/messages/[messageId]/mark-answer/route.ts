import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { markChannelMessageAsAnswer } from "@/lib/channel-answer-marking";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isMarkedAsAnswer } = await req.json();

    if (typeof isMarkedAsAnswer !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await markChannelMessageAsAnswer({
      channelId: id,
      messageId,
      userId: user.id,
      isMarkedAsAnswer,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, isMarkedAsAnswer: result.isMarkedAsAnswer });
  } catch (error) {
    console.error("[POST /api/channels/messages/mark-answer]", error);
    return NextResponse.json(
      { error: "Failed to mark message" },
      { status: 500 }
    );
  }
}
