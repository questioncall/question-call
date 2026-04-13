import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { checkCourseAccess } from "@/lib/course-access";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";

function toSectionVideoStub(video: {
  _id: { toString(): string };
  title: string;
  description?: string | null;
  durationMinutes: number;
  order: number;
  thumbnailUrl?: string | null;
  isLiveRecording?: boolean;
}) {
  return {
    _id: video._id,
    title: video.title,
    description: video.description ?? null,
    durationMinutes: video.durationMinutes,
    order: video.order,
    thumbnailUrl: video.thumbnailUrl ?? null,
    isLiveRecording: video.isLiveRecording ?? false,
  };
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

    await connectToDatabase();

    const course = await Course.findById(id).select("_id instructorId status").lean();
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const isInstructor = course.instructorId.toString() === session.user.id;
    if (
      session.user.role !== "ADMIN" &&
      !isInstructor &&
      course.status !== "ACTIVE"
    ) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [sections, videos] = await Promise.all([
      CourseSection.find({ courseId: id }).sort({ order: 1 }).lean(),
      CourseVideo.find({ courseId: id })
        .select(
          "_id sectionId title description durationMinutes order thumbnailUrl isLiveRecording",
        )
        .sort({ sectionId: 1, order: 1 })
        .lean(),
    ]);

    const videosBySectionId = new Map<string, ReturnType<typeof toSectionVideoStub>[]>();
    videos.forEach((video) => {
      const sectionId = video.sectionId.toString();
      const existing = videosBySectionId.get(sectionId) ?? [];
      existing.push(toSectionVideoStub(video));
      videosBySectionId.set(sectionId, existing);
    });

    return NextResponse.json({
      sections: sections.map((section) => ({
        ...section,
        videos: videosBySectionId.get(section._id.toString()) ?? [],
      })),
    });
  } catch (error) {
    console.error("[GET /api/courses/:id/sections]", error);
    return NextResponse.json(
      { error: "Failed to load course sections." },
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

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only teachers or admins can create sections." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.findById(id).select("_id instructorId");
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (
      session.user.role !== "ADMIN" &&
      course.instructorId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "Section title is required." },
        { status: 400 },
      );
    }

    const lastSection = await CourseSection.findOne({ courseId: id })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const section = await CourseSection.create({
      courseId: id,
      title,
      description: description || null,
      order: (lastSection?.order ?? 0) + 1,
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses/:id/sections]", error);
    return NextResponse.json(
      { error: "Failed to create section." },
      { status: 500 },
    );
  }
}
