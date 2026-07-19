import { NextResponse } from "next/server";

import { authenticateMobileRequest } from "@/lib/mobile-auth";
import { findEligibleSubscriptionCouponsForUser } from "@/lib/subscription-coupons";

export const dynamic = "force-dynamic";

/** GET /api/mobile/subscription/coupons/eligible — bearer-auth mirror. */
export async function GET(request: Request) {
  const payload = await authenticateMobileRequest(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "STUDENT") {
    return NextResponse.json({ coupons: [] });
  }

  try {
    const coupons = await findEligibleSubscriptionCouponsForUser({
      userId: payload.userId,
      userEmail: payload.email,
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("GET /api/mobile/subscription/coupons/eligible error:", error);
    return NextResponse.json(
      { error: "Failed to load eligible coupons." },
      { status: 500 },
    );
  }
}
