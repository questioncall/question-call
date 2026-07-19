import { NextRequest, NextResponse } from "next/server";

import { getSafeServerSession } from "@/lib/auth";
import { mergeCoursesIntoTarget } from "@/lib/course-merge";

/**
 * POST /api/admin/courses/merge
 *
 * Body: {
 *   sourceCourseIds: string[],       // the courses being merged together
 *   newCourseTitle?: string,         // primary flow: create + name the merged course
 *   targetCourseId?: string,         // alternative: merge into an existing course
 *   dryRun?: boolean,                // default true — execution must be explicit
 *   wrapSourcesAsSections?: boolean  // retitle single-section sources to the course title
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can merge courses." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const targetCourseId =
      typeof body.targetCourseId === "string" ? body.targetCourseId : null;
    const newCourseTitle =
      typeof body.newCourseTitle === "string" ? body.newCourseTitle : null;
    const sourceCourseIds = Array.isArray(body.sourceCourseIds)
      ? body.sourceCourseIds.filter((id: unknown) => typeof id === "string")
      : [];

    const result = await mergeCoursesIntoTarget({
      targetCourseId,
      newCourseTitle,
      sourceCourseIds,
      adminId: session.user.id,
      // Destructive-by-nature: default to the preview, execute only when the
      // client explicitly says dryRun: false.
      dryRun: body.dryRun !== false,
      wrapSourcesAsSections: body.wrapSourcesAsSections === true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error("[POST /api/admin/courses/merge]", error);
    return NextResponse.json({ error: "Failed to merge courses." }, { status: 500 });
  }
}
