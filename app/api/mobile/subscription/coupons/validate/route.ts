import { NextResponse } from "next/server";

import { authenticateMobileRequest } from "@/lib/mobile-auth";
import {
  getSubscriptionCouponPricing,
  SUBSCRIPTION_COUPON_FAILURE_MESSAGES,
  validateSubscriptionCoupon,
} from "@/lib/subscription-coupons";

export const dynamic = "force-dynamic";

/** POST /api/mobile/subscription/coupons/validate — bearer-auth mirror. */
export async function POST(request: Request) {
  const payload = await authenticateMobileRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Only students can redeem subscription coupons." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";
    const planSlug = typeof body.planSlug === "string" ? body.planSlug : null;

    if (!code.trim()) {
      return NextResponse.json({ error: "A code is required." }, { status: 400 });
    }

    const validation = await validateSubscriptionCoupon({
      code,
      userId: payload.userId,
      userEmail: payload.email,
      planSlug,
    });

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        reason: validation.reason,
        message: SUBSCRIPTION_COUPON_FAILURE_MESSAGES[validation.reason],
      });
    }

    const { coupon } = validation;

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        kind: coupon.kind,
        planSlug: coupon.planSlug,
        durationDays: coupon.durationDays,
        discountPercentage: coupon.discountPercentage ?? null,
      },
      pricing:
        coupon.kind === "PERCENTAGE" ? await getSubscriptionCouponPricing(coupon) : null,
    });
  } catch (error) {
    console.error("POST /api/mobile/subscription/coupons/validate error:", error);
    return NextResponse.json({ error: "Failed to validate coupon." }, { status: 500 });
  }
}
