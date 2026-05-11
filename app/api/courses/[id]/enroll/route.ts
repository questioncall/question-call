import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { validateCourseCoupon } from "@/lib/course-coupons";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getQuizSubscriptionSnapshot } from "@/lib/quiz";
import Course from "@/models/Course";
import CourseCoupon from "@/models/CourseCoupon";
import CourseCouponRedemption from "@/models/CourseCouponRedemption";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseVideo from "@/models/CourseVideo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authenticatedUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can enroll in courses." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.findById(id).select(
      "_id pricingModel status enrollmentCount",
    );

    if (!course || course.status !== "ACTIVE") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const existingEnrollment = await CourseEnrollment.findOne({
      courseId: course._id,
      studentId: authenticatedUser.id,
    });

    if (existingEnrollment) {
      return NextResponse.json(
        {
          enrolled: true,
          accessType: existingEnrollment.accessType,
          enrollmentId: existingEnrollment._id,
          enrollment: existingEnrollment,
        },
        { status: 200 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const couponCode =
      typeof body.couponCode === "string" ? body.couponCode.trim() : "";

    const totalVideoCount = await CourseVideo.countDocuments({ courseId: course._id });

    let accessType: "FREE" | "SUBSCRIPTION" | "COUPON";
    let couponId: string | null = null;

    if (couponCode) {
      const validation = await validateCourseCoupon({
        code: couponCode,
        courseId: course._id.toString(),
        studentId: authenticatedUser.id,
      });

      if (!validation.valid) {
        return NextResponse.json(validation, { status: 400 });
      }

      if (validation.coupon.discountPercentage !== 100) {
        return NextResponse.json({ error: "Only 100% discount coupons can bypass payment." }, { status: 400 });
      }

      accessType = "COUPON";
      couponId = validation.couponId;
    } else if (course.pricingModel === "PAID") {
      return NextResponse.json(
        { error: "PAID_COURSE_USE_PURCHASE_FLOW" },
        { status: 400 },
      );
    } else if (course.pricingModel === "FREE") {
      accessType = "FREE";
    } else {
      const subscription = await getQuizSubscriptionSnapshot(authenticatedUser.id);
      if (subscription.subscriptionStatus !== "ACTIVE") {
        return NextResponse.json(
          { reason: "SUBSCRIPTION_REQUIRED" },
          { status: 403 },
        );
      }

      accessType = "SUBSCRIPTION";
    }

    const enrollment = await CourseEnrollment.create({
      courseId: course._id,
      studentId: authenticatedUser.id,
      accessType,
      couponId,
      totalVideoCount,
    });

    await Course.updateOne(
      { _id: course._id },
      { $inc: { enrollmentCount: 1 } },
    );

    if (couponId) {
      await CourseCouponRedemption.create({
        couponId,
        studentId: authenticatedUser.id,
        courseId: course._id,
      });

      await CourseCoupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
    }

    return NextResponse.json(
      {
        enrolled: true,
        accessType,
        enrollmentId: enrollment._id,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/courses/:id/enroll]", error);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      const { id } = await params;
      const retrySession = await getSafeServerSession();
      const duplicateEnrollment = await CourseEnrollment.findOne({
        courseId: id,
        studentId: retrySession?.user?.id,
      });

      return NextResponse.json(
        {
          enrolled: true,
          accessType: duplicateEnrollment?.accessType ?? null,
          enrollmentId: duplicateEnrollment?._id ?? null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { error: "Failed to enroll in course." },
      { status: 500 },
    );
  }
}
