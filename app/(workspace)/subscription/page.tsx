import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SubscriptionClient } from "./subscription-client";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SubscriptionPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "TEACHER") {
    redirect("/wallet");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/pricing");
  }

  await connectToDatabase();

  const pendingTx = await Transaction.findOne({
    userId: session.user.id,
    type: "SUBSCRIPTION_MANUAL",
    status: "PENDING",
  }).sort({ createdAt: -1 });

  const subscription = await getQuizSubscriptionSnapshot(session.user.id);
  const user = await User.findById(session.user.id).select("planSlug questionsAsked bonusQuestions referralCode");
  
  const config = await getPlatformConfig();
  const plans = getHydratedPlans(config);
  const currentPlan = plans.find(p => p.slug === (user?.planSlug || subscription.planSlug || "free")) || plans[0];
  const baseMaxQuestions = currentPlan?.maxQuestions ?? 0;
  const bonusQuestions = user?.bonusQuestions ?? 0;
  const maxQuestions = baseMaxQuestions > 0 ? baseMaxQuestions + bonusQuestions : baseMaxQuestions;
  const questionsAsked = user?.questionsAsked ?? 0;
  const questionsRemaining = maxQuestions > 0 ? Math.max(0, maxQuestions - questionsAsked) : null;

  const initialSubscriptionData = {
    subscriptionStatus: subscription.subscriptionStatus,
    subscriptionEnd: subscription.subscriptionEnd,
    pendingManualPayment: !!pendingTx,
    questionsAsked,
    questionsRemaining,
    maxQuestions,
    baseMaxQuestions,
    bonusQuestions,
    referralCode: user?.referralCode || null,
    planSlug: user?.planSlug || subscription.planSlug || "free",
  };

  return (
    <SubscriptionClient
      hydratedPlans={JSON.parse(JSON.stringify(plans))}
      trialDays={config.trialDays}
      initialSubscriptionData={initialSubscriptionData}
    />
  );
}
