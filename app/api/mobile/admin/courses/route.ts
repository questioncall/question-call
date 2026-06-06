import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseEnrollment from "@/models/CourseEnrollment";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/courses
 *
 * Admin list of all courses with enrollment counts (mirrors the data the web
 * admin courses page renders). Status/featured/delete actions reuse the
 * existing bearer-capable `/api/courses/[id]` route.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const [courses, enrollments] = await Promise.all([
      Course.find().sort({ createdAt: -1 }).lean(),
      CourseEnrollment.find().select("courseId").lean(),
    ]);

    const countByCourse = new Map<string, number>();
    enrollments.forEach((e) => {
      const key = e.courseId.toString();
      countByCourse.set(key, (countByCourse.get(key) ?? 0) + 1);
    });

    const data = courses.map((c) => ({
      _id: c._id.toString(),
      title: c.title,
      subject: c.subject,
      level: c.level,
      pricingModel: c.pricingModel,
      price: c.price,
      status: c.status,
      isFeatured: c.isFeatured,
      instructorName: c.instructorName,
      instructorRole: c.instructorRole,
      enrollmentCount: countByCourse.get(c._id.toString()) ?? 0,
      createdAt: (c.createdAt as Date)?.toISOString?.() ?? null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/mobile/admin/courses error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
