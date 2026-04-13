import { connectToDatabase } from "@/lib/mongodb";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";

type CourseCouponValidationSuccess = {
  valid: true;
  coupon: Awaited<ReturnType<typeof CourseCoupon.findOne>>;
  couponId: string;
};

type CourseCouponValidationFailure = {
  valid: false;
  reason:
    | "INVALID_CODE"
    | "INACTIVE"
    | "EXPIRED"
    | "USAGE_LIMIT_REACHED"
    | "NOT_APPLICABLE"
    | "ALREADY_REDEEMED";
};

export type CourseCouponValidationResult =
  | CourseCouponValidationSuccess
  | CourseCouponValidationFailure;

export async function validateCourseCoupon(input: {
  code: string;
  courseId: string;
  studentId: string;
}): Promise<CourseCouponValidationResult> {
  await connectToDatabase();

  const normalizedCode = input.code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, reason: "INVALID_CODE" };
  }

  const coupon = await CourseCoupon.findOne({ code: normalizedCode }).collation({
    locale: "en",
    strength: 2,
  });

  if (!coupon) {
    return { valid: false, reason: "INVALID_CODE" };
  }

  if (!coupon.isActive) {
    return { valid: false, reason: "INACTIVE" };
  }

  if (coupon.expiryDate && coupon.expiryDate.getTime() <= Date.now()) {
    return { valid: false, reason: "EXPIRED" };
  }

  if (
    typeof coupon.usageLimit === "number" &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { valid: false, reason: "USAGE_LIMIT_REACHED" };
  }

  if (
    coupon.scope === "COURSE" &&
    coupon.courseId?.toString() !== input.courseId
  ) {
    return { valid: false, reason: "NOT_APPLICABLE" };
  }

  const existingRedemption = await CourseCouponRedemption.exists({
    couponId: coupon._id,
    studentId: input.studentId,
    courseId: input.courseId,
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
