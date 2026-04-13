import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { getSafeServerSession } from "@/lib/auth";
import { checkCourseAccess } from "@/lib/course-access";
import { connectToDatabase } from "@/lib/mongodb";
import CourseEnrollment from "@/models/CourseEnrollment";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";
import VideoProgress from "@/models/VideoProgress";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSafeServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only students can view course progress." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    await connectToDatabase();

    const canAccess = await checkCourseAccess(session.user.id, id);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enrollment = await CourseEnrollment.findOne({
      courseId: id,
      studentId: session.user.id,
    })
      .select(
        "_id overallProgressPercent completedVideoCount totalVideoCount",
      )
      .lean();

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    const [sections, videos, progressItems] = await Promise.all([
      CourseSection.find({ courseId: id }).sort({ order: 1 }).lean(),
      CourseVideo.find({ courseId: id })
        .select("_id sectionId title durationMinutes order")
        .sort({ sectionId: 1, order: 1 })
        .lean(),
      VideoProgress.find({
        studentId: session.user.id,
        courseId: id,
      })
        .select("videoId watchedPercent isCompleted lastWatchedAt")
        .lean(),
    ]);

    const progressByVideoId = new Map(
      progressItems.map((progress) => [progress.videoId.toString(), progress]),
    );

    const videosBySectionId = new Map<
      string,
      Array<{
        videoId: string;
        title: string;
        durationMinutes: number;
        order: number;
        watchedPercent: number;
        isCompleted: boolean;
        lastWatchedAt: Date | null;
      }>
    >();

    videos.forEach((video) => {
      const progress = progressByVideoId.get(video._id.toString());
      const sectionId = video.sectionId.toString();
      const existing = videosBySectionId.get(sectionId) ?? [];

      existing.push({
        videoId: video._id.toString(),
        title: video.title,
        durationMinutes: video.durationMinutes,
        order: video.order,
        watchedPercent: progress?.watchedPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false,
        lastWatchedAt: progress?.lastWatchedAt ?? null,
      });

      videosBySectionId.set(sectionId, existing);
    });

    return NextResponse.json({
      overallProgressPercent: enrollment.overallProgressPercent ?? 0,
      completedVideoCount: enrollment.completedVideoCount ?? 0,
      totalVideoCount: enrollment.totalVideoCount ?? 0,
      sections: sections.map((section) => {
        const sectionVideos = videosBySectionId.get(section._id.toString()) ?? [];
        const completedInSection = sectionVideos.filter((video) => video.isCompleted).length;
        const sectionProgressPercent =
          sectionVideos.length > 0
            ? Math.round((completedInSection / sectionVideos.length) * 100)
            : 0;

        return {
          sectionId: section._id.toString(),
          sectionTitle: section.title,
          order: section.order,
          sectionProgressPercent,
          videos: sectionVideos,
        };
      }),
    });
  } catch (error) {
    console.error("[GET /api/courses/:id/progress]", error);
    return NextResponse.json(
      { error: "Failed to load course progress." },
      { status: 500 },
    );
  }
}
