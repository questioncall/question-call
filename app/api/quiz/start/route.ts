import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { generateQuizQuestions } from "@/lib/llm";
import {
  buildQuizSessionResponse,
  getActiveQuizSessionForStudent,
  getNepalDayBounds,
  getQuizModeSettings,
  getQuizQuestionDocsForSession,
  getQuizSubscriptionSnapshot,
} from "@/lib/quiz";
import { connectToDatabase } from "@/lib/mongodb";
import { getPlatformConfig } from "@/models/PlatformConfig";
import QuizQuestion from "@/models/QuizQuestion";
import QuizSession from "@/models/QuizSession";
import QuizTopic from "@/models/QuizTopic";
import type { QuizType } from "@/types/quiz";

type StartQuizPayload = {
  quizType?: QuizType;
  topicId?: string;
};

function isQuizType(value: unknown): value is QuizType {
  return value === "FREE" || value === "PREMIUM";
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can start quizzes." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as StartQuizPayload;

    if (!isQuizType(body.quizType)) {
      return NextResponse.json(
        { error: "A valid quiz type is required." },
        { status: 400 },
      );
    }

    if (!body.topicId || !Types.ObjectId.isValid(body.topicId)) {
      return NextResponse.json(
        { error: "A valid quiz topic is required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const [config, subscription, topic] = await Promise.all([
      getPlatformConfig(),
      getQuizSubscriptionSnapshot(session.user.id),
      QuizTopic.findOne({ _id: body.topicId, isActive: true }).lean(),
    ]);

    if (!topic) {
      return NextResponse.json(
        { error: "That quiz topic is unavailable right now." },
        { status: 404 },
      );
    }

    const activeSession = await getActiveQuizSessionForStudent(session.user.id);
    if (activeSession) {
      const activeQuestions = await getQuizQuestionDocsForSession(activeSession);
      return NextResponse.json({
        sessionId: activeSession._id.toString(),
        reusedExistingSession: true,
        session: buildQuizSessionResponse(activeSession, activeQuestions),
      });
    }

    if (body.quizType === "PREMIUM" && !subscription.isPremiumEligible) {
      return NextResponse.json(
        { error: "An active paid plan is required for premium quizzes." },
        { status: 403 },
      );
    }

    const modeSettings = getQuizModeSettings(
      config,
      body.quizType,
      subscription.planSlug,
    );
    const { start, end } = getNepalDayBounds();
    const usedToday = await QuizSession.countDocuments({
      studentId: session.user.id,
      quizType: body.quizType,
      startedAt: { $gte: start, $lt: end },
    });

    if (usedToday >= modeSettings.dailyLimit) {
      return NextResponse.json(
        {
          error:
            body.quizType === "FREE"
              ? "You've used today's free quiz quota."
              : "You've used today's premium quiz quota.",
        },
        { status: 403 },
      );
    }

    const repeatCutoff = new Date(
      Date.now() - config.quizRepeatResetDays * 24 * 60 * 60 * 1000,
    );
    const recentSessions = await QuizSession.find({
      studentId: session.user.id,
      startedAt: { $gte: repeatCutoff },
    })
      .select("questionsAsked")
      .lean();

    const seenQuestionIds = new Set<string>();
    for (const recentSession of recentSessions) {
      for (const questionId of recentSession.questionsAsked ?? []) {
        seenQuestionIds.add(questionId.toString());
      }
    }

    const availableQuestions = shuffleArray(
      await QuizQuestion.find({
        topicId: topic._id,
        _id: {
          $nin: [...seenQuestionIds].map((questionId) => new Types.ObjectId(questionId)),
        },
      }).lean(),
    ).slice(0, config.quizQuestionCount);

    let selectedQuestions = [...availableQuestions];
    const neededCount = config.quizQuestionCount - selectedQuestions.length;

    if (neededCount > 0) {
      const generatedBank: Array<{
        _id: unknown;
        questionText: string;
        options: string[];
        explanation?: string | null;
        correctOptionIndex: number;
      }> = [];
      let remaining = neededCount;

      for (let attempt = 0; attempt < 2 && remaining > 0; attempt += 1) {
        const generated = await generateQuizQuestions({
          subject: topic.subject,
          topic: topic.topic,
          level: topic.level,
          field: topic.field ?? null,
          count: remaining,
        });

        if (generated.length === 0) {
          continue;
        }

        const existingQuestionTexts = new Set(
          selectedQuestions.map((question) => question.questionText.trim().toLowerCase()),
        );

        const cleaned = generated.filter((question) => {
          const signature = question.questionText.trim().toLowerCase();
          if (existingQuestionTexts.has(signature)) {
            return false;
          }

          existingQuestionTexts.add(signature);
          return true;
        });

        if (cleaned.length === 0) {
          continue;
        }

        const inserted = await QuizQuestion.insertMany(
          cleaned.map((question) => ({
            topicId: topic._id,
            questionText: question.questionText,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
            explanation: question.explanation ?? null,
          })),
        );

        generatedBank.push(...inserted);
        remaining = neededCount - generatedBank.length;
      }

      selectedQuestions = [...selectedQuestions, ...generatedBank];
    }

    if (selectedQuestions.length < config.quizQuestionCount) {
      return NextResponse.json(
        {
          error:
            "Quiz generation did not produce enough questions. Please seed more questions or check AI provider availability.",
        },
        { status: 503 },
      );
    }

    selectedQuestions = shuffleArray(selectedQuestions).slice(0, config.quizQuestionCount);

    const startedAt = new Date();
    const timerDeadline = new Date(
      startedAt.getTime() + config.quizTimeLimitSeconds * 1000,
    );

    const createdSession = await QuizSession.create({
      studentId: session.user.id,
      quizType: body.quizType,
      topicId: topic._id,
      subject: topic.subject,
      topic: topic.topic,
      level: topic.level,
      questionsAsked: selectedQuestions.map((question) => question._id),
      answers: selectedQuestions.map((question) => ({
        questionId: question._id,
        selectedOptionIndex: null,
        isCorrect: false,
      })),
      timerDeadline,
      startedAt,
      configSnapshot: {
        questionCount: config.quizQuestionCount,
        timeLimitSeconds: config.quizTimeLimitSeconds,
        repeatResetDays: config.quizRepeatResetDays,
        dailySessionLimit: modeSettings.dailyLimit,
        passPercent: modeSettings.passPercent,
        pointReward: modeSettings.pointReward,
        violationWarningLimit: config.quizViolationWarningLimit,
      },
    });

    return NextResponse.json({
      sessionId: createdSession._id.toString(),
      reusedExistingSession: false,
      session: buildQuizSessionResponse(
        createdSession.toObject(),
        selectedQuestions.map((question) => ({
          _id: question._id,
          questionText: question.questionText,
          options: question.options,
          explanation: question.explanation,
          correctOptionIndex: question.correctOptionIndex,
        })),
      ),
    });
  } catch (error) {
    console.error("[POST /api/quiz/start]", error);
    return NextResponse.json(
      { error: "Failed to start quiz." },
      { status: 500 },
    );
  }
}
