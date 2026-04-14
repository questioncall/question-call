import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SubscriptionClient } from "./subscription-client";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { connectToDatabase } from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

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

  const Question = mongoose.models.Question;
  let questionsAsked = 0;
  if (Question) {
    questionsAsked = await Question.countDocuments({ askerId: session.user.id });
  }

  const initialSubscriptionData = {
    subscriptionStatus: subscription.subscriptionStatus,
    subscriptionEnd: subscription.subscriptionEnd,
    pendingManualPayment: !!pendingTx,
    questionsAsked,
    planSlug: subscription.planSlug,
  };

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);

  return (
    <SubscriptionClient
      hydratedPlans={JSON.parse(JSON.stringify(hydratedPlans))}
      trialDays={config.trialDays}
      initialSubscriptionData={initialSubscriptionData}
    />
  );
}
