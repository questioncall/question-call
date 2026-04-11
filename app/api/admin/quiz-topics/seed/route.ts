import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  AdminSeedSession,
  QuizSeedHttpError,
  seedSmartQuizData,
  seedStarterQuizData,
} from "@/lib/quiz-admin-seed";
import { connectToDatabase } from "@/lib/mongodb";

type SeedPayload = {
  mode?: "STARTER" | "SMART";
  prompt?: string;
  count?: number;
  maxTopics?: number;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as SeedPayload;

    await connectToDatabase();

    const adminSession = session as AdminSeedSession;
    const result =
      body.mode === "SMART" || body.prompt?.trim()
        ? await seedSmartQuizData(adminSession, body)
        : await seedStarterQuizData(adminSession);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/quiz-topics/seed]", error);

    if (error instanceof QuizSeedHttpError) {
      return NextResponse.json(error.payload, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to seed quiz data." },
      { status: 500 },
    );
  }
}
