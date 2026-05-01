import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);
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
    console.error("GET Admin Transactions Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
