import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const transactions = await Transaction.find()
      .populate({ path: "userId", select: "name email role", model: User })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET Admin Transactions Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
