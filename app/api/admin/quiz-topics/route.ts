import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  AdminSeedSession,
  QuizSeedHttpError,
  seedSingleQuizTopic,
  seedSmartQuizData,
  seedStarterQuizData,
} from "@/lib/quiz-admin-seed";
import { getNepalDayBounds } from "@/lib/quiz";
import {
  normalizeQuizAliases,
  normalizeQuizField,
  normalizeQuizLevel,
  normalizeQuizText,
  resolveQuizTopicMetadata,
} from "@/lib/quiz-topic-utils";
import { connectToDatabase } from "@/lib/mongodb";
import QuizGenerationLog from "@/models/QuizGenerationLog";
import QuizQuestion from "@/models/QuizQuestion";
import QuizSession from "@/models/QuizSession";
import QuizTopic from "@/models/QuizTopic";

type QuizTopicPayload = {
  mode?: "STARTER" | "SMART" | "TOPIC_SEED";
  prompt?: string;
  count?: number;
  maxTopics?: number;
  topicId?: string;
  subject?: string;
  topic?: string;
  level?: string;
  field?: string | null;
  searchAliases?: string[];
  isActive?: boolean;
};

const NEPAL_TIMEZONE = "Asia/Kathmandu";
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeTopicPayload(payload: QuizTopicPayload) {
  const field = normalizeQuizField(payload.field);

  return {
    subject: normalizeQuizText(payload.subject ?? ""),
    topic: normalizeQuizText(payload.topic ?? ""),
    level: normalizeQuizLevel(payload.level ?? "", field),
    field,
    searchAliases: normalizeQuizAliases(payload.searchAliases),
    isActive: payload.isActive ?? true,
  };
}

