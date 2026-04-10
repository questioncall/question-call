import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";
import { getPlatformConfig } from "@/models/PlatformConfig";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const teacher = await User.findById(session.user.id).select(
      "pointBalance totalAnswered isMonetized overallRatingSum overallRatingCount overallScore"
    );

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const config = await getPlatformConfig();

    const withdrawalHistory = await WithdrawalRequest.find({
      teacherId: session.user.id,
    }).sort({ createdAt: -1 });

    const overallScore =
      teacher.overallRatingCount > 0
        ? (teacher.overallRatingSum / teacher.overallRatingCount).toFixed(1)
        : teacher.overallScore?.toFixed(1) ?? "0.0";

    return NextResponse.json({
      pointBalance: teacher.pointBalance ?? 0,
      nprEquivalent: (teacher.pointBalance ?? 0) * config.pointToNprRate,
      totalAnswered: teacher.totalAnswered ?? 0,
      isMonetized: teacher.isMonetized ?? false,
      overallScore,
      pointToNprRate: config.pointToNprRate,
      minWithdrawalPoints: config.minWithdrawalPoints,
      qualificationThreshold: config.qualificationThreshold,
      withdrawalHistory,
    });
  } catch (error) {
    console.error("[GET /api/wallet]", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
