import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // optional filter: PENDING, COMPLETED, REJECTED
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10), 0);

    const filter = status ? { status } : {};

    const [requests, total] = await Promise.all([
      WithdrawalRequest.find(filter)
        .populate("teacherId", "name email username userImage role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WithdrawalRequest.countDocuments(filter),
    ]);

    return NextResponse.json({ requests, total });
  } catch (error) {
    console.error("[GET /api/admin/withdrawals]", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawal requests" },
      { status: 500 }
    );
  }
}

