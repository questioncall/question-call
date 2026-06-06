import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Question from "@/models/Question";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/questions?q=&username=
 * Mobile mirror of the web `getQuestionsAction` (title search + username filter).
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const username = (searchParams.get("username") || "").trim();

    const filter: Record<string, unknown> = {};
    if (q) filter.title = { $regex: q, $options: "i" };

    if (username) {
      const users = await User.find({
        username: { $regex: username, $options: "i" },
      }).select("_id");
      if (users.length > 0) {
        filter.askerId = { $in: users.map((u) => u._id) };
      } else {
        return NextResponse.json([]);
      }
    }

    const questions = await Question.find(filter)
      .populate("askerId", "name username image")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json(questions);
  } catch (error) {
    console.error("GET /api/mobile/admin/questions error:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
