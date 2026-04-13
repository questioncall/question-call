import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import {
  checkCourseAccess,
  checkCourseManagementAccess,
} from "@/lib/course-access";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import LiveSession from "@/models/LiveSession";

function parseOptionalDuration(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const sessions = await LiveSession.find({ courseId: id })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .lean();

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("[GET /api/courses/:id/live-sessions]", error);
    return NextResponse.json(
      { error: "Failed to load live sessions." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    const canManage = await checkCourseManagementAccess(session.user.id, id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const course = await Course.findById(id).select(
      "_id instructorId pricingModel liveSessionsEnabled",
    );

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.pricingModel === "FREE" || !course.liveSessionsEnabled) {
      return NextResponse.json(
        { error: "Live sessions are disabled for this course." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const scheduledAtValue =
      typeof body.scheduledAt === "string" ? body.scheduledAt : "";
    const sectionId =
      typeof body.sectionId === "string" && body.sectionId.trim()
        ? body.sectionId
        : null;
    const zoomLink =
      typeof body.zoomLink === "string" && body.zoomLink.trim()
        ? body.zoomLink.trim()
        : null;
    const durationMinutes = parseOptionalDuration(body.durationMinutes);

    if (!title || !scheduledAtValue) {
      return NextResponse.json(
        { error: "title and scheduledAt are required." },
        { status: 400 },
      );
    }

    const scheduledAt = new Date(scheduledAtValue);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Invalid scheduledAt." }, { status: 400 });
    }

    if (Number.isNaN(durationMinutes)) {
      return NextResponse.json(
        { error: "durationMinutes must be a non-negative number." },
        { status: 400 },
      );
    }

    if (sectionId) {
      if (!Types.ObjectId.isValid(sectionId)) {
        return NextResponse.json({ error: "Invalid section id." }, { status: 400 });
      }

      const section = await CourseSection.findOne({ _id: sectionId, courseId: id })
        .select("_id")
        .lean();

      if (!section) {
        return NextResponse.json({ error: "Section not found." }, { status: 404 });
      }
    }

    const liveSession = await LiveSession.create({
      courseId: id,
      sectionId,
      title,
      scheduledAt,
      durationMinutes,
      instructorId: course.instructorId,
      zoomLink,
      status: "SCHEDULED",
    });

    return NextResponse.json(liveSession, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses/:id/live-sessions]", error);
    return NextResponse.json(
      { error: "Failed to create live session." },
      { status: 500 },
    );
  }
}
