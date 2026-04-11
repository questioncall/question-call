import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  buildQuizSessionResponse,
  finalizeQuizSession,
  getQuizQuestionDocsForSession,
  getSyncedQuizSession,
} from "@/lib/quiz";
import type { QuizSubmitReason } from "@/types/quiz";

type AutoSubmitPayload = {
  reason?: QuizSubmitReason;
  answers?: Array<{
    questionId?: string;
    selectedOptionIndex?: number | null;
  }>;
};

function isValidSelectedOptionIndex(value: unknown) {
  return value === null || value === 0 || value === 1 || value === 2 || value === 3;
}

export async function POST(
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
        { error: "Only students can submit quizzes." },
        { status: 403 },
      );
    }

    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as AutoSubmitPayload;
    const submitReason: QuizSubmitReason =
      body.reason === "ANTI_CHEAT" ? "ANTI_CHEAT" : "TIME_EXPIRED";
    const answers = (body.answers ?? []).filter((answer) => {
      return answer?.questionId && isValidSelectedOptionIndex(answer.selectedOptionIndex);
    }) as Array<{ questionId: string; selectedOptionIndex: number | null }>;

    let currentSession = await getSyncedQuizSession(sessionId, session.user.id);
    if (!currentSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    if (currentSession.status !== "IN_PROGRESS") {
      const questions = await getQuizQuestionDocsForSession(currentSession);
      return NextResponse.json({
        session: buildQuizSessionResponse(currentSession, questions),
      });
    }

    const finalizedSession = await finalizeQuizSession({
      sessionId,
      studentId: session.user.id,
      submitReason,
      answers,
    });

    if (!finalizedSession) {
      return NextResponse.json(
        { error: "Failed to auto-submit quiz." },
        { status: 500 },
      );
    }

    currentSession = await getSyncedQuizSession(sessionId, session.user.id);
    if (!currentSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    const questions = await getQuizQuestionDocsForSession(currentSession);

    return NextResponse.json({
      session: buildQuizSessionResponse(currentSession, questions),
    });
  } catch (error) {
    console.error("[POST /api/quiz/[sessionId]/auto-submit]", error);
    return NextResponse.json(
      { error: "Failed to auto-submit quiz." },
      { status: 500 },
    );
  }
}
