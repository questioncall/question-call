import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/withdrawals?status&limit&skip
 * Mobile mirror of `GET /api/admin/withdrawals`.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      100,
    );
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);
    const filter = status ? { status } : {};

    const [requests, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .populate("teacherId", "name email username userImage role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WithdrawalRequest.countDocuments(filter),
    ]);

    return NextResponse.json({ requests, total });
  } catch (error) {
    console.error("GET /api/mobile/admin/withdrawals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawal requests" },
      { status: 500 },
    );
  }
}
