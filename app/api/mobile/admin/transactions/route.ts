import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/transactions?limit&skip
 *
 * Mobile mirror of `GET /api/admin/transactions` — paginated, newest first,
 * with the buyer populated.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "30", 10), 1),
      100,
    );
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const [transactions, total] = await Promise.all([
      Transaction.find()
        .populate({ path: "userId", select: "name email role", model: User })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(),
    ]);

    return NextResponse.json({ transactions, total });
  } catch (error) {
    console.error("GET /api/mobile/admin/transactions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
