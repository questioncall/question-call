import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import {
  createSubscriptionCoupon,
  listSubscriptionCoupons,
} from "@/lib/subscription-coupon-admin";

export const dynamic = "force-dynamic";

/** GET /api/mobile/admin/subscription-coupons — all coupons + redemption counts. */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const result = await listSubscriptionCoupons();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("GET /api/mobile/admin/subscription-coupons error:", error);
    return NextResponse.json(
      { error: "Failed to load subscription coupons." },
      { status: 500 },
    );
  }
}

/** POST /api/mobile/admin/subscription-coupons — create a coupon. */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const body = await request.json();
    const result = await createSubscriptionCoupon(body, gate.userId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload, { status: result.status ?? 201 });
  } catch (error) {
    console.error("POST /api/mobile/admin/subscription-coupons error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription coupon." },
      { status: 500 },
    );
  }
}
