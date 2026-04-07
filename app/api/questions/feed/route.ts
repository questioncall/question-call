import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import type { FeedQuestion } from "@/types/question";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const questions = await Question.find()
      .sort({ resetCount: -1, createdAt: -1 })
      .limit(50)
      .populate("askerId", "name username userImage")
      .populate("acceptedById", "name username")
      .lean();

    const feedQuestions: FeedQuestion[] = questions.map((q) => {
      const asker = q.askerId as unknown as {
        _id: { toString(): string };
        name?: string;
        username?: string;
        userImage?: string;
      } | null;

      const acceptor = q.acceptedById as unknown as {
        _id: { toString(): string };
        name?: string;
        username?: string;
      } | null;

      const reactions = Array.isArray(q.reactions) ? q.reactions : [];

      return {
        id: q._id.toString(),
        askerId: asker?._id?.toString() || "",
        askerName: asker?.name || "Anonymous",
        askerUsername: asker?.username || undefined,
        askerImage: asker?.userImage || undefined,
        title: q.title,
        body: q.body,
        tier: q.tier,
        answerVisibility: q.answerVisibility,
        status: q.status,
        subject: q.subject || undefined,
        stream: q.stream || undefined,
        level: q.level || undefined,
        resetCount: q.resetCount ?? 0,
        reactions: reactions.map((r: { userId: { toString(): string }; type: string }) => ({
          userId: r.userId?.toString() || "",
          type: r.type as "like" | "insightful" | "same_doubt",
        })),
        acceptedById: acceptor?._id?.toString() || null,
        acceptedAt: q.acceptedAt ? new Date(q.acceptedAt).toISOString() : null,
        acceptedByName: acceptor?.name || null,
        answerCount: 0, // Will be populated when Answer model is in place
        reactionCount: reactions.length,
        createdAt: new Date(q.createdAt).toISOString(),
        updatedAt: new Date(q.updatedAt).toISOString(),
      };
    });

    return NextResponse.json(feedQuestions);
  } catch (error) {
    console.error("[GET /api/questions/feed]", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 },
    );
  }
}
