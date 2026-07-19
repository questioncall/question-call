import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/mongodb";
import { getHydratedPlans, getPlatformConfig } from "@/models/PlatformConfig";
import CourseCoupon from "@/models/CourseCoupon";
import SubscriptionCoupon, {
  SUBSCRIPTION_COUPON_MAX_EMAILS,
} from "@/models/SubscriptionCoupon";
import SubscriptionCouponRedemption from "@/models/SubscriptionCouponRedemption";

export type AdminActionResult<T = Record<string, unknown>> =
  | { ok: true; payload: T; status?: number }
  | { ok: false; error: string; status: number };

function normalizeDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : Number.NaN;
}

/** Accepts an array or a comma/newline-separated string of emails. */
export function normalizeEmailList(value: unknown): string[] | null {
  let raw: string[];
  if (Array.isArray(value)) {
    raw = value.map((entry) => String(entry));
  } else if (typeof value === "string") {
    raw = value.split(/[\n,;]+/);
  } else if (value === null || value === undefined) {
    return [];
  } else {
    return null;
  }

  const emails = [
    ...new Set(raw.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emails.some((email) => !emailShape.test(email))) {
    return null;
  }

  return emails;
}

export async function listSubscriptionCoupons(): Promise<AdminActionResult> {
  await connectToDatabase();

  const coupons = await SubscriptionCoupon.find().sort({ createdAt: -1 }).lean();

  const redemptionCounts = await SubscriptionCouponRedemption.aggregate<{
    _id: unknown;
    redemptionCount: number;
  }>([
    { $match: { couponId: { $in: coupons.map((c) => c._id) } } },
    { $group: { _id: "$couponId", redemptionCount: { $sum: 1 } } },
  ]);

  const countById = new Map(
    redemptionCounts.map((item) => [String(item._id), item.redemptionCount]),
  );

  return {
    ok: true,
    payload: {
      coupons: coupons.map((coupon) => ({
        ...coupon,
        redemptionCount: countById.get(coupon._id.toString()) ?? 0,
      })),
    },
  };
}

export async function createSubscriptionCoupon(
  body: Record<string, unknown>,
  adminId: string,
): Promise<AdminActionResult> {
  await connectToDatabase();

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const kind = typeof body.kind === "string" ? body.kind : "";

  if (!code || (kind !== "FREE_ACCESS" && kind !== "PERCENTAGE")) {
    return { ok: false, error: "code and a valid kind are required.", status: 400 };
  }

  const planSlug =
    typeof body.planSlug === "string" && body.planSlug.trim()
      ? body.planSlug.trim()
      : null;

  const config = await getPlatformConfig();
  const plans = getHydratedPlans(config);
  const paidPlanSlugs = plans
    .filter((plan) => plan.slug !== "free")
    .map((plan) => plan.slug);

  if (kind === "FREE_ACCESS") {
    if (!planSlug || !paidPlanSlugs.includes(planSlug)) {
      return {
        ok: false,
        error: "Free-access coupons need a valid paid plan.",
        status: 400,
      };
    }
  } else if (planSlug && !paidPlanSlugs.includes(planSlug)) {
    return { ok: false, error: "planSlug is not a valid paid plan.", status: 400 };
  }

  const durationDays = normalizePositiveInt(body.durationDays);
  if (Number.isNaN(durationDays)) {
    return {
      ok: false,
      error: "durationDays must be a positive number or empty.",
      status: 400,
    };
  }

  let discountPercentage: number | undefined;
  if (kind === "PERCENTAGE") {
    const parsed =
      typeof body.discountPercentage === "number"
        ? body.discountPercentage
        : Number(body.discountPercentage);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 100) {
      return {
        ok: false,
        error: "discountPercentage must be between 1 and 100.",
        status: 400,
      };
    }
    discountPercentage = Math.floor(parsed);
  }

  const allowedEmails = normalizeEmailList(body.allowedEmails);
  if (allowedEmails === null) {
    return {
      ok: false,
      error: "allowedEmails contains an invalid email address.",
      status: 400,
    };
  }
  if (allowedEmails.length > SUBSCRIPTION_COUPON_MAX_EMAILS) {
    return {
      ok: false,
      error: `At most ${SUBSCRIPTION_COUPON_MAX_EMAILS} emails are allowed per coupon.`,
      status: 400,
    };
  }

  const usageLimit = normalizePositiveInt(body.usageLimit);
  if (Number.isNaN(usageLimit)) {
    return {
      ok: false,
      error: "usageLimit must be a positive number or empty.",
      status: 400,
    };
  }

  const startsAt = normalizeDate(body.startsAt);
  if (body.startsAt && !startsAt) {
    return { ok: false, error: "startsAt must be a valid date or empty.", status: 400 };
  }

  const expiryDate = normalizeDate(body.expiryDate);
  if (body.expiryDate && !expiryDate) {
    return { ok: false, error: "expiryDate must be a valid date or empty.", status: 400 };
  }

  if (startsAt && expiryDate && startsAt.getTime() >= expiryDate.getTime()) {
    return { ok: false, error: "startsAt must be before expiryDate.", status: 400 };
  }

  const campaign =
    typeof body.campaign === "string" && body.campaign.trim()
      ? body.campaign.trim()
      : null;

  // One code, one meaning: refuse codes that already exist in either coupon
  // namespace — users type these into different boxes and shared strings
  // would be ambiguous support tickets.
  const [existingSubscription, existingCourse] = await Promise.all([
    SubscriptionCoupon.findOne({ code }).collation({ locale: "en", strength: 2 }),
    CourseCoupon.findOne({ code }).collation({ locale: "en", strength: 2 }),
  ]);

  if (existingSubscription || existingCourse) {
    return {
      ok: false,
      error: existingCourse
        ? "A course coupon with that code already exists."
        : "A coupon with that code already exists.",
      status: 409,
    };
  }

  try {
    const coupon = await SubscriptionCoupon.create({
      code,
      kind,
      planSlug,
      durationDays: kind === "FREE_ACCESS" ? durationDays : null,
      discountPercentage,
      allowedEmails,
      usageLimit,
      startsAt,
      expiryDate,
      campaign,
      isActive: true,
      createdBy: adminId,
    });

    return { ok: true, payload: coupon.toObject(), status: 201 };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return {
        ok: false,
        error: "A coupon with that code already exists.",
        status: 409,
      };
    }
    throw error;
  }
}

