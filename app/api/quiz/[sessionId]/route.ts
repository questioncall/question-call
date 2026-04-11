import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  buildQuizSessionResponse,
  getQuizQuestionDocsForSession,
  getSyncedQuizSession,
} from "@/lib/quiz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can access quiz sessions." },
        { status: 403 },
      );
    }

    const { sessionId } = await params;
    const quizSession = await getSyncedQuizSession(sessionId, session.user.id);

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
