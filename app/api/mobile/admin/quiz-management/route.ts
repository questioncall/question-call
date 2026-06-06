import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
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
import QuizGenerationLog from "@/models/QuizGenerationLog";
import QuizQuestion from "@/models/QuizQuestion";
import QuizSession from "@/models/QuizSession";
import QuizTopic from "@/models/QuizTopic";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

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

async function buildSeedSession(userId: string): Promise<AdminSeedSession> {
  const admin = (await User.findById(userId).select("name email").lean()) as
    | { name?: string; email?: string }
    | null;
  return { user: { id: userId, name: admin?.name ?? "Admin", email: admin?.email ?? null } };
}

/** GET /api/mobile/admin/quiz-management — topics (with counts) + generation stats. */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const topics = await QuizTopic.find({}).sort({ subject: 1, topic: 1, level: 1 }).lean();

    const todayBounds = getNepalDayBounds();
    const breakdownStart = new Date(todayBounds.start.getTime() - 13 * DAY_MS);

    const [questionCounts, sessionCounts, recentActivity, totals] = await Promise.all([
      QuizQuestion.aggregate<{ _id: unknown; count: number }>([
        { $group: { _id: "$topicId", count: { $sum: 1 } } },
      ]),
      QuizSession.aggregate<{ _id: unknown; count: number }>([
        { $group: { _id: "$topicId", count: { $sum: 1 } } },
      ]),
      QuizGenerationLog.find({}).sort({ createdAt: -1 }).limit(20).lean(),
      QuizGenerationLog.aggregate<{ _id: null; totalQuestions: number; generatedToday: number }>([
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
    void breakdownStart;

    const questionCountMap = new Map(questionCounts.map((e) => [String(e._id), e.count]));
    const sessionCountMap = new Map(sessionCounts.map((e) => [String(e._id), e.count]));
    const totalStats = totals[0] ?? { totalQuestions: 0, generatedToday: 0 };

    return NextResponse.json({
      topics: topics.map((topic) => ({
        ...serializeTopic(topic),
        questionCount: questionCountMap.get(topic._id.toString()) ?? 0,
        sessionCount: sessionCountMap.get(topic._id.toString()) ?? 0,
      })),
      generationStats: {
        totalQuestions: totalStats.totalQuestions,
        generatedToday: totalStats.generatedToday,
        recentActivity: recentActivity.map((entry) => ({
          id: entry._id.toString(),
          adminName: entry.adminName,
          subject: entry.subject,
          topic: entry.topic,
          level: entry.level,
          mode: entry.mode,
          requestedCount: entry.requestedCount,
          createdCount: entry.createdCount,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/mobile/admin/quiz-management error:", error);
    return NextResponse.json({ error: "Failed to load quiz topics." }, { status: 500 });
  }
}

/**
 * POST /api/mobile/admin/quiz-management — create a topic or run a seed.
 * Body: { mode: "STARTER" } | { mode: "SMART", prompt, count, maxTopics }
 *     | { mode: "TOPIC_SEED", topicId, count }
 *     | { subject, topic, level, field?, searchAliases?, isActive? }  (manual create)
 */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const rawPayload = (await request.json().catch(() => ({}))) as QuizTopicPayload;
    await connectToDatabase();

    if (rawPayload.mode === "STARTER") {
      const result = await seedStarterQuizData(await buildSeedSession(gate.userId));
      return NextResponse.json(result);
    }

    if (rawPayload.mode === "SMART" || rawPayload.prompt?.trim()) {
      const result = await seedSmartQuizData(await buildSeedSession(gate.userId), rawPayload);
      return NextResponse.json(result);
    }

    if (rawPayload.mode === "TOPIC_SEED") {
      if (!rawPayload.topicId?.trim()) {
        return NextResponse.json({ error: "A topicId is required for topic seeding." }, { status: 400 });
      }
      const result = await seedSingleQuizTopic({
        session: await buildSeedSession(gate.userId),
        topicId: rawPayload.topicId,
        count: rawPayload.count,
      });
      return NextResponse.json(result);
    }

    const payload = normalizeTopicPayload(rawPayload);
    if (!payload.subject || !payload.topic || !payload.level) {
      return NextResponse.json({ error: "Subject, topic, and level are required." }, { status: 400 });
    }

    const topic = await QuizTopic.create(payload);
    return NextResponse.json(
      { topic: { ...serializeTopic(topic), questionCount: 0, sessionCount: 0 } },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("POST /api/mobile/admin/quiz-management error:", error);
    if (error instanceof QuizSeedHttpError) {
      return NextResponse.json(error.payload, { status: error.status });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "That quiz topic already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create quiz topic." }, { status: 500 });
  }
}
