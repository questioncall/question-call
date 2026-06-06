import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
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

/**
 * PATCH /api/mobile/admin/coupons/[id] — edit code / isActive / usageLimit /
 * expiryDate. Mirrors the web `PATCH /api/courses/coupons/[id]`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
    }

    await connectToDatabase();
    const coupon = await CourseCoupon.findById(id);
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if ("code" in body) {
      if (typeof body.code !== "string" || !body.code.trim()) {
        return NextResponse.json(
          { error: "code must be a non-empty string." },
          { status: 400 },
        );
      }
      const normalizedCode = body.code.trim().toUpperCase();
      const existing = await CourseCoupon.findOne({
        _id: { $ne: id },
        code: normalizedCode,
      }).collation({ locale: "en", strength: 2 });
      if (existing) {
        return NextResponse.json(
          { error: "A coupon with that code already exists." },
          { status: 409 },
        );
      }
      coupon.code = normalizedCode;
    }

    if ("isActive" in body) {
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json({ error: "isActive must be a boolean." }, { status: 400 });
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
    console.error("PATCH /api/mobile/admin/coupons/[id] error:", error);
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
    return NextResponse.json({ error: "Failed to update coupon." }, { status: 500 });
  }
}

/** DELETE /api/mobile/admin/coupons/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid coupon id." }, { status: 400 });
    }

    await connectToDatabase();
    await CourseCouponRedemption.deleteMany({ couponId: id });
    await CourseCoupon.deleteOne({ _id: id });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/mobile/admin/coupons/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete coupon." }, { status: 500 });
  }
}
