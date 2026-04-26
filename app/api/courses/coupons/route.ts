import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";

function parseBooleanFilter(value: string | null) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function normalizeExpiryDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeUsageLimit(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

async function requireAuthAndReturnSession() {
  const session = await getSafeServerSession();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { session };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthAndReturnSession();
    if (auth.error) {
      return auth.error;
    }

    const { session } = auth;
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Only admins or teachers can manage coupons." },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const isActive = parseBooleanFilter(searchParams.get("isActive"));
    const scope = searchParams.get("scope")?.trim();
    const courseId = searchParams.get("courseId")?.trim();

    const query: Record<string, unknown> = {};

    if (isActive !== null) {
      query.isActive = isActive;
    }

    if (scope === "COURSE" || scope === "GLOBAL") {
      query.scope = scope;
    }

    if (courseId && Types.ObjectId.isValid(courseId)) {
      query.courseId = courseId;
    }

    if (session.user.role === "TEACHER") {
      const teacherCourses = await Course.find({ instructorId: session.user.id }).select("_id").lean();
      const teacherCourseIds = teacherCourses.map((c) => c._id.toString());
      
      if (courseId && !teacherCourseIds.includes(courseId)) {
        return NextResponse.json({ coupons: [] });
      }

      query.scope = "COURSE";
      if (!courseId) {
        query.courseId = { $in: teacherCourseIds };
      }
    }

    const coupons = await CourseCoupon.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const redemptionCounts = await CourseCouponRedemption.aggregate<{
      _id: unknown;
      redemptionCount: number;
    }>([
      {
        $match: {
          couponId: { $in: coupons.map((coupon) => coupon._id) },
        },
      },
      {
        $group: {
          _id: "$couponId",
          redemptionCount: { $sum: 1 },
        },
      },
    ]);

    const redemptionCountByCouponId = new Map(
      redemptionCounts.map((item) => [String(item._id), item.redemptionCount]),
    );

    return NextResponse.json({
      coupons: coupons.map((coupon) => ({
        ...coupon,
        redemptionCount: redemptionCountByCouponId.get(coupon._id.toString()) ?? 0,
      })),
    });
  } catch (error) {
    console.error("[GET /api/courses/coupons]", error);
    return NextResponse.json(
      { error: "Failed to load course coupons." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthAndReturnSession();
    if (auth.error) {
      return auth.error;
    }

    const { session } = auth;
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Only admins or teachers can manage coupons." },
        { status: 403 },
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const scope = typeof body.scope === "string" ? body.scope.trim() : "";
    const courseId = typeof body.courseId === "string" ? body.courseId : null;
    const usageLimit = normalizeUsageLimit(body.usageLimit);
    const expiryDate = normalizeExpiryDate(body.expiryDate);
    const discountPercentage = typeof body.discountPercentage === "number" ? body.discountPercentage : Number(body.discountPercentage);

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

      const course = await Course.findById(courseId).select("_id instructorId").lean();
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }
      
      if (session.user.role === "TEACHER" && course.instructorId.toString() !== session.user.id) {
        return NextResponse.json({ error: "You can only create coupons for your own courses." }, { status: 403 });
      }
    } else if (session.user.role === "TEACHER") {
      return NextResponse.json({ error: "Teachers can only create course-scoped coupons." }, { status: 403 });
    }

    const existingCoupon = await CourseCoupon.findOne({ code }).collation({
      locale: "en",
      strength: 2,
    });

    if (existingCoupon) {
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
      createdBy: auth.session.user.id,
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/courses/coupons]", error);

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

    return NextResponse.json(
      { error: "Failed to create course coupon." },
      { status: 500 },
    );
  }
}
