import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sectionId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only teachers or admins can reorder videos." },
        { status: 403 },
      );
    }

    const { id, sectionId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { error: "Invalid course or section id." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const [course, section] = await Promise.all([
      Course.findById(id).select("_id instructorId").lean(),
      CourseSection.findOne({ _id: sectionId, courseId: id }).lean(),
    ]);

    if (!course || !section) {
      return NextResponse.json(
        { error: "Course section not found." },
        { status: 404 },
      );
    }

    if (
      session.user.role !== "ADMIN" &&
      course.instructorId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const videoIds = Array.isArray(body.videoIds)
      ? body.videoIds.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : [];

    if (
      videoIds.length === 0 ||
      videoIds.some((videoId: string) => !Types.ObjectId.isValid(videoId))
    ) {
      return NextResponse.json(
        { error: "videoIds must be a non-empty array of valid ids." },
        { status: 400 },
      );
    }

    const videos = await CourseVideo.find({ courseId: id, sectionId })
      .select("_id")
      .sort({ order: 1 })
      .lean();

    const existingIds = videos.map((video) => video._id.toString()).sort();
    const requestedIds = [...videoIds].sort();

    if (
      existingIds.length !== requestedIds.length ||
      existingIds.some((value, index) => value !== requestedIds[index])
    ) {
      return NextResponse.json(
        { error: "videoIds must match the section's current videos." },
        { status: 400 },
      );
    }

    await CourseVideo.bulkWrite(
      videoIds.map((videoId: string, index: number) => ({
        updateOne: {
          filter: { _id: videoId, courseId: id, sectionId },
          update: { $set: { order: index + 1 } },
        },
      })),
    );

    return NextResponse.json({ reordered: true, sectionId });
  } catch (error) {
    console.error("[PATCH /api/courses/:id/sections/:sectionId/reorder]", error);
    return NextResponse.json(
      { error: "Failed to reorder section videos." },
      { status: 500 },
    );
  }
}
