import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";

export const dynamic = "force-dynamic";

function normalizeExpiryDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeUsageLimit(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

/** GET /api/mobile/admin/coupons — all coupons with redemption counts. */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const coupons = await CourseCoupon.find().sort({ createdAt: -1 }).lean();

    const redemptionCounts = await CourseCouponRedemption.aggregate<{
      _id: unknown;
      redemptionCount: number;
    }>([
      { $match: { couponId: { $in: coupons.map((c) => c._id) } } },
      { $group: { _id: "$couponId", redemptionCount: { $sum: 1 } } },
    ]);

    const countById = new Map(
      redemptionCounts.map((item) => [String(item._id), item.redemptionCount]),
    );

    return NextResponse.json({
      coupons: coupons.map((coupon) => ({
        ...coupon,
        redemptionCount: countById.get(coupon._id.toString()) ?? 0,
      })),
    });
  } catch (error) {
    console.error("GET /api/mobile/admin/coupons error:", error);
    return NextResponse.json({ error: "Failed to load coupons." }, { status: 500 });
  }
}

/** POST /api/mobile/admin/coupons — create a GLOBAL or COURSE coupon (admin). */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const scope = typeof body.scope === "string" ? body.scope.trim() : "";
    const courseId = typeof body.courseId === "string" ? body.courseId : null;
    const usageLimit = normalizeUsageLimit(body.usageLimit);
    const expiryDate = normalizeExpiryDate(body.expiryDate);
    const discountPercentage =
      typeof body.discountPercentage === "number"
        ? body.discountPercentage
        : Number(body.discountPercentage);

    if (!code || (scope !== "COURSE" && scope !== "GLOBAL")) {
      return NextResponse.json(
        { error: "code and valid scope are required." },
        { status: 400 },
      );
    }
    if (isNaN(discountPercentage) || discountPercentage < 1 || discountPercentage > 100) {
      return NextResponse.json(
        { error: "discountPercentage must be between 1 and 100." },
        { status: 400 },
      );
    }
    if (usageLimit !== null && Number.isNaN(usageLimit)) {
      return NextResponse.json(
        { error: "usageLimit must be a positive number or null." },
        { status: 400 },
      );
    }
    if (body.expiryDate && !expiryDate) {
      return NextResponse.json(
        { error: "expiryDate must be a valid date or null." },
        { status: 400 },
      );
    }

    if (scope === "COURSE") {
      if (!courseId || !Types.ObjectId.isValid(courseId)) {
        return NextResponse.json(
          { error: "courseId is required for course-scoped coupons." },
          { status: 400 },
        );
      }
      const course = await Course.findById(courseId).select("_id").lean();
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }
    }

    const existing = await CourseCoupon.findOne({ code }).collation({
      locale: "en",
      strength: 2,
    });
    if (existing) {
      return NextResponse.json(
        { error: "A coupon with that code already exists." },
        { status: 409 },
      );
    }

    const coupon = await CourseCoupon.create({
      code,
      type: "PERCENTAGE",
      discountPercentage,
      scope,
      courseId: scope === "COURSE" ? courseId : null,
      usageLimit,
      expiryDate,
      isActive: true,
      createdBy: gate.userId,
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/mobile/admin/coupons error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { error: "A coupon with that code already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to create coupon." }, { status: 500 });
  }
}
