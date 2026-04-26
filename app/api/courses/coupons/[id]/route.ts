import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthAndReturnSession();
    if (auth.error) {
      return auth.error;
    }

    const { session } = auth;
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
    }

    await connectToDatabase();

    const coupon = await CourseCoupon.findById(id);
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    if (session.user.role === "TEACHER") {
      if (coupon.scope !== "COURSE" || !coupon.courseId) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      const Course = (await import("@/models/Course")).default;
      const course = await Course.findById(coupon.courseId).select("instructorId").lean();
      if (!course || course.instructorId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
    }

    const body = await request.json();

    if ("code" in body) {
      if (typeof body.code !== "string" || !body.code.trim()) {
        return NextResponse.json(
          { error: "code must be a non-empty string." },
          { status: 400 },
        );
      }

      const normalizedCode = body.code.trim().toUpperCase();
      const existingCoupon = await CourseCoupon.findOne({
        _id: { $ne: id },
        code: normalizedCode,
      }).collation({
        locale: "en",
        strength: 2,
      });

      if (existingCoupon) {
        return NextResponse.json(
          { error: "A coupon with that code already exists." },
          { status: 409 },
        );
      }

      coupon.code = normalizedCode;
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be a boolean." },
          { status: 400 },
        );
      }

      coupon.isActive = body.isActive;
    }

    if ("usageLimit" in body) {
      const usageLimit = normalizeUsageLimit(body.usageLimit);

      if (usageLimit !== null && Number.isNaN(usageLimit)) {
        return NextResponse.json(
          { error: "usageLimit must be a positive number or null." },
          { status: 400 },
        );
      }

      if (typeof usageLimit === "number" && usageLimit < (coupon.usedCount ?? 0)) {
        return NextResponse.json(
          { error: "usageLimit cannot be lower than usedCount." },
          { status: 400 },
        );
      }

      coupon.usageLimit = usageLimit;
    }

    if ("expiryDate" in body) {
      const expiryDate = normalizeExpiryDate(body.expiryDate);

      if (body.expiryDate && !expiryDate) {
        return NextResponse.json(
          { error: "expiryDate must be a valid date or null." },
          { status: 400 },
        );
      }

      coupon.expiryDate = expiryDate;
    }

    await coupon.save();

    return NextResponse.json(coupon);
  } catch (error: unknown) {
    console.error("[PATCH /api/courses/coupons/:id]", error);

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
      { error: "Failed to update course coupon." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuthAndReturnSession();
    if (auth.error) {
      return auth.error;
    }

    const { session } = auth;
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
    }

    await connectToDatabase();

    const coupon = await CourseCoupon.findById(id).select("_id scope courseId").lean();
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    if (session.user.role === "TEACHER") {
      if (coupon.scope !== "COURSE" || !coupon.courseId) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
      const Course = (await import("@/models/Course")).default;
      const course = await Course.findById(coupon.courseId).select("instructorId").lean();
      if (!course || course.instructorId.toString() !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
      }
    }

    await CourseCouponRedemption.deleteMany({ couponId: id });
    await CourseCoupon.deleteOne({ _id: id });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/courses/coupons/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete course coupon." },
      { status: 500 },
    );
  }
}
