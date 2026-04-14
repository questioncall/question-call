import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";
import mongoose from "mongoose";

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

    const user = await User.findById(session.user.id).select("planSlug questionsAsked subscriptionEnd trialUsed");
    const subscription = await getQuizSubscriptionSnapshot(session.user.id);
    const config = await getPlatformConfig();
    const plans = getHydratedPlans(config);
    
    const currentPlan = plans.find(p => p.slug === (user?.planSlug || subscription.planSlug || "free")) || plans[0];
    const maxQuestions = currentPlan?.maxQuestions ?? 0;
    const questionsAsked = user?.questionsAsked ?? 0;
    const questionsRemaining = maxQuestions > 0 ? Math.max(0, maxQuestions - questionsAsked) : null;

    return NextResponse.json({
      subscriptionStatus: subscription.subscriptionStatus,
      subscriptionEnd: subscription.subscriptionEnd,
      pendingManualPayment: !!pendingTx,
      questionsAsked,
      questionsRemaining,
      maxQuestions,
      planSlug: user?.planSlug || subscription.planSlug || "free",
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Subscription metrics fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
