import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import { resolveStudentSubscriptionState } from "@/lib/subscription-state";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/me
 *
 * Returns the full authenticated user object needed by the mobile app.
 * Supports Bearer token auth (mobile) and session cookies (web).
 *
 * Returns 401 if unauthenticated.
 * Returns 403 if the account is suspended — mobile app navigates to suspended screen.
 */
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // getAuthenticatedUser already returns null for suspended users, but we
    // need to distinguish between "not logged in" (401) and "suspended" (403).
    // Re-fetch the raw user to check suspension explicitly.
    await connectToDatabase();

    const user = await User.findById(authUser.id).select(
      "name email username role bio userImage skills interests points pointBalance subscriptionStatus " +
      "subscriptionEnd planSlug questionsAsked bonusQuestions " +
      "isSuspended isMonetized teacherModeVerified " +
      "dailyAnswersCount dailyTargetsAchieved esewaNumber " +
      "referralCode seenNotices seenOnboardingRoles callSettings createdAt +passwordHash"
    ).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isSuspended) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // Resolve effective subscription + plan limits
    const [config, snapshot] = await Promise.all([
      getPlatformConfig(),
      getQuizSubscriptionSnapshot(authUser.id),
    ]);

    const plans = getHydratedPlans(config);
    const resolved = resolveStudentSubscriptionState({
      userPlanSlug: user.planSlug,
      userSubscriptionEnd: user.subscriptionEnd ?? null,
      snapshotPlanSlug: snapshot.planSlug,
      snapshotStatus: snapshot.subscriptionStatus,
      snapshotEnd: snapshot.subscriptionEnd,
    });

    const currentPlan = plans.find((p) => p.slug === resolved.planSlug) ?? plans[0];
    const maxQuestions =
      (currentPlan?.maxQuestions ?? 0) + (user.bonusQuestions ?? 0);

    return NextResponse.json({
      _id: (user._id as { toString(): string }).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      username: user.username ?? null,
      bio: user.bio ?? "",
      image: user.userImage ?? null,
      skills: user.skills ?? [],
      interests: user.interests ?? [],

      // Wallet
      points: user.points ?? 0,
      pointBalance: user.pointBalance ?? 0,

      // Subscription
      subscriptionStatus: resolved.subscriptionStatus,
      subscriptionEnd: resolved.subscriptionEnd,
      planSlug: resolved.planSlug,

      // Question quota
      questionsAsked: user.questionsAsked ?? 0,
      bonusQuestions: user.bonusQuestions ?? 0,
      maxQuestions,

      // Flags
      isSuspended: false,
      isMonetized: user.isMonetized ?? false,
      teacherModeVerified: user.teacherModeVerified ?? false,

      // True when the account has a password (email sign-up). Google-only
      // accounts have no password, so the app can skip the password prompt
      // when deleting. The hash itself is never sent to the client.
      hasPassword: Boolean(user.passwordHash),

      // Daily target (teacher)
      dailyAnswersCount: user.dailyAnswersCount ?? 0,
      dailyTargetsAchieved: user.dailyTargetsAchieved ?? [],

      // Payment
      esewaNumber: user.esewaNumber ?? null,

      // Referral
      referralCode: user.referralCode ?? null,

      // Notices
      seenNotices: (user.seenNotices ?? []).map((id: { toString(): string }) =>
        id.toString(),
      ),

      // Onboarding
      seenOnboardingRoles: user.seenOnboardingRoles ?? [],

      // Call settings
      callSettings: user.callSettings ?? {
        silentIncomingCalls: false,
        incomingRingtone: "default",
        outgoingRingtone: "default",
      },

      createdAt: (user.createdAt as Date | undefined)?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("GET /api/mobile/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
