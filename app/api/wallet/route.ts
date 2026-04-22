import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pointsToNpr, roundPoints } from "@/lib/points";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import Transaction from "@/models/Transaction";
import User from "@/models/User";
import WalletHistoryEvent from "@/models/WalletHistoryEvent";
import WithdrawalRequest from "@/models/WithdrawalRequest";

export const dynamic = "force-dynamic";

type WalletEarningHistoryItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  pointsDelta: number;
  nprAmount: number | null;
  occurredAt: string;
};

type WalletHistoryEventRow = {
  _id: { toString(): string };
  type: string;
  title: string;
  description?: string | null;
  pointsDelta: number;
  occurredAt: Date;
};

type CourseSaleCreditMetadata = {
  courseName?: string;
  netAmount?: number;
  pricingModel?: string;
};

type CourseSaleCreditRow = {
  _id: { toString(): string };
  amount: number;
  createdAt: Date;
  metadata?: CourseSaleCreditMetadata | null;
};

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
      "name role points pointBalance totalAnswered isMonetized overallRatingSum overallRatingCount overallScore subscriptionStatus subscriptionEnd esewaNumber planSlug questionsAsked bonusQuestions referralCode totalPointsEarned totalPointsWithdrawn totalPenaltyPoints"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fallback: if referralCode is missing/null, generate one and save
    let userReferralCode = user.referralCode;
    if (!userReferralCode) {
      userReferralCode = `REF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      user.referralCode = userReferralCode;
      await user.save();
    }

    const config = await getPlatformConfig();
    const subscription =
      session.user.role === "STUDENT"
        ? await getQuizSubscriptionSnapshot(session.user.id)
        : null;
    const historyLimit = 50;

    const withdrawalHistory = await WithdrawalRequest.find({
      teacherId: session.user.id,
    }).sort({ createdAt: -1 });

    const pointBalance =
      session.user.role === "TEACHER"
        ? user.pointBalance ?? 0
        : user.points ?? 0;

    const withdrawnFromHistory = withdrawalHistory
      .filter(w => w.status === "COMPLETED")
      .reduce((sum, w) => sum + w.pointsRequested, 0);

    const pendingWithdrawal = withdrawalHistory
      .filter(w => w.status === "PENDING")
      .reduce((sum, w) => sum + w.pointsRequested, 0);

    const totalPointsWithdrawn = roundPoints(
      Math.max(user.totalPointsWithdrawn ?? 0, withdrawnFromHistory),
    );
    const totalPenaltyPoints = roundPoints(user.totalPenaltyPoints ?? 0);
    const derivedTotalPointsEarned = roundPoints(
      pointBalance + totalPointsWithdrawn + pendingWithdrawal + totalPenaltyPoints,
    );
    const totalPointsEarned = roundPoints(
      Math.max(user.totalPointsEarned ?? 0, derivedTotalPointsEarned),
    );

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

    let earningHistory: WalletEarningHistoryItem[] = [];

    if (session.user.role === "TEACHER") {
      const [walletHistoryEvents, courseSaleCredits] = await Promise.all([
        WalletHistoryEvent.find({ userId: session.user.id })
          .select("_id type title description pointsDelta occurredAt")
          .sort({ occurredAt: -1 })
          .limit(historyLimit)
          .lean(),
        Transaction.find({
          userId: session.user.id,
          type: "COURSE_SALE_CREDIT",
          status: "COMPLETED",
        })
          .select("_id amount createdAt metadata")
          .sort({ createdAt: -1 })
          .limit(historyLimit)
          .lean(),
      ]);

      const walletEventHistory = (walletHistoryEvents as WalletHistoryEventRow[]).map(
        (event) => ({
          id: event._id.toString(),
          type: event.type,
          title: event.title,
          description: event.description ?? null,
          pointsDelta: roundPoints(event.pointsDelta),
          nprAmount: null,
          occurredAt: new Date(event.occurredAt).toISOString(),
        }),
      );

      const courseSaleHistory = (courseSaleCredits as CourseSaleCreditRow[]).map(
        (transaction) => {
          const metadata = transaction.metadata ?? null;
          const courseName = metadata?.courseName?.trim();
          const pricingModel = metadata?.pricingModel?.trim();

          return {
            id: transaction._id.toString(),
            type: "COURSE_SALE_CREDIT",
            title: "Course sale credit",
            description: courseName
              ? pricingModel
                ? `${courseName} (${pricingModel})`
                : courseName
              : "Teacher payout from a course sale.",
            pointsDelta: roundPoints(transaction.amount),
            nprAmount: roundPoints(metadata?.netAmount ?? transaction.amount),
            occurredAt: new Date(transaction.createdAt).toISOString(),
          };
        },
      );

      earningHistory = [...walletEventHistory, ...courseSaleHistory]
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
        .slice(0, historyLimit);
    }

    return NextResponse.json({
      role: session.user.role,
      userName: user.name,
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
      referralCode: userReferralCode || null,
      withdrawalHistory,
      savedEsewaNumber: user.esewaNumber || null,
      totalPointsEarned,
      totalPointsWithdrawn,
      pendingWithdrawal: roundPoints(pendingWithdrawal),
      totalPenaltyPoints,
      creditablePoints: roundPoints(pointBalance),
      earningHistory,
    });
  } catch (error) {
    console.error("[GET /api/wallet]", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
