import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import {
  deleteSubscriptionCoupon,
  listSubscriptionCouponRedemptions,
  updateSubscriptionCoupon,
} from "@/lib/subscription-coupon-admin";

export const dynamic = "force-dynamic";

/** GET /api/mobile/admin/subscription-coupons/[id] — redemption list. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const result = await listSubscriptionCouponRedemptions(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("GET /api/mobile/admin/subscription-coupons/[id] error:", error);
    return NextResponse.json({ error: "Failed to load redemptions." }, { status: 500 });
  }
}

/** PATCH /api/mobile/admin/subscription-coupons/[id] — update coupon. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const result = await updateSubscriptionCoupon(id, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("PATCH /api/mobile/admin/subscription-coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription coupon." },
      { status: 500 },
    );
  }
}

/** DELETE /api/mobile/admin/subscription-coupons/[id] — delete coupon. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    const result = await deleteSubscriptionCoupon(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("DELETE /api/mobile/admin/subscription-coupons/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription coupon." },
      { status: 500 },
    );
  }
}
