import { NextRequest, NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import {
  createSubscriptionCoupon,
  listSubscriptionCoupons,
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

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const result = await listSubscriptionCoupons();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("[GET /api/subscription-coupons]", error);
    return NextResponse.json(
      { error: "Failed to load subscription coupons." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const result = await createSubscriptionCoupon(body, auth.session.user.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload, { status: result.status ?? 201 });
  } catch (error) {
    console.error("[POST /api/subscription-coupons]", error);
    return NextResponse.json(
      { error: "Failed to create subscription coupon." },
      { status: 500 },
    );
  }
}
