import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import {
  buildQuizSessionResponse,
  getQuizQuestionDocsForSession,
  getSyncedQuizSession,
} from "@/lib/quiz";

export async function GET(
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
        { error: "Only students can access quiz sessions." },
        { status: 403 },
      );
    }

    const { sessionId } = await params;
    const quizSession = await getSyncedQuizSession(sessionId, authUser.id);

    if (!quizSession) {
      return NextResponse.json({ error: "Quiz session not found." }, { status: 404 });
    }

    const questions = await getQuizQuestionDocsForSession(quizSession);

    return NextResponse.json({
      session: buildQuizSessionResponse(quizSession, questions),
    });
  } catch (error) {
    console.error("[GET /api/quiz/[sessionId]]", error);
    return NextResponse.json(
      { error: "Failed to load quiz session." },
      { status: 500 },
    );
  }
}
