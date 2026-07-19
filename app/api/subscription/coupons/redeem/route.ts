import { NextRequest, NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { redeemFreeAccessSubscriptionCoupon } from "@/lib/subscription-coupons";

export async function POST(request: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can redeem subscription coupons." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";

    if (!code.trim()) {
      return NextResponse.json({ error: "A code is required." }, { status: 400 });
    }

    const result = await redeemFreeAccessSubscriptionCoupon({
      code,
      userId: session.user.id,
      userEmail: session.user.email,
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
    console.error("[POST /api/subscription/coupons/redeem]", error);
    return NextResponse.json(
      { error: "Failed to redeem coupon." },
      { status: 500 },
    );
  }
}
