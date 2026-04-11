import "server-only";

import QuizQuestion from "@/models/QuizQuestion";
import QuizTopic from "@/models/QuizTopic";
import QuizGenerationLog from "@/models/QuizGenerationLog";
import { generateQuizQuestions } from "@/lib/llm";
import {
  normalizeQuizAliases,
  normalizeQuizField,
  normalizeQuizLevel,
  normalizeQuizText,
  resolveQuizTopicMetadata,
} from "@/lib/quiz-topic-utils";

export const MAX_ADMIN_SEED_COUNT = 100;
const MAX_GENERATION_ATTEMPTS = 6;

export type QuizTopicPlanInput = {
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  searchAliases?: string[];
  isActive?: boolean;
};

export type QuizGenerationMode = "STARTER_SEED" | "TOPIC_SEED" | "SMART_SEED";

export function parseAdminSeedCount(value: unknown, fallback: number) {
  const normalized =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(normalized) || normalized < 1) {
    return fallback;
  }

  return Math.min(MAX_ADMIN_SEED_COUNT, Math.floor(normalized));
}

export function getQuestionSignature(questionText: string) {
  return normalizeQuizText(questionText).toLowerCase();
}

export async function upsertQuizTopicFromPlan(plan: QuizTopicPlanInput) {
  const metadata = resolveQuizTopicMetadata({
    subject: normalizeQuizText(plan.subject),
    topic: normalizeQuizText(plan.topic),
    level: normalizeQuizLevel(plan.level, normalizeQuizField(plan.field)),
    field: plan.field,
    searchAliases: normalizeQuizAliases(plan.searchAliases),
  });

  let topicDoc = await QuizTopic.findOne({
    subject: metadata.subject,
    topic: metadata.topic,
    level: metadata.level,
  });

  if (!topicDoc) {
    topicDoc = await QuizTopic.create({
      subject: metadata.subject,
      topic: metadata.topic,
      level: metadata.level,
      field: metadata.field,
      searchAliases: metadata.searchAliases,
      isActive: plan.isActive ?? true,
    });

    return { topic: topicDoc, created: true };
  }

  const mergedAliases = normalizeQuizAliases([
    ...(topicDoc.searchAliases ?? []),
    ...metadata.searchAliases,
  ]);

  topicDoc.field = metadata.field ?? topicDoc.field ?? null;
  topicDoc.searchAliases = mergedAliases;

  if (typeof plan.isActive === "boolean") {
    topicDoc.isActive = plan.isActive;
  }

  await topicDoc.save();

  return { topic: topicDoc, created: false };
}

export async function generateUniqueQuestionsForTopic(input: {
  topicId: string;
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  requestedCount: number;
}) {
  const existingQuestions = await QuizQuestion.find({ topicId: input.topicId })
    .select("questionText")
    .lean();

  const knownSignatures = new Set(
    existingQuestions.map((question) => getQuestionSignature(question.questionText)),
  );

  const questionsToInsert: Array<{
    topicId: string;
    questionText: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string | null;
  }> = [];

  for (
    let attempt = 0;
    attempt < MAX_GENERATION_ATTEMPTS && questionsToInsert.length < input.requestedCount;
    attempt += 1
  ) {
    const remaining = input.requestedCount - questionsToInsert.length;
    const batchCount = Math.min(remaining + 2, 15);
    const generated = await generateQuizQuestions({
      subject: input.subject,
      topic: input.topic,
      level: input.level,
      field: input.field,
      count: batchCount,
    });

    if (generated.length === 0) {
      continue;
    }

    for (const question of generated) {
      const signature = getQuestionSignature(question.questionText);
      if (!signature || knownSignatures.has(signature)) {
        continue;
      }

      knownSignatures.add(signature);
      questionsToInsert.push({
        topicId: input.topicId,
        questionText: question.questionText,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        explanation: question.explanation ?? null,
      });

      if (questionsToInsert.length >= input.requestedCount) {
        break;
      }
    }
  }

  if (questionsToInsert.length === 0) {
    return {
      createdCount: 0,
      totalQuestionCount: existingQuestions.length,
    };
  }

  await QuizQuestion.insertMany(questionsToInsert);
  const totalQuestionCount = await QuizQuestion.countDocuments({ topicId: input.topicId });

  return {
    createdCount: questionsToInsert.length,
    totalQuestionCount,
  };
}

export async function createQuizGenerationLog(input: {
  adminId: string;
  adminName: string;
  adminEmail?: string | null;
  topicId?: string | null;
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  mode: QuizGenerationMode;
  searchQuery?: string | null;
  requestedCount: number;
  createdCount: number;
}) {
  if (input.createdCount <= 0) {
    return null;
  }

  return QuizGenerationLog.create({
    adminId: input.adminId,
    adminName: input.adminName,
    adminEmail: input.adminEmail ?? null,
    topicId: input.topicId ?? null,
    subject: input.subject,
    topic: input.topic,
    level: input.level,
    field: input.field ?? null,
    mode: input.mode,
    searchQuery: input.searchQuery ?? null,
    requestedCount: input.requestedCount,
    createdCount: input.createdCount,
  });
}
