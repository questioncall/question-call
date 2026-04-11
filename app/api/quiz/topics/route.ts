import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  buildQuizTopicSuggestions,
  searchQuizTopics,
} from "@/lib/quiz-topic-utils";
import { connectToDatabase } from "@/lib/mongodb";
import QuizQuestion from "@/models/QuizQuestion";
import QuizTopic from "@/models/QuizTopic";

function parseLimit(value: string | null) {
  const normalized = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(normalized) || normalized < 1) {
    return 24;
  }

  return Math.min(60, normalized);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can access quiz topics." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const limit = parseLimit(searchParams.get("limit"));

    await connectToDatabase();

    const topics = await QuizTopic.find({ isActive: true })
      .sort({ subject: 1, topic: 1, level: 1 })
      .lean();

    const counts = await QuizQuestion.aggregate<{
      _id: unknown;
      count: number;
    }>([
      {
        $match: {
          topicId: { $in: topics.map((topic) => topic._id) },
        },
      },
      {
        $group: {
          _id: "$topicId",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      counts.map((entry) => [String(entry._id), entry.count]),
    );

    const topicsWithCounts = topics.map((topic) => ({
      id: topic._id.toString(),
      subject: topic.subject,
      topic: topic.topic,
      level: topic.level,
      field: topic.field ?? null,
      searchAliases: topic.searchAliases ?? [],
      isActive: topic.isActive,
      questionCount: countMap.get(topic._id.toString()) ?? 0,
    }));

    const matchedTopics = searchQuizTopics(topicsWithCounts, query, limit);

    return NextResponse.json({
      query,
      totalTopics: topicsWithCounts.length,
      returnedTopics: matchedTopics.length,
      suggestions: buildQuizTopicSuggestions(
        query ? matchedTopics : topicsWithCounts,
      ),
      topics: matchedTopics,
    });
  } catch (error) {
    console.error("[GET /api/quiz/topics]", error);
    return NextResponse.json(
      { error: "Failed to load quiz topics." },
      { status: 500 },
    );
  }
}
