import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { activateSubscription } from "@/lib/subscription-activation";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import SubscriptionCoupon, {
  SubscriptionCouponDocument,
  SubscriptionCouponKind,
} from "@/models/SubscriptionCoupon";
import SubscriptionCouponRedemption from "@/models/SubscriptionCouponRedemption";
import Transaction from "@/models/Transaction";

export type SubscriptionCouponFailureReason =
  | "INVALID_CODE"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED"
  | "EMAIL_NOT_ELIGIBLE"
  | "PLAN_NOT_APPLICABLE"
  | "ALREADY_REDEEMED";

export type SubscriptionCouponValidationResult =
  | {
      valid: true;
      coupon: SubscriptionCouponDocument;
      couponId: string;
    }
  | { valid: false; reason: SubscriptionCouponFailureReason };

export const SUBSCRIPTION_COUPON_FAILURE_MESSAGES: Record<
  SubscriptionCouponFailureReason,
  string
> = {
  INVALID_CODE: "That code doesn't exist.",
  INACTIVE: "This coupon is no longer active.",
  NOT_STARTED: "This coupon isn't active yet.",
  EXPIRED: "This coupon has expired.",
  USAGE_LIMIT_REACHED: "This coupon has reached its redemption limit.",
  EMAIL_NOT_ELIGIBLE: "This coupon isn't available for your account.",
  PLAN_NOT_APPLICABLE: "This coupon doesn't apply to that plan.",
  ALREADY_REDEEMED: "You've already redeemed this coupon.",
};

/**
 * Validate a subscription coupon for a user. Read-only — never mutates.
 *
 * `planSlug` is only meaningful for PERCENTAGE coupons that are pinned to a
 * specific plan (checkout passes the plan being bought); FREE_ACCESS coupons
 * carry their own plan.
 */
export async function validateSubscriptionCoupon(input: {
  code: string;
  userId: string;
  userEmail: string | null | undefined;
  planSlug?: string | null;
}): Promise<SubscriptionCouponValidationResult> {
  await connectToDatabase();

  const normalizedCode = input.code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, reason: "INVALID_CODE" };
  }

  const coupon = await SubscriptionCoupon.findOne({ code: normalizedCode }).collation({
    locale: "en",
    strength: 2,
  });

  if (!coupon) {
    return { valid: false, reason: "INVALID_CODE" };
  }

  if (!coupon.isActive) {
    return { valid: false, reason: "INACTIVE" };
  }

  const now = Date.now();

  if (coupon.startsAt && coupon.startsAt.getTime() > now) {
    return { valid: false, reason: "NOT_STARTED" };
  }

  if (coupon.expiryDate && coupon.expiryDate.getTime() <= now) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (
    typeof coupon.usageLimit === "number" &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { valid: false, reason: "USAGE_LIMIT_REACHED" };
  }

  if (coupon.allowedEmails.length > 0) {
    const email = input.userEmail?.trim().toLowerCase();
    if (!email || !coupon.allowedEmails.includes(email)) {
      return { valid: false, reason: "EMAIL_NOT_ELIGIBLE" };
    }
  }

  if (
    coupon.kind === "PERCENTAGE" &&
    coupon.planSlug &&
    input.planSlug &&
    coupon.planSlug !== input.planSlug
  ) {
    return { valid: false, reason: "PLAN_NOT_APPLICABLE" };
  }

  const existingRedemption = await SubscriptionCouponRedemption.exists({
    couponId: coupon._id,
    userId: input.userId,
  });

  if (existingRedemption) {
    return { valid: false, reason: "ALREADY_REDEEMED" };
  }

  return {
    valid: true,
    coupon,
    couponId: coupon._id.toString(),
  };
}

/**
 * Atomically claim one usage slot on a coupon. Returns false when the coupon
 * was deactivated or its "first N redeemers" limit filled between validation
 * and now — the guard that makes racing redemptions safe.
 */
