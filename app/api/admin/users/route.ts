import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const users = await User.find({ role: { $in: ["STUDENT", "TEACHER"] } })
      .select("name email role points pointBalance totalAnswered subscriptionStatus isSuspended createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET Admin Users Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
