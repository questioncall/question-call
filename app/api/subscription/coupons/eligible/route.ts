import { NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { findEligibleSubscriptionCouponsForUser } from "@/lib/subscription-coupons";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscription/coupons/eligible
 *
 * Coupons this user was personally invited to (their email is on the coupon's
 * allow-list) and can still redeem. Drives the post-login announcement banner.
 */
export async function GET() {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ coupons: [] });
    }

    const coupons = await findEligibleSubscriptionCouponsForUser({
      userId: session.user.id,
      userEmail: session.user.email,
    });

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("[GET /api/subscription/coupons/eligible]", error);
    return NextResponse.json(
      { error: "Failed to load eligible coupons." },
      { status: 500 },
    );
  }
}
