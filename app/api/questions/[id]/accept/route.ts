import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { emitQuestionUpdated } from "@/lib/pusher/pusherServer";
import Question from "@/models/Question";
import type { FeedQuestion } from "@/types/question";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await connectToDatabase();

    const question = await Question.findById(id).populate(
      "askerId",
      "name username userImage",
    );

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Cannot accept own question
    if (question.askerId._id.toString() === session.user.id) {
      return NextResponse.json(
        { error: "You cannot accept your own question" },
        { status: 403 },
      );
    }

    // Only OPEN or RESET questions can be accepted
    if (question.status !== "OPEN" && question.status !== "RESET") {
      return NextResponse.json(
        { error: "This question is no longer open for acceptance" },
        { status: 409 },
      );
    }

    question.status = "ACCEPTED";
    question.acceptedById = session.user.id;
    question.acceptedAt = new Date();
    await question.save();

    const asker = question.askerId as unknown as {
      _id: { toString(): string };
      name?: string;
      username?: string;
      userImage?: string;
    };

    const reactions = Array.isArray(question.reactions) ? question.reactions : [];

    const feedQuestion: FeedQuestion = {
      id: question._id.toString(),
      askerId: asker._id.toString(),
      askerName: asker.name || "Anonymous",
      askerUsername: asker.username || undefined,
      askerImage: asker.userImage || undefined,
      title: question.title,
      body: question.body,
      tier: question.tier,
      answerVisibility: question.answerVisibility,
      status: question.status,
      subject: question.subject || undefined,
      stream: question.stream || undefined,
      level: question.level || undefined,
      resetCount: question.resetCount,
      reactions: reactions.map((r: { userId: { toString(): string }; type: string }) => ({
        userId: r.userId?.toString() || "",
        type: r.type as "like" | "insightful" | "same_doubt",
      })),
      acceptedById: session.user.id,
      acceptedAt: question.acceptedAt!.toISOString(),
      acceptedByName: session.user.name || "Someone",
      answerCount: 0,
      reactionCount: reactions.length,
      createdAt: question.createdAt.toISOString(),
      updatedAt: question.updatedAt.toISOString(),
    };

    await emitQuestionUpdated(feedQuestion).catch(() => {});

    return NextResponse.json(feedQuestion);
  } catch (error) {
    console.error("[POST /api/questions/[id]/accept]", error);
    return NextResponse.json(
      { error: "Failed to accept question" },
      { status: 500 },
    );
  }
}
