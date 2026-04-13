import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { validateCourseCoupon } from "@/lib/course-coupons";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";

export async function POST(request: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can validate coupons." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code : "";
    const courseId = typeof body.courseId === "string" ? body.courseId : "";

    if (!code.trim() || !Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { error: "A valid code and courseId are required." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const course = await Course.findById(courseId).select("_id status").lean();
    if (!course || course.status !== "ACTIVE") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const validation = await validateCourseCoupon({
      code,
      courseId,
      studentId: session.user.id,
    });

    return NextResponse.json(validation);
  } catch (error) {
    console.error("[POST /api/courses/coupons/validate]", error);
    return NextResponse.json(
      { error: "Failed to validate coupon." },
      { status: 500 },
    );
  }
}
