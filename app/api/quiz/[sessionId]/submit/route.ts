import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import {
  buildQuizSessionResponse,
  finalizeQuizSession,
  getQuizQuestionDocsForSession,
  getSyncedQuizSession,
} from "@/lib/quiz";

type SubmitPayload = {
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
    const authUser = await getAuthenticatedUser(request);

    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can submit quizzes." },
        { status: 403 },
      );
    }

    const { sessionId } = await params;
    const body = (await request.json().catch(() => ({}))) as SubmitPayload;
    const answers = (body.answers ?? []).filter((answer) => {
      return answer?.questionId && isValidSelectedOptionIndex(answer.selectedOptionIndex);
    }) as Array<{ questionId: string; selectedOptionIndex: number | null }>;

    let currentSession = await getSyncedQuizSession(sessionId, authUser.id);
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
      studentId: authUser.id,
      submitReason: "MANUAL",
      answers,
    });

    if (!finalizedSession) {
      return NextResponse.json(
        { error: "Failed to submit quiz." },
        { status: 500 },
      );
    }

    currentSession = await getSyncedQuizSession(sessionId, authUser.id);
    if (!currentSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    const questions = await getQuizQuestionDocsForSession(currentSession);

    return NextResponse.json({
      session: buildQuizSessionResponse(currentSession, questions),
    });
  } catch (error) {
    console.error("[POST /api/quiz/[sessionId]/submit]", error);
    return NextResponse.json(
      { error: "Failed to submit quiz." },
      { status: 500 },
    );
  }
}
