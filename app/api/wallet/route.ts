import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { pointsToNpr, roundPoints } from "@/lib/points";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { resolveStudentSubscriptionState } from "@/lib/subscription-state";
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

type QuestionPayoutHistoryItem = {
  id: string;
  type: string;
  questionTitle: string | null;
  rating: number | null;
  ratingPoints: number;
  bonusPoints: number;
  commissionPercent: number;
  commissionPoints: number;
  penaltyPoints: number;
  finalPoints: number;
  occurredAt: string;
};

type WalletHistoryMetadata = {
  questionTitle?: string | null;
  rating?: number;
  ratingPoints?: number;
  bonusPoints?: number;
  commissionPercent?: number;
  commissionPoints?: number;
  finalPoints?: number;
  penaltyPoints?: number;
};

type WalletHistoryEventRow = {
  _id: { toString(): string };
  type: string;
  title: string;
  description?: string | null;
  pointsDelta: number;
  occurredAt: Date;
  metadata?: WalletHistoryMetadata | null;
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

const QUESTION_PAYOUT_EVENT_TYPES = new Set([
  "ANSWER_REWARD",
  "AUTO_CLOSE_REWARD",
  "LOW_RATING_PENALTY",
  "TIMEOUT_PENALTY",
]);

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id || (user.role !== "STUDENT" && user.role !== "TEACHER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const dbUser = await User.findById(user.id).select(
      "name role points pointBalance totalAnswered isMonetized overallRatingSum overallRatingCount overallScore subscriptionStatus subscriptionEnd esewaNumber planSlug questionsAsked bonusQuestions referralCode totalPointsEarned totalPointsWithdrawn totalPenaltyPoints",
    );

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fallback: if referralCode is missing/null, generate one and save
    let userReferralCode = dbUser.referralCode;
    if (!userReferralCode) {
      userReferralCode = `REF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      dbUser.referralCode = userReferralCode;
      await dbUser.save();
    }

    const config = await getPlatformConfig();
    const subscription =
      user.role === "STUDENT"
        ? await getQuizSubscriptionSnapshot(user.id)
        : null;

    const { searchParams } = new URL(req.url);
    const historyLimit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "10", 10), 1),
      100,
    );
    const historySkip = Math.max(
      parseInt(searchParams.get("skip") || "0", 10),
      0,
    );

    const withdrawalFilter = { teacherId: user.id };
    const [withdrawalHistory, withdrawalTotal, allWithdrawals] =
      await Promise.all([
        WithdrawalRequest.find(withdrawalFilter)
          .sort({ createdAt: -1 })
          .skip(historySkip)
          .limit(historyLimit),
        WithdrawalRequest.countDocuments(withdrawalFilter),
        // We still need ALL withdrawals for balance calculation
        WithdrawalRequest.find(withdrawalFilter)
          .select("status pointsRequested")
          .lean(),
      ]);

    const pointBalance =
      user.role === "TEACHER"
        ? (dbUser.pointBalance ?? 0)
        : (dbUser.points ?? 0);

    const withdrawnFromHistory = allWithdrawals
      .filter((w) => w.status === "COMPLETED")
      .reduce(
        (sum: number, w: { pointsRequested: number }) =>
          sum + w.pointsRequested,
        0,
      );

    const pendingWithdrawal = allWithdrawals
      .filter((w) => w.status === "PENDING")
      .reduce(
        (sum: number, w: { pointsRequested: number }) =>
          sum + w.pointsRequested,
        0,
      );

    const totalPointsWithdrawn = roundPoints(
      Math.max(dbUser.totalPointsWithdrawn ?? 0, withdrawnFromHistory),
    );
    const totalPenaltyPoints = roundPoints(dbUser.totalPenaltyPoints ?? 0);
    const derivedTotalPointsEarned = roundPoints(
      pointBalance +
        totalPointsWithdrawn +
        pendingWithdrawal +
        totalPenaltyPoints,
    );
    const totalPointsEarned = roundPoints(
      Math.max(dbUser.totalPointsEarned ?? 0, derivedTotalPointsEarned),
    );

    const overallScore =
      (dbUser.overallRatingCount ?? 0) > 0
        ? (
            (dbUser.overallRatingSum ?? 0) / (dbUser.overallRatingCount ?? 0)
          ).toFixed(1)
        : (dbUser.overallScore?.toFixed(1) ?? "0.0");

    let questionsAsked = 0;
    let questionsRemaining: number | null = null;
    let maxQuestions = 0;
    let baseMaxQuestions = 0;
    let bonusQuestions = 0;
    let studentSubscriptionStatus: string | null = null;
    let studentSubscriptionEnd: string | null = null;

    if (user.role === "STUDENT") {
      questionsAsked = dbUser.questionsAsked ?? 0;
      bonusQuestions = dbUser.bonusQuestions ?? 0;
      const plans = getHydratedPlans(config);
      const resolvedSubscription = resolveStudentSubscriptionState({
        userPlanSlug: dbUser.planSlug ?? null,
        userSubscriptionEnd: dbUser.subscriptionEnd ?? null,
        snapshotPlanSlug: subscription?.planSlug ?? null,
        snapshotStatus: subscription?.subscriptionStatus ?? null,
        snapshotEnd: subscription?.subscriptionEnd ?? null,
      });
      const currentPlan =
        plans.find((p) => p.slug === resolvedSubscription.planSlug) || plans[0];
      baseMaxQuestions = currentPlan?.maxQuestions ?? 0;
      maxQuestions =
        baseMaxQuestions > 0
          ? baseMaxQuestions + bonusQuestions
          : baseMaxQuestions;
      questionsRemaining =
        maxQuestions > 0 ? Math.max(0, maxQuestions - questionsAsked) : null;
      studentSubscriptionStatus = resolvedSubscription.subscriptionStatus;
      studentSubscriptionEnd = resolvedSubscription.subscriptionEnd;
    }

    let earningHistory: WalletEarningHistoryItem[] = [];
    let questionPayoutHistory: QuestionPayoutHistoryItem[] = [];
    let earningTotal = 0;
    let questionPayoutTotal = 0;

    if (user.role === "TEACHER") {
      const [walletHistoryEvents, courseSaleCredits] = await Promise.all([
        WalletHistoryEvent.find({ userId: user.id })
          .select("_id type title description pointsDelta occurredAt metadata")
          .sort({ occurredAt: -1 })
          .lean(),
        Transaction.find({
          userId: user.id,
          type: "COURSE_SALE_CREDIT",
          status: "COMPLETED",
        })
          .select("_id amount createdAt metadata")
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const walletEventRows = walletHistoryEvents as WalletHistoryEventRow[];
      const walletEventHistory = walletEventRows
        .filter((event) => !QUESTION_PAYOUT_EVENT_TYPES.has(event.type))
        .map((event) => ({
          id: event._id.toString(),
          type: event.type,
          title: event.title,
          description: event.description ?? null,
          pointsDelta: roundPoints(event.pointsDelta),
          nprAmount: null,
          occurredAt: new Date(event.occurredAt).toISOString(),
        }));

      questionPayoutHistory = walletEventRows
        .filter((event) => QUESTION_PAYOUT_EVENT_TYPES.has(event.type))
        .map((event) => {
          const metadata = event.metadata ?? null;
          const penaltyPoints = roundPoints(
            Math.max(
              0,
              metadata?.penaltyPoints ??
                (event.pointsDelta < 0 ? Math.abs(event.pointsDelta) : 0),
            ),
          );
          const finalPoints = roundPoints(
            metadata?.finalPoints ??
              (event.pointsDelta > 0 ? event.pointsDelta : -penaltyPoints),
          );

          return {
            id: event._id.toString(),
            type: event.type,
            questionTitle:
              metadata?.questionTitle?.trim() || event.description || null,
            rating:
              typeof metadata?.rating === "number" ? metadata.rating : null,
            ratingPoints: roundPoints(metadata?.ratingPoints ?? 0),
            bonusPoints: roundPoints(metadata?.bonusPoints ?? 0),
            commissionPercent: roundPoints(metadata?.commissionPercent ?? 0),
            commissionPoints: roundPoints(metadata?.commissionPoints ?? 0),
            penaltyPoints,
            finalPoints,
            occurredAt: new Date(event.occurredAt).toISOString(),
          };
        });

      const courseSaleHistory = (
        courseSaleCredits as CourseSaleCreditRow[]
      ).map((transaction) => {
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
      });

      const allEarnings = [...walletEventHistory, ...courseSaleHistory].sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      );

      const allPayouts = questionPayoutHistory.sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      );

      earningHistory = allEarnings.slice(
        historySkip,
        historySkip + historyLimit,
      );
      questionPayoutHistory = allPayouts.slice(
        historySkip,
        historySkip + historyLimit,
      );

      // Store totals for pagination
      earningTotal = allEarnings.length;
      questionPayoutTotal = allPayouts.length;
    }

    return NextResponse.json({
      role: user.role,
      userName: dbUser.name,
      pointBalance: roundPoints(pointBalance),
      nprEquivalent: pointsToNpr(pointBalance, config),
      totalAnswered: dbUser.totalAnswered ?? 0,
      isMonetized: dbUser.isMonetized ?? false,
      overallScore,
      pointToNprRate: config.pointToNprRate,
      minWithdrawalPoints: config.minWithdrawalPoints,
      qualificationThreshold: config.qualificationThreshold,
      subscriptionStatus:
        user.role === "STUDENT"
          ? studentSubscriptionStatus
          : (dbUser.subscriptionStatus ?? null),
      subscriptionEnd:
        user.role === "STUDENT"
          ? studentSubscriptionEnd
          : (dbUser.subscriptionEnd ?? null),
      questionsAsked,
      questionsRemaining,
      maxQuestions,
      baseMaxQuestions,
      bonusQuestions,
      referralCode: userReferralCode || null,
      withdrawalHistory,
      withdrawalTotal,
      savedEsewaNumber: dbUser.esewaNumber || null,
      totalPointsEarned,
      totalPointsWithdrawn,
      pendingWithdrawal: roundPoints(pendingWithdrawal),
      totalPenaltyPoints,
      creditablePoints: roundPoints(pointBalance),
      earningHistory,
      earningTotal,
      questionPayoutHistory,
      questionPayoutTotal,
    });
  } catch (error) {
    console.error("[GET /api/wallet]", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 },
    );
  }
}
