import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pointsToNpr, roundPoints } from "@/lib/points";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import User from "@/models/User";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      (session.user.role !== "STUDENT" && session.user.role !== "TEACHER")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select(
      [
        "role",
        "points",
        "pointBalance",
        "totalAnswered",
        "isMonetized",
        "overallRatingSum",
        "overallRatingCount",
        "overallScore",
        "subscriptionStatus",
        "subscriptionEnd",
        "esewaNumber",
        "planSlug",
        "questionsAsked",
        "bonusQuestions",
        "referralCode",
      ].join(" ")
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const config = await getPlatformConfig();
    const subscription =
      session.user.role === "STUDENT"
        ? await getQuizSubscriptionSnapshot(session.user.id)
        : null;

    const withdrawalHistory = await WithdrawalRequest.find({
      teacherId: session.user.id,
    }).sort({ createdAt: -1 });

    const pointBalance =
      session.user.role === "TEACHER"
        ? user.pointBalance ?? 0
        : user.points ?? 0;

    const overallScore =
      (user.overallRatingCount ?? 0) > 0
        ? ((user.overallRatingSum ?? 0) / (user.overallRatingCount ?? 0)).toFixed(1)
        : user.overallScore?.toFixed(1) ?? "0.0";

    let questionsAsked = 0;
    let questionsRemaining: number | null = null;
    let maxQuestions = 0;
    let baseMaxQuestions = 0;
    let bonusQuestions = 0;

    if (session.user.role === "STUDENT") {
      questionsAsked = user.questionsAsked ?? 0;
      bonusQuestions = user.bonusQuestions ?? 0;
      const plans = getHydratedPlans(config);
      const currentPlan = plans.find(p => p.slug === user.planSlug) || plans[0];
      baseMaxQuestions = currentPlan?.maxQuestions ?? 0;
      maxQuestions = baseMaxQuestions > 0 ? baseMaxQuestions + bonusQuestions : baseMaxQuestions;
      questionsRemaining = maxQuestions > 0 ? Math.max(0, maxQuestions - questionsAsked) : null;
    }

    return NextResponse.json({
      role: session.user.role,
      pointBalance: roundPoints(pointBalance),
      nprEquivalent: pointsToNpr(pointBalance, config),
      totalAnswered: user.totalAnswered ?? 0,
      isMonetized: user.isMonetized ?? false,
      overallScore,
      pointToNprRate: config.pointToNprRate,
      minWithdrawalPoints: config.minWithdrawalPoints,
      qualificationThreshold: config.qualificationThreshold,
      subscriptionStatus:
        session.user.role === "STUDENT"
          ? subscription?.subscriptionStatus ?? null
          : user.subscriptionStatus ?? null,
      subscriptionEnd:
        session.user.role === "STUDENT"
          ? subscription?.subscriptionEnd ?? null
          : user.subscriptionEnd ?? null,
      questionsAsked,
      questionsRemaining,
      maxQuestions,
      baseMaxQuestions,
      bonusQuestions,
      referralCode: user.referralCode || null,
      withdrawalHistory,
      savedEsewaNumber: user.esewaNumber || null,
    });
  } catch (error) {
    console.error("[GET /api/wallet]", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