export async function claimSubscriptionCouponSlot(couponId: string | Types.ObjectId) {
  const claimed = await SubscriptionCoupon.findOneAndUpdate(
    {
      _id: couponId,
      isActive: true,
      $or: [
        { usageLimit: null },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
      ],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  return claimed !== null;
}

export async function releaseSubscriptionCouponSlot(couponId: string | Types.ObjectId) {
  await SubscriptionCoupon.updateOne(
    { _id: couponId, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } },
  );
}

export type RedeemFreeAccessResult =
  | {
      ok: true;
      planName: string;
      planSlug: string;
      subscriptionEnd: Date;
    }
  | { ok: false; reason: SubscriptionCouponFailureReason | "ACTIVATION_FAILED"; message: string };

/**
 * Full FREE_ACCESS redemption: validate → claim slot → record redemption →
 * activate the plan. Used by both the web-session and mobile-bearer redeem
 * routes.
 */
export async function redeemFreeAccessSubscriptionCoupon(input: {
  code: string;
  userId: string;
  userEmail: string | null | undefined;
}): Promise<RedeemFreeAccessResult> {
  const validation = await validateSubscriptionCoupon(input);

  if (!validation.valid) {
    return {
      ok: false,
      reason: validation.reason,
      message: SUBSCRIPTION_COUPON_FAILURE_MESSAGES[validation.reason],
    };
  }

  const { coupon } = validation;

  if (coupon.kind !== "FREE_ACCESS" || !coupon.planSlug) {
    return {
      ok: false,
      reason: "PLAN_NOT_APPLICABLE",
      message: "This coupon is a discount code — apply it at checkout instead.",
    };
  }

  const claimed = await claimSubscriptionCouponSlot(coupon._id);
  if (!claimed) {
    return {
      ok: false,
      reason: "USAGE_LIMIT_REACHED",
      message: SUBSCRIPTION_COUPON_FAILURE_MESSAGES.USAGE_LIMIT_REACHED,
    };
  }

  // Second guard: the unique (couponId, userId) index catches a double-submit
  // that slipped past the read-side ALREADY_REDEEMED check.
  let redemption;
  try {
    redemption = await SubscriptionCouponRedemption.create({
      couponId: coupon._id,
      userId: input.userId,
      emailSnapshot: input.userEmail?.trim().toLowerCase() || null,
      planSlug: coupon.planSlug,
      kind: "FREE_ACCESS",
    });
  } catch (error) {
    await releaseSubscriptionCouponSlot(coupon._id);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return {
        ok: false,
        reason: "ALREADY_REDEEMED",
        message: SUBSCRIPTION_COUPON_FAILURE_MESSAGES.ALREADY_REDEEMED,
      };
    }
    throw error;
  }

  const activation = await activateSubscription({
    userId: input.userId,
    planSlug: coupon.planSlug,
    durationDays: coupon.durationDays,
  });

  if (!activation.ok) {
    await SubscriptionCouponRedemption.deleteOne({ _id: redemption._id });
    await releaseSubscriptionCouponSlot(coupon._id);
    return { ok: false, reason: "ACTIVATION_FAILED", message: activation.error };
  }

  // Zero-amount audit transaction so receipts/finance views stay complete.
  const auditTransaction = await Transaction.create({
    userId: input.userId,
    type: "SUBSCRIPTION_MANUAL",
    amount: 0,
    status: "COMPLETED",
    gateway: "INTERNAL",
    planSlug: coupon.planSlug,
    meta: {
      source: "SUBSCRIPTION_COUPON",
      couponId: coupon._id.toString(),
      couponCode: coupon.code,
      campaign: coupon.campaign ?? null,
      subscriptionEndsAt: activation.subscriptionEnd.toISOString(),
    },
  }).catch(() => null);

  if (auditTransaction) {
    await SubscriptionCouponRedemption.updateOne(
      { _id: redemption._id },
      { transactionId: auditTransaction._id },
    ).catch(() => {});
  }

  return {
    ok: true,
    planName: activation.planName,
    planSlug: coupon.planSlug,
    subscriptionEnd: activation.subscriptionEnd,
  };
}

/** Wire shape for a coupon the user has been personally invited to. */
export type EligibleSubscriptionCoupon = {
  code: string;
  kind: SubscriptionCouponKind;
  planSlug: string | null;
  planName: string | null;
  durationDays: number | null;
  discountPercentage: number | null;
  campaign: string | null;
  expiryDate: string | null;
};

/**
 * Coupons this specific user was hand-picked for — i.e. their email is in the
 * coupon's `allowedEmails` list — and that they can still redeem right now.
 *
 * Deliberately narrower than "every coupon that would validate": open coupons
 * (empty `allowedEmails`) are not a personal invitation, so surfacing them as
 * "congrats, you were selected" would be a lie. Callers use this to show the
 * post-login announcement.
 */
