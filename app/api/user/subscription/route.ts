import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import { resolveStudentSubscriptionState } from "@/lib/subscription-state";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const pendingTx = await Transaction.findOne({
      userId: session.user.id,
      type: "SUBSCRIPTION_MANUAL",
      status: "PENDING",
    }).sort({ createdAt: -1 });

    const user = await User.findById(session.user.id).select(
      "planSlug questionsAsked subscriptionEnd bonusQuestions referralCode",
    );
    const subscription = await getQuizSubscriptionSnapshot(session.user.id);
    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    const resolvedSubscription = resolveStudentSubscriptionState({
      userPlanSlug: user?.planSlug,
      userSubscriptionEnd: user?.subscriptionEnd ?? null,
      snapshotPlanSlug: subscription.planSlug,
      snapshotStatus: subscription.subscriptionStatus,
      snapshotEnd: subscription.subscriptionEnd,
    });
    
    const currentPlan =
      plans.find((p) => p.slug === resolvedSubscription.planSlug) || plans[0];
    const baseMaxQuestions = currentPlan?.maxQuestions ?? 0;
    const bonusQuestions = user?.bonusQuestions ?? 0;
    const maxQuestions = baseMaxQuestions > 0 ? baseMaxQuestions + bonusQuestions : baseMaxQuestions;
    const questionsAsked = user?.questionsAsked ?? 0;
    const questionsRemaining = maxQuestions > 0 ? Math.max(0, maxQuestions - questionsAsked) : null;

    return NextResponse.json({
      subscriptionStatus: resolvedSubscription.subscriptionStatus,
      subscriptionEnd: resolvedSubscription.subscriptionEnd,
      pendingManualPayment: !!pendingTx,
      questionsAsked,
      questionsRemaining,
      maxQuestions,
      baseMaxQuestions,
      bonusQuestions,
      planSlug: resolvedSubscription.planSlug,
      referralCode: user?.referralCode || null,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Subscription metrics fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
