import { NextResponse } from "next/server";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";
import { connectToDatabase } from "@/lib/mongodb";
import Chapter from "@/models/Chapter";
import ChapterEnrollment from "@/models/ChapterEnrollment";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/admin/chapters
 *
 * Admin list of all standalone chapters with enrollment counts. Status/featured/
 * delete reuse the bearer-capable `/api/chapters/[id]` route.
 */
export async function GET(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    await connectToDatabase();

    const [chapters, enrollments] = await Promise.all([
      Chapter.find().sort({ createdAt: -1 }).lean(),
      ChapterEnrollment.find().select("chapterId").lean(),
    ]);

    const countByChapter = new Map<string, number>();
    enrollments.forEach((e) => {
      const key = e.chapterId.toString();
      countByChapter.set(key, (countByChapter.get(key) ?? 0) + 1);
    });

    const data = chapters.map((c) => ({
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
      enrollmentCount: countByChapter.get(c._id.toString()) ?? 0,
      createdAt: (c.createdAt as Date)?.toISOString?.() ?? null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/mobile/admin/chapters error:", error);
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }
}
