import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  buildQuizSessionResponse,
  finalizeQuizSession,
  getQuizQuestionDocsForSession,
  getSyncedQuizSession,
} from "@/lib/quiz";
import { connectToDatabase } from "@/lib/mongodb";
import QuizSession from "@/models/QuizSession";
import type { QuizViolationType } from "@/types/quiz";

type SessionQuestionId = {
  toString(): string;
};

type SessionAnswerEntry = {
  questionId: SessionQuestionId;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
};

type ProgressPayload = {
  answers?: Array<{
    questionId?: string;
    selectedOptionIndex?: number | null;
  }>;
  heartbeat?: boolean;
  violation?: {
    type?: QuizViolationType;
    details?: string;
  };
};

const allowedViolationTypes = new Set<QuizViolationType>([
  "FULLSCREEN_EXIT",
  "TAB_HIDDEN",
  "WINDOW_BLUR",
  "PAGE_HIDE",
  "BEFORE_UNLOAD",
  "BACK_NAVIGATION",
  "DUPLICATE_TAB",
]);

function isValidSelectedOptionIndex(value: unknown) {
  return value === null || value === 0 || value === 1 || value === 2 || value === 3;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can update quiz progress." },
        { status: 403 },
      );
    }

    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as ProgressPayload;

    let quizSession = await getSyncedQuizSession(sessionId, session.user.id);

    if (!quizSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (quizSession.status !== "IN_PROGRESS") {
      const questions = await getQuizQuestionDocsForSession(quizSession);
      return NextResponse.json({
        submitted: true,
        session: buildQuizSessionResponse(quizSession, questions),
      });
    }

    await connectToDatabase();

    const editableSession = await QuizSession.findOne({
      _id: sessionId,
      studentId: session.user.id,
      status: "IN_PROGRESS",
    });

    if (!editableSession) {
      quizSession = await getSyncedQuizSession(sessionId, session.user.id);
      if (!quizSession) {
        return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
      }

      const questions = await getQuizQuestionDocsForSession(quizSession);
      return NextResponse.json({
        submitted: quizSession.status !== "IN_PROGRESS",
        session: buildQuizSessionResponse(quizSession, questions),
      });
    }

    const validQuestionIds = new Set(
      editableSession.questionsAsked.map((questionId: SessionQuestionId) =>
        questionId.toString(),
      ),
    );
    const answerMap = new Map<string, SessionAnswerEntry>(
      editableSession.answers.map((answer: SessionAnswerEntry) => [
        answer.questionId.toString(),
        {
          questionId: answer.questionId,
          selectedOptionIndex:
            answer.selectedOptionIndex === undefined ? null : answer.selectedOptionIndex,
          isCorrect: answer.isCorrect ?? false,
        },
      ]),
    );

    for (const answer of body.answers ?? []) {
      if (!answer?.questionId || !validQuestionIds.has(answer.questionId)) {
        continue;
      }

      if (!isValidSelectedOptionIndex(answer.selectedOptionIndex)) {
        return NextResponse.json(
          { error: "Answer selections must be null or between 0 and 3." },
          { status: 400 },
        );
      }

      const current = answerMap.get(answer.questionId);
      if (!current) {
        continue;
      }

      current.selectedOptionIndex = answer.selectedOptionIndex ?? null;
      current.isCorrect = false;
      answerMap.set(answer.questionId, current);
    }

    editableSession.answers = editableSession.questionsAsked.map((questionId: SessionQuestionId) => {
      const normalizedQuestionId = questionId;
      const current = answerMap.get(questionId.toString());
      return {
        questionId: normalizedQuestionId,
        selectedOptionIndex: current?.selectedOptionIndex ?? null,
        isCorrect: false,
      };
    });

    editableSession.lastHeartbeatAt = new Date();

    if (body.violation?.type) {
      if (!allowedViolationTypes.has(body.violation.type)) {
        return NextResponse.json(
          { error: "Invalid quiz violation type." },
          { status: 400 },
        );
      }

      editableSession.violationEvents.push({
        type: body.violation.type,
        details: body.violation.details?.trim() || null,
        occurredAt: new Date(),
      });
      editableSession.violationCount += 1;
    }

    await editableSession.save();

    if (
      body.violation?.type &&
      editableSession.violationCount >
        editableSession.configSnapshot.violationWarningLimit
    ) {
      const finalizedSession = await finalizeQuizSession({
        sessionId,
        studentId: session.user.id,
        submitReason: "ANTI_CHEAT",
      });

      if (!finalizedSession) {
        return NextResponse.json(
          { error: "Failed to auto-submit quiz." },
          { status: 500 },
        );
      }

      const questions = await getQuizQuestionDocsForSession(finalizedSession);
      return NextResponse.json({
        submitted: true,
        autoSubmitReason: "ANTI_CHEAT",
        session: buildQuizSessionResponse(finalizedSession, questions),
      });
    }

    quizSession = await getSyncedQuizSession(sessionId, session.user.id);
    if (!quizSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    const questions = await getQuizQuestionDocsForSession(quizSession);

    return NextResponse.json({
      submitted: false,
      session: buildQuizSessionResponse(quizSession, questions),
    });
  } catch (error) {
    console.error("[PATCH /api/quiz/[sessionId]/progress]", error);
    return NextResponse.json(
      { error: "Failed to save quiz progress." },
      { status: 500 },
    );
  }
}
