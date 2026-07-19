import { NextResponse } from "next/server";

import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { redeemFreeAccessSubscriptionCoupon } from "@/lib/subscription-coupons";

export const dynamic = "force-dynamic";

/** POST /api/mobile/subscription/coupons/redeem — FREE_ACCESS redemption. */
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

    if (!code.trim()) {
      return NextResponse.json({ error: "A code is required." }, { status: 400 });
    }

    const result = await redeemFreeAccessSubscriptionCoupon({
      code,
      userId: payload.userId,
      userEmail: payload.email,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, reason: result.reason },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      planName: result.planName,
      planSlug: result.planSlug,
      subscriptionEnd: result.subscriptionEnd.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/mobile/subscription/coupons/redeem error:", error);
    return NextResponse.json({ error: "Failed to redeem coupon." }, { status: 500 });
  }
}
