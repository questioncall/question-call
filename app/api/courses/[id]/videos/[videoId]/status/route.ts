import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Mux from "@mux/mux-node";

import { getSafeServerSession } from "@/lib/auth";
import { incrementEnrollmentVideoTotals } from "@/lib/course-progress";
import { connectToDatabase } from "@/lib/mongodb";
import Course from "@/models/Course";
import CourseSection from "@/models/CourseSection";
import CourseVideo from "@/models/CourseVideo";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

function minutesFromSeconds(seconds: number) {
  return Math.round((seconds / 60) * 100) / 100;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; videoId: string }> },
) {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, videoId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(videoId)) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    await connectToDatabase();

    const video = await CourseVideo.findOne({ _id: videoId, courseId: id });
    if (!video) {
        return NextResponse.json({ error: "Video not found." }, { status: 404 });
    }

    if (video.status === "READY") {
        return NextResponse.json({ status: "READY", video });
    }
    if (video.status === "ERRORED") {
        return NextResponse.json({ status: "ERRORED", video });
    }

    if (!video.muxUploadId) {
        return NextResponse.json({ status: "PROCESSING", video });
    }

    const upload = await mux.video.uploads.retrieve(video.muxUploadId);

    if (upload.status === "errored") {
        await CourseVideo.updateOne({ _id: videoId }, { $set: { status: "ERRORED" } });
        return NextResponse.json({ status: "ERRORED" });
    }

    if (upload.status === "asset_created" && upload.asset_id) {
        const asset = await mux.video.assets.retrieve(upload.asset_id);
        
        if (asset.status === "errored") {
            await CourseVideo.updateOne({ _id: videoId }, { $set: { status: "ERRORED" } });
            return NextResponse.json({ status: "ERRORED" });
        }

        if (asset.status === "ready") {
            const durationMinutes = asset.duration ? minutesFromSeconds(asset.duration) : 0;
            
            const updatedVideo = await CourseVideo.findOneAndUpdate(
                { _id: videoId, status: "PROCESSING" },
                { 
                    $set: { 
                        status: "READY",
                        muxAssetId: asset.id,
                        muxPlaybackId: asset.playback_ids?.[0]?.id,
                        durationMinutes,
                    }
                },
                { new: true }
            );

            if (updatedVideo) {
                const section = await CourseSection.findById(video.sectionId);
                if (section) {
                    section.totalVideos = (section.totalVideos ?? 0) + 1;
                    section.totalDurationMinutes = (section.totalDurationMinutes ?? 0) + durationMinutes;
                    await section.save();
                }

                const course = await Course.findById(id);
                if (course) {
                    course.totalDurationMinutes = (course.totalDurationMinutes ?? 0) + durationMinutes;
                    await course.save();
                }

                await incrementEnrollmentVideoTotals(id, 1);
            }

            return NextResponse.json({ status: "READY", video: updatedVideo || video });
        }
    }

    return NextResponse.json({ status: "PROCESSING", video });

  } catch (error) {
    console.error("[GET /api/courses/:id/videos/:videoId/status]", error);
    return NextResponse.json({ error: "Failed to fetch video status." }, { status: 500 });
  }
}