export async function updateSubscriptionCoupon(
  id: string,
  body: Record<string, unknown>,
): Promise<AdminActionResult> {
  if (!Types.ObjectId.isValid(id)) {
    return { ok: false, error: "Invalid coupon id.", status: 400 };
  }

  await connectToDatabase();

  const coupon = await SubscriptionCoupon.findById(id);
  if (!coupon) {
    return { ok: false, error: "Coupon not found.", status: 404 };
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      return { ok: false, error: "isActive must be a boolean.", status: 400 };
    }
    coupon.isActive = body.isActive;
  }

  if ("usageLimit" in body) {
    const usageLimit = normalizePositiveInt(body.usageLimit);
    if (Number.isNaN(usageLimit)) {
      return {
        ok: false,
        error: "usageLimit must be a positive number or empty.",
        status: 400,
      };
    }
    if (typeof usageLimit === "number" && usageLimit < (coupon.usedCount ?? 0)) {
      return {
        ok: false,
        error: "usageLimit cannot be lower than usedCount.",
        status: 400,
      };
    }
    coupon.usageLimit = usageLimit;
  }

  if ("expiryDate" in body) {
    const expiryDate = normalizeDate(body.expiryDate);
    if (body.expiryDate && !expiryDate) {
      return {
        ok: false,
        error: "expiryDate must be a valid date or empty.",
        status: 400,
      };
    }
    coupon.expiryDate = expiryDate;
  }

  if ("startsAt" in body) {
    const startsAt = normalizeDate(body.startsAt);
    if (body.startsAt && !startsAt) {
      return { ok: false, error: "startsAt must be a valid date or empty.", status: 400 };
    }
    coupon.startsAt = startsAt;
  }

  if ("allowedEmails" in body) {
    const allowedEmails = normalizeEmailList(body.allowedEmails);
    if (allowedEmails === null) {
      return {
        ok: false,
        error: "allowedEmails contains an invalid email address.",
        status: 400,
      };
    }
    coupon.allowedEmails = allowedEmails;
  }

  if ("campaign" in body) {
    coupon.campaign =
      typeof body.campaign === "string" && body.campaign.trim()
        ? body.campaign.trim()
        : null;
  }

  await coupon.save();

  return { ok: true, payload: coupon.toObject() };
}

export async function deleteSubscriptionCoupon(id: string): Promise<AdminActionResult> {
  if (!Types.ObjectId.isValid(id)) {
    return { ok: false, error: "Invalid coupon id.", status: 400 };
  }

  await connectToDatabase();

  const coupon = await SubscriptionCoupon.findById(id).select("_id").lean();
  if (!coupon) {
    return { ok: false, error: "Coupon not found.", status: 404 };
  }

  await SubscriptionCouponRedemption.deleteMany({ couponId: id });
  await SubscriptionCoupon.deleteOne({ _id: id });

  return { ok: true, payload: { deleted: true } };
}

export async function listSubscriptionCouponRedemptions(
  id: string,
): Promise<AdminActionResult> {
  if (!Types.ObjectId.isValid(id)) {
    return { ok: false, error: "Invalid coupon id.", status: 400 };
  }

  await connectToDatabase();

  const coupon = await SubscriptionCoupon.findById(id).select("_id code").lean();
  if (!coupon) {
    return { ok: false, error: "Coupon not found.", status: 404 };
  }

  const redemptions = await SubscriptionCouponRedemption.find({ couponId: id })
    .sort({ redeemedAt: -1 })
    .populate("userId", "name email username")
    .lean();

  return { ok: true, payload: { redemptions } };
}