export async function findEligibleSubscriptionCouponsForUser(input: {
  userId: string;
  userEmail: string | null | undefined;
}): Promise<EligibleSubscriptionCoupon[]> {
  const email = input.userEmail?.trim().toLowerCase();
  if (!email) return [];

  await connectToDatabase();

  const now = new Date();

  const coupons = (await SubscriptionCoupon.find({
    isActive: true,
    allowedEmails: email,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gt: now } }] },
      {
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
      },
    ],
  }).sort({ createdAt: -1 })) as SubscriptionCouponDocument[];

  if (coupons.length === 0) return [];

  // Drop the ones this user has already redeemed.
  const redeemed = await SubscriptionCouponRedemption.find({
    userId: input.userId,
    couponId: { $in: coupons.map((coupon) => coupon._id) },
  }).select("couponId");

  const redeemedIds = new Set(
    redeemed.map((entry) => String((entry as { couponId: unknown }).couponId)),
  );

  const available = coupons.filter(
    (coupon) => !redeemedIds.has(coupon._id.toString()),
  );

  if (available.length === 0) return [];

  const config = await getPlatformConfig();
  const plans = getHydratedPlans(config);

  return available.map((coupon) => ({
    code: coupon.code,
    kind: coupon.kind as SubscriptionCouponKind,
    planSlug: coupon.planSlug ?? null,
    planName: coupon.planSlug
      ? (plans.find((plan) => plan.slug === coupon.planSlug)?.name ?? null)
      : null,
    durationDays: coupon.durationDays ?? null,
    discountPercentage: coupon.discountPercentage ?? null,
    campaign: coupon.campaign ?? null,
    expiryDate: coupon.expiryDate ? coupon.expiryDate.toISOString() : null,
  }));
}

/**
 * Compute the discounted price preview for a PERCENTAGE coupon against the
 * hydrated plans. Returns per-plan pricing so the UI can show what the code is
 * worth before checkout.
 */
export async function getSubscriptionCouponPricing(coupon: SubscriptionCouponDocument) {
  const config = await getPlatformConfig();
  const plans = getHydratedPlans(config);

  return plans
    .filter((plan) => plan.slug !== "free" && plan.price > 0)
    .filter((plan) => !coupon.planSlug || coupon.planSlug === plan.slug)
    .map((plan) => {
      const discount =
        coupon.kind === "PERCENTAGE" && typeof coupon.discountPercentage === "number"
          ? Math.round((plan.price * coupon.discountPercentage) / 100)
          : plan.price;
      return {
        planSlug: plan.slug,
        planName: plan.name,
        originalPrice: plan.price,
        discountedPrice: Math.max(0, plan.price - discount),
        tax: plan.tax,
      };
    });
}

/**
 * Apply a PERCENTAGE coupon to a plan price. Server-side re-pricing for the
 * checkout routes — never trust a client-provided discounted amount.
 */
export function applySubscriptionCouponDiscount(price: number, discountPercentage: number) {
  const discount = Math.round((price * discountPercentage) / 100);
  return Math.max(0, price - discount);
}

/**
 * Finalize a PERCENTAGE redemption once its discounted purchase actually
 * completes (admin approval of a manual payment, or eSewa verify). Claims the
 * usage slot at completion time — submissions that get rejected never consume
 * a "first N" slot. Idempotent per (coupon, user).
 */
export async function finalizePercentageCouponRedemption(input: {
  couponId: string;
  userId: string;
  userEmail?: string | null;
  planSlug: string;
  transactionId: string | Types.ObjectId;
}) {
  if (!Types.ObjectId.isValid(input.couponId)) return;

  const claimed = await claimSubscriptionCouponSlot(input.couponId);
  if (!claimed) {
    // Limit filled between submission and approval; access was already priced
    // and paid, so we record the redemption anyway for audit but flag nothing.
    await SubscriptionCoupon.updateOne(
      { _id: input.couponId },
      { $inc: { usedCount: 1 } },
    ).catch(() => {});
  }

  await SubscriptionCouponRedemption.create({
    couponId: input.couponId,
    userId: input.userId,
    emailSnapshot: input.userEmail?.trim().toLowerCase() || null,
    planSlug: input.planSlug,
    kind: "PERCENTAGE",
    transactionId: input.transactionId,
  }).catch((error) => {
    const isDuplicate =
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000;
    if (isDuplicate) {
      // Already recorded (e.g. approve retried) — undo the extra claim.
      return releaseSubscriptionCouponSlot(input.couponId);
    }
    console.error("[finalizePercentageCouponRedemption]", error);
  });
}
