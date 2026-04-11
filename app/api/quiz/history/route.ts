import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getQuizHistorySummary } from "@/lib/quiz";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can access quiz history." },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      20,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "10", 10) || 10),
    );

    const summary = await getQuizHistorySummary(session.user.id, page, limit);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/quiz/history]", error);
    return NextResponse.json(
      { error: "Failed to load quiz history." },
      { status: 500 },
    );
  }
}
