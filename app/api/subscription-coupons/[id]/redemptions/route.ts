import { NextRequest, NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { listSubscriptionCouponRedemptions } from "@/lib/subscription-coupon-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can view subscription coupon redemptions." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const result = await listSubscriptionCouponRedemptions(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("[GET /api/subscription-coupons/:id/redemptions]", error);
    return NextResponse.json(
      { error: "Failed to load redemptions." },
      { status: 500 },
    );
  }
}
