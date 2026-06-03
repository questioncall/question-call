import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import "@/models/User";
import Question from "@/models/Question";
import Answer from "@/models/Answer";
import Channel from "@/models/Channel";
import PeerComment from "@/models/PeerComment";
import type { FeedQuestion } from "@/types/question";

export const dynamic = "force-dynamic";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    // Ensure the Answer model schema is registered before populate
    void Answer;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
        ? limitParam
        : 50;

    const filter: Record<string, unknown> = {};
    let sort: Record<string, 1 | -1> = { resetCount: -1, createdAt: -1 };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!Number.isNaN(cursorDate.getTime())) {
        filter.createdAt = { $lt: cursorDate };
        // On paginated pages, sort by createdAt only so the cursor is unambiguous.
        // The first page still uses resetCount-priority sort to surface RESET questions.
        sort = { createdAt: -1 };
      }
    }

    const questions = await Question.find(filter)
      .sort(sort)
      .limit(limit)
      .populate("askerId", "name username userImage lastActiveAt")
      .populate("acceptedById", "name username")
      .populate("answerId") // populate linked public answer
      .lean();

    const questionIds = questions.map((question) => question._id);
    const latestChannels = questionIds.length
      ? await Channel.find({ questionId: { $in: questionIds } })
          .sort({ updatedAt: -1, openedAt: -1, createdAt: -1 })
          .select("_id questionId")
          .lean()
      : [];

    const channelIdByQuestionId = new Map<string, string>();
    for (const channel of latestChannels) {
      const questionId = channel.questionId.toString();
      if (!channelIdByQuestionId.has(questionId)) {
        channelIdByQuestionId.set(questionId, channel._id.toString());
      }
    }

    const commentCounts = questionIds.length
      ? await PeerComment.aggregate([
          { $match: { questionId: { $in: questionIds } } },
          { $group: { _id: "$questionId", count: { $sum: 1 } } },
        ])
      : [];

    const commentCountMap = new Map<string, number>();
    for (const cc of commentCounts) {
      commentCountMap.set(cc._id.toString(), cc.count);
    }

    const feedQuestions: FeedQuestion[] = await Promise.all(
      questions.map(async (q) => {
        const asker = q.askerId as unknown as {
          _id: { toString(): string };
          name?: string;
          username?: string;
          userImage?: string;
          lastActiveAt?: Date;
        } | null;
        const askerIsOnline = asker?.lastActiveAt
          ? Date.now() - new Date(asker.lastActiveAt).getTime() <
            ONLINE_THRESHOLD_MS
          : false;

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

        if (
          q.status === "SOLVED" &&
          q.answerVisibility === "PUBLIC" &&
          linkedAnswer
        ) {
          // Fetch acceptor name for the answer
          let acceptorName = acceptor?.name;
          if (!acceptorName && linkedAnswer.acceptorId) {
            const User = (await import("@/models/User")).default;
            const answerTeacher = await User.findById(linkedAnswer.acceptorId)
              .select("name")
              .lean();
            acceptorName = (answerTeacher as { name?: string })?.name;
          }

          answerData = {
            content: linkedAnswer.content,
            mediaUrls: Array.isArray(linkedAnswer.mediaUrls)
              ? linkedAnswer.mediaUrls
              : [],
            answerFormat: linkedAnswer.answerFormat,
            rating: linkedAnswer.rating ?? null,
            acceptorId:
              linkedAnswer.acceptorId?.toString() || acceptor?._id?.toString(),
            acceptorName: acceptorName || "Teacher",
            submittedAt: linkedAnswer.submittedAt?.toISOString(),
          };
        }

        return {
          id: q._id.toString(),
          channelId: channelIdByQuestionId.get(q._id.toString()) ?? null,
          askerId: asker?._id?.toString() || "",
          askerName: asker?.name || "Anonymous",
          askerUsername: asker?.username || undefined,
          askerImage: asker?.userImage || undefined,
          askerIsOnline,
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
          reactions: reactions.map(
            (r: { userId: { toString(): string }; type: string }) => ({
              userId: r.userId?.toString() || "",
              type: r.type as "like" | "insightful" | "same_doubt",
            }),
          ),
          acceptedById: acceptor?._id?.toString() || null,
          acceptedAt: q.acceptedAt
            ? new Date(q.acceptedAt).toISOString()
            : null,
          acceptedByName: acceptor?.name || null,
          answerCount: linkedAnswer ? 1 : 0,
          reactionCount: reactions.length,
          commentCount: commentCountMap.get(q._id.toString()) || 0,
          createdAt: new Date(q.createdAt).toISOString(),
          updatedAt: new Date(q.updatedAt).toISOString(),
          ...(answerData ? { answer: answerData } : {}),
        };
      }),
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
