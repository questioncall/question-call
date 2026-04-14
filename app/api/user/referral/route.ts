import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import Referral from "@/models/Referral";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select("referralCode bonusQuestions");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const referrals = await Referral.find({ referrerId: session.user.id, status: "COMPLETED" })
      .populate("refereeId", "name email createdAt")
      .sort({ createdAt: -1 });

    const totalReferred = referrals.length;
    const totalBonusEarned = referrals.reduce((sum, curr) => sum + curr.bonusAwarded, 0);

    const formattedReferrals = referrals.map(r => ({
      _id: r._id,
      refereeName: r.refereeId ? (r.refereeId as any).name : "Unknown",
      bonus: r.bonusAwarded,
      date: r.createdAt.toISOString(),
      status: r.status,
    }));

    return NextResponse.json({
      referralCode: user.referralCode || null,
      bonusQuestions: user.bonusQuestions || 0,
      totalReferred,
      totalBonusEarned,
      referrals: formattedReferrals,
    });
  } catch (error) {
    console.error("[GET /api/user/referral]", error);
    return NextResponse.json(
      { error: "Failed to fetch referral stats" },
      { status: 500 },
    );
  }
}
