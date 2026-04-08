import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import type { FeedQuestion } from "@/types/question";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    // Ensure the Answer model schema is registered before populate
    void Answer;

    const questions = await Question.find()
      .sort({ resetCount: -1, createdAt: -1 })
      .limit(50)
      .populate("askerId", "name username userImage")
      .populate("acceptedById", "name username")
      .populate("answerId") // populate linked public answer
      .lean();

    const feedQuestions: FeedQuestion[] = await Promise.all(
      questions.map(async (q) => {
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

        // Build answer data if this is a solved public question with answerId
        let answerData: FeedQuestion["answer"] | undefined;
        const linkedAnswer = q.answerId as unknown as {
          _id: { toString(): string };
          content?: string;
          mediaUrls?: string[];
          answerFormat?: string;
          rating?: number | null;
          acceptorId?: { toString(): string };
          submittedAt?: Date;
        } | null;

        if (q.status === "SOLVED" && q.answerVisibility === "PUBLIC" && linkedAnswer) {
          // Fetch acceptor name for the answer
          let acceptorName = acceptor?.name;
          if (!acceptorName && linkedAnswer.acceptorId) {
            const User = (await import("@/models/User")).default;
            const answerTeacher = await User.findById(linkedAnswer.acceptorId).select("name").lean();
            acceptorName = (answerTeacher as { name?: string })?.name;
          }

          answerData = {
            content: linkedAnswer.content,
            mediaUrls: Array.isArray(linkedAnswer.mediaUrls) ? linkedAnswer.mediaUrls : [],
            answerFormat: linkedAnswer.answerFormat,
            rating: linkedAnswer.rating ?? null,
            acceptorName: acceptorName || "Teacher",
            submittedAt: linkedAnswer.submittedAt?.toISOString(),
          };
        }

        return {
          id: q._id.toString(),
          askerId: asker?._id?.toString() || "",
          askerName: asker?.name || "Anonymous",
          askerUsername: asker?.username || undefined,
          askerImage: asker?.userImage || undefined,
          title: q.title,
          body: q.body,
          images: Array.isArray(q.images) ? q.images : [],
          answerFormat: q.answerFormat || "ANY",
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
          answerCount: linkedAnswer ? 1 : 0,
          reactionCount: reactions.length,
          createdAt: new Date(q.createdAt).toISOString(),
          updatedAt: new Date(q.updatedAt).toISOString(),
          ...(answerData ? { answer: answerData } : {}),
        };
      })
    );

    return NextResponse.json(feedQuestions);
  } catch (error) {
    console.error("[GET /api/questions/feed]", error);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 },
    );
  }
}
