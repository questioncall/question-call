import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Mux from "@mux/mux-node";

import { getSafeServerSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

type CreateVideoUploadBody = {
  description?: string | null;
  order?: number;
  sectionId?: string;
  title?: string;
};

function parseOptionalPositiveInt(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
        { error: "Only teachers or admins can upload videos." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (
      session.user.role !== "ADMIN" &&
      course.instructorId.toString() !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateVideoUploadBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const sectionId =
      typeof body.sectionId === "string" ? body.sectionId.trim() : "";
    const requestedOrder = parseOptionalPositiveInt(body.order);

    if (!title || !Types.ObjectId.isValid(sectionId)) {
      return NextResponse.json(
        { error: "title and sectionId are required." },
        { status: 400 },
      );
    }

    const section = await CourseSection.findOne({ _id: sectionId, courseId: id });
    if (!section) {
      return NextResponse.json({ error: "Section not found." }, { status: 404 });
    }

    const existingVideos = await CourseVideo.find({ courseId: id, sectionId })
      .select("_id order")
      .sort({ order: 1 });

    const maxOrder = existingVideos.length + 1;
    const order = requestedOrder ? Math.max(1, Math.min(maxOrder, requestedOrder)) : maxOrder;

    if (order < maxOrder) {
      await CourseVideo.updateMany(
        { courseId: id, sectionId, order: { $gte: order } },
        { $inc: { order: 1 } },
      );
    }

    const videoId = new Types.ObjectId();

    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: videoId.toString(),
      },
    });

    const video = await CourseVideo.create({
      _id: videoId,
      courseId: id,
      sectionId,
      title,
      description: description || null,
      order,
      status: "PROCESSING",
      muxUploadId: upload.id,
    });

    return NextResponse.json({ uploadUrl: upload.url, video }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses/:id/videos]", error);
    return NextResponse.json(
      { error: "Failed to create Mux video upload URL." },
      { status: 500 },
    );
  }
}
