import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import {
  AdminSeedSession,
  QuizSeedHttpError,
  seedSingleQuizTopic,
} from "@/lib/quiz-admin-seed";
import { connectToDatabase } from "@/lib/mongodb";

type SeedPayload = {
  count?: number;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as SeedPayload;

    await connectToDatabase();

    const result = await seedSingleQuizTopic({
      session: session as AdminSeedSession,
      topicId: id,
      count: body.count,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/admin/quiz-topics/[id]/seed]", error);

    if (error instanceof QuizSeedHttpError) {
      return NextResponse.json(error.payload, { status: error.status });
    }

    return NextResponse.json(
      { error: "Failed to seed quiz questions." },
      { status: 500 },
    );
  }
}
