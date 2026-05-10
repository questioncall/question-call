import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { getQuizHistorySummary } from "@/lib/quiz";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "STUDENT") {
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

    const summary = await getQuizHistorySummary(authUser.id, page, limit);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[GET /api/quiz/history]", error);
    return NextResponse.json(
      { error: "Failed to load quiz history." },
      { status: 500 },
    );
  }
}
