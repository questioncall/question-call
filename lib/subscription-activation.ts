import { connectToDatabase } from "@/lib/mongodb";
import { emitSubscriptionUpdated } from "@/lib/pusher/pusherServer";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import User from "@/models/User";

export type ActivateSubscriptionResult =
  | {
      ok: true;
      planName: string;
      subscriptionEnd: Date;
      carryOverBonusQuestions: number;
    }
  | { ok: false; error: string; status: number };

/**
 * Activate (or extend) a user's subscription for a plan.
 *
 * Single source of truth for the activation side-effects that were previously
 * duplicated between manual-payment approval and eSewa verification:
 * - extends from the current `subscriptionEnd` when one is still in the future,
 * - carries over unused questions from the old plan as bonus questions,
 * - resets `questionsAsked` and emits the `subscription:updated` Pusher event.
 *
 * `durationDays` overrides the plan's own duration (used by free-access
 * subscription coupons); omit it to use the plan default.
 */
export async function activateSubscription(args: {
  userId: string;
  planSlug: string;
  durationDays?: number | null;
}): Promise<ActivateSubscriptionResult> {
  await connectToDatabase();

  const user = await User.findById(args.userId).select(
    "name subscriptionStatus subscriptionEnd trialUsed planSlug questionsAsked bonusQuestions",
  );

  if (!user) {
    return { ok: false, error: "User not found", status: 404 };
  }

  const config = await getPlatformConfig();
  const plans = getHydratedPlans(config);
  const plan = plans.find((entry) => entry.slug === args.planSlug);

  if (!plan) {
    return { ok: false, error: "Plan is missing or invalid", status: 400 };
  }

  const durationDays =
    typeof args.durationDays === "number" && args.durationDays > 0
      ? args.durationDays
      : plan.durationDays;

  const now = new Date();
  const currentSubscriptionEnd =
    user.subscriptionEnd && new Date(user.subscriptionEnd) > now
      ? new Date(user.subscriptionEnd)
      : now;
  const nextSubscriptionEnd = new Date(
    currentSubscriptionEnd.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  const oldPlan = plans.find((p) => p.slug === (user.planSlug ?? "free"));
  const oldPlanMax = (oldPlan?.maxQuestions ?? 0) + (user.bonusQuestions ?? 0);
  const oldAsked = user.questionsAsked ?? 0;
  const carryOver = Math.max(0, oldPlanMax - oldAsked);

  user.subscriptionStatus = "ACTIVE";
  user.subscriptionEnd = nextSubscriptionEnd;
  user.trialUsed = true;
  user.planSlug = plan.slug;
  user.questionsAsked = 0;
  user.bonusQuestions = carryOver;
  await user.save();

  await emitSubscriptionUpdated(args.userId, {
    subscriptionStatus: "ACTIVE",
    subscriptionEnd: nextSubscriptionEnd.toISOString(),
    planSlug: plan.slug,
    questionsAsked: 0,
    bonusQuestions: carryOver,
  }).catch(console.error);

  return {
    ok: true,
    planName: plan.name,
    subscriptionEnd: nextSubscriptionEnd,
    carryOverBonusQuestions: carryOver,
  };
}