function serializeTopic(topic: {
  _id: { toString(): string };
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  searchAliases?: string[];
  isActive: boolean;
}) {
  const metadata = resolveQuizTopicMetadata({
    subject: topic.subject,
    topic: topic.topic,
    level: topic.level,
    field: topic.field ?? null,
    searchAliases: topic.searchAliases ?? [],
  });

  return {
    id: topic._id.toString(),
    subject: metadata.subject,
    topic: metadata.topic,
    level: metadata.level,
    field: metadata.field,
    levelCategory: metadata.levelCategory,
    searchAliases: metadata.searchAliases,
    isActive: topic.isActive,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const topics = await QuizTopic.find({})
      .sort({ subject: 1, topic: 1, level: 1 })
      .lean();

    const todayBounds = getNepalDayBounds();
    const breakdownStart = new Date(todayBounds.start.getTime() - 13 * DAY_MS);

    const [questionCounts, sessionCounts, recentActivity, adminTotals, dailyAdminBreakdown, totals] =
      await Promise.all([
        QuizQuestion.aggregate<{ _id: unknown; count: number }>([
          {
            $group: {
              _id: "$topicId",
              count: { $sum: 1 },
            },
          },
        ]),
        QuizSession.aggregate<{ _id: unknown; count: number }>([
          {
            $group: {
              _id: "$topicId",
              count: { $sum: 1 },
            },
          },
        ]),
        QuizGenerationLog.find({})
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        QuizGenerationLog.aggregate<{
          _id: { adminId: unknown; adminName: string };
          totalQuestions: number;
          totalRuns: number;
          lastGeneratedAt: Date;
        }>([
          {
            $group: {
              _id: {
                adminId: "$adminId",
                adminName: "$adminName",
              },
              totalQuestions: { $sum: "$createdCount" },
              totalRuns: { $sum: 1 },
              lastGeneratedAt: { $max: "$createdAt" },
            },
          },
          { $sort: { totalQuestions: -1, lastGeneratedAt: -1 } },
          { $limit: 12 },
        ]),
        QuizGenerationLog.aggregate<{
          _id: { day: string; adminId: unknown; adminName: string };
          totalQuestions: number;
          totalRuns: number;
          lastGeneratedAt: Date;
        }>([
          {
            $match: {
              createdAt: {
                $gte: breakdownStart,
              },
            },
          },
          {
            $group: {
              _id: {
                day: {
                  $dateToString: {
                    date: "$createdAt",
                    format: "%Y-%m-%d",
                    timezone: NEPAL_TIMEZONE,
                  },
                },
                adminId: "$adminId",
                adminName: "$adminName",
              },
              totalQuestions: { $sum: "$createdCount" },
              totalRuns: { $sum: 1 },
              lastGeneratedAt: { $max: "$createdAt" },
            },
          },
          { $sort: { "_id.day": -1, totalQuestions: -1 } },
          { $limit: 40 },
        ]),
        QuizGenerationLog.aggregate<{
          _id: null;
          totalQuestions: number;
          generatedToday: number;
        }>([
          {
            $group: {
              _id: null,
              totalQuestions: { $sum: "$createdCount" },
              generatedToday: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ["$createdAt", todayBounds.start] },
                        { $lt: ["$createdAt", todayBounds.end] },
                      ],
                    },
                    "$createdCount",
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const questionCountMap = new Map(
      questionCounts.map((entry) => [String(entry._id), entry.count]),
    );
    const sessionCountMap = new Map(
      sessionCounts.map((entry) => [String(entry._id), entry.count]),
    );
    const totalStats = totals[0] ?? {
      totalQuestions: 0,
      generatedToday: 0,
    };

    return NextResponse.json({
      topics: topics.map((topic) => {
        const serialized = serializeTopic(topic);

        return {
          ...serialized,
          questionCount: questionCountMap.get(topic._id.toString()) ?? 0,
          sessionCount: sessionCountMap.get(topic._id.toString()) ?? 0,
        };
      }),
      generationStats: {
        totalQuestions: totalStats.totalQuestions,
        generatedToday: totalStats.generatedToday,
        adminTotals: adminTotals.map((entry) => ({
          adminId: String(entry._id.adminId),
          adminName: entry._id.adminName,
          totalQuestions: entry.totalQuestions,
          totalRuns: entry.totalRuns,
          lastGeneratedAt: entry.lastGeneratedAt.toISOString(),
        })),
        dailyAdminBreakdown: dailyAdminBreakdown.map((entry) => ({
          day: entry._id.day,
          adminId: String(entry._id.adminId),
          adminName: entry._id.adminName,
          totalQuestions: entry.totalQuestions,
          totalRuns: entry.totalRuns,
          lastGeneratedAt: entry.lastGeneratedAt.toISOString(),
        })),
        recentActivity: recentActivity.map((entry) => ({
          id: entry._id.toString(),
          adminId: entry.adminId.toString(),
          adminName: entry.adminName,
          adminEmail: entry.adminEmail ?? null,
          subject: entry.subject,
          topic: entry.topic,
          level: entry.level,
          field: entry.field ?? null,
          mode: entry.mode,
          searchQuery: entry.searchQuery ?? null,
          requestedCount: entry.requestedCount,
          createdCount: entry.createdCount,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/quiz-topics]", error);
    return NextResponse.json(
      { error: "Failed to load quiz topics." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawPayload = (await request.json().catch(() => ({}))) as QuizTopicPayload;

    await connectToDatabase();

    if (rawPayload.mode === "STARTER") {
      const result = await seedStarterQuizData(session as AdminSeedSession);
      return NextResponse.json(result);
    }

    if (rawPayload.mode === "SMART" || rawPayload.prompt?.trim()) {
      const result = await seedSmartQuizData(session as AdminSeedSession, rawPayload);
      return NextResponse.json(result);
    }

    if (rawPayload.mode === "TOPIC_SEED") {
      if (!rawPayload.topicId?.trim()) {
        return NextResponse.json(
          { error: "A topicId is required for topic seeding." },
          { status: 400 },
        );
      }

      const result = await seedSingleQuizTopic({
        session: session as AdminSeedSession,
        topicId: rawPayload.topicId,
        count: rawPayload.count,
      });

      return NextResponse.json(result);
    }

    const payload = normalizeTopicPayload(rawPayload);

    if (!payload.subject || !payload.topic || !payload.level) {
      return NextResponse.json(
        { error: "Subject, topic, and level are required." },
        { status: 400 },
      );
    }

    const topic = await QuizTopic.create(payload);
    const serialized = serializeTopic(topic);

    return NextResponse.json(
      {
        topic: {
          ...serialized,
          questionCount: 0,
          sessionCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/admin/quiz-topics]", error);

    if (error instanceof QuizSeedHttpError) {
      return NextResponse.json(error.payload, { status: error.status });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "That quiz topic already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create quiz topic." },
      { status: 500 },
    );
  }
}
