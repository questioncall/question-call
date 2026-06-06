import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/users
 *
 * Mobile mirror of `GET /api/admin/users` (students + teachers, newest first).
 * Bearer-token admin auth via requireMobileAdmin.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const users = await User.find({ role: { $in: ["STUDENT", "TEACHER"] } })
      .select(
        "name email username role points pointBalance totalAnswered subscriptionStatus isSuspended createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/mobile/admin/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
