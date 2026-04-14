import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { checkCourseAccess } from "@/lib/course-access";
import { calculateOverallProgressPercent } from "@/lib/course-progress";
import { connectToDatabase } from "@/lib/mongodb";
import { getPlatformConfig } from "@/models/PlatformConfig";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseVideo from "@/models/CourseVideo";
import VideoProgress from "@/models/VideoProgress";

function clampWatchedPercent(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, parsed));
}

async function buildVideoProgressResponse(input: {
  studentId: string;
  enrollmentId: string;
  courseId: string;
  sectionId: string;
  videoId: string;
  overallProgressPercent: number;
}) {
  const [progress, totalVideosInSection, completedVideosInSection] = await Promise.all([
    VideoProgress.findOne({
      studentId: input.studentId,
      videoId: input.videoId,
    })
      .select("watchedPercent isCompleted")
      .lean(),
    CourseVideo.countDocuments({
      courseId: input.courseId,
      sectionId: input.sectionId,
    }),
    VideoProgress.countDocuments({
      enrollmentId: input.enrollmentId,
      studentId: input.studentId,
      courseId: input.courseId,
      sectionId: input.sectionId,
      isCompleted: true,
    }),
  ]);

  const sectionProgressPercent =
    totalVideosInSection > 0
      ? Math.round((completedVideosInSection / totalVideosInSection) * 100)
      : 0;

  return {
    watchedPercent: progress?.watchedPercent ?? 0,
    isCompleted: progress?.isCompleted ?? false,
    overallProgressPercent: input.overallProgressPercent,
    sectionProgressPercent,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can view video progress." },
        { status: 403 },
      );
    }

    const { id, videoId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(videoId)) {
      return NextResponse.json(
        { error: "Invalid course or video id." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [enrollment, video] = await Promise.all([
      CourseEnrollment.findOne({
        courseId: id,
        studentId: session.user.id,
      }).select("_id overallProgressPercent"),
      CourseVideo.findOne({ _id: videoId, courseId: id }).select("_id sectionId"),
    ]);

    if (!enrollment || !video) {
      return NextResponse.json({ error: "Progress target not found." }, { status: 404 });
    }

    const response = await buildVideoProgressResponse({
      studentId: session.user.id,
      enrollmentId: enrollment._id.toString(),
      courseId: id,
      sectionId: video.sectionId.toString(),
      videoId,
      overallProgressPercent: enrollment.overallProgressPercent ?? 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/courses/:id/videos/:videoId/progress]", error);
    return NextResponse.json(
      { error: "Failed to load video progress." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can update video progress." },
        { status: 403 },
      );
    }

    const { id, videoId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(videoId)) {
      return NextResponse.json(
        { error: "Invalid course or video id." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [enrollment, video, config] = await Promise.all([
      CourseEnrollment.findOne({
        courseId: id,
        studentId: session.user.id,
      }),
      CourseVideo.findOne({ _id: videoId, courseId: id }),
      getPlatformConfig(),
    ]);

    if (!enrollment || !video) {
      return NextResponse.json({ error: "Progress target not found." }, { status: 404 });
    }

    const body = await request.json();
    const watchedPercent = clampWatchedPercent(body.watchedPercent);
    const now = new Date();
    const threshold = config.courseProgressCompletionThreshold;

    let progress = await VideoProgress.findOne({
      studentId: session.user.id,
      videoId,
    });

    const priorCompleted = progress?.isCompleted ?? false;
    const nextWatchedPercent = Math.max(progress?.watchedPercent ?? 0, watchedPercent);
    const nextCompleted = priorCompleted || nextWatchedPercent >= threshold;

    if (!progress) {
      progress = await VideoProgress.create({
        enrollmentId: enrollment._id,
        studentId: session.user.id,
        courseId: id,
        sectionId: video.sectionId,
        videoId,
        watchedPercent: nextWatchedPercent,
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? now : null,
        firstWatchedAt: now,
        lastWatchedAt: now,
      });
      
      video.viewCount = (video.viewCount ?? 0) + 1;
      await video.save();
    } else {
      progress.watchedPercent = nextWatchedPercent;
      progress.isCompleted = nextCompleted;
      progress.lastWatchedAt = now;
      if (nextCompleted && !progress.completedAt) {
        progress.completedAt = now;
      }
      await progress.save();
    }

    if (!priorCompleted && nextCompleted) {
      enrollment.completedVideoCount = (enrollment.completedVideoCount ?? 0) + 1;
      enrollment.overallProgressPercent = calculateOverallProgressPercent(
        enrollment.completedVideoCount,
        enrollment.totalVideoCount ?? 0,
      );
      await enrollment.save();
    }

    const response = await buildVideoProgressResponse({
      studentId: session.user.id,
      enrollmentId: enrollment._id.toString(),
      courseId: id,
      sectionId: video.sectionId.toString(),
      videoId,
      overallProgressPercent: enrollment.overallProgressPercent ?? 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[PATCH /api/courses/:id/videos/:videoId/progress]", error);
    return NextResponse.json(
      { error: "Failed to update video progress." },
      { status: 500 },
    );
  }
}
