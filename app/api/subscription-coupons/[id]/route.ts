import { NextRequest, NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import {
  deleteSubscriptionCoupon,
  updateSubscriptionCoupon,
} from "@/lib/subscription-coupon-admin";

async function requireAdmin() {
  const session = await getSafeServerSession();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Only admins can manage subscription coupons." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = await request.json();
    const result = await updateSubscriptionCoupon(id, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("[PATCH /api/subscription-coupons/:id]", error);
    return NextResponse.json(
      { error: "Failed to update subscription coupon." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { id } = await params;
    const result = await deleteSubscriptionCoupon(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("[DELETE /api/subscription-coupons/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete subscription coupon." },
      { status: 500 },
    );
  }
}
