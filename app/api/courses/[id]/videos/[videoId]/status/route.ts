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
      return NextResponse.json({ error: "Invalid course or video id." }, { status: 400 });
    }

    await connectToDatabase();

    const video = await CourseVideo.findOne({ _id: videoId, courseId: id });
    if (!video) {
        // Extra diagnostic: check if the video exists at all (maybe courseId mismatch)
        const videoAny = await CourseVideo.findById(videoId).select("_id courseId status title").lean();
        if (videoAny) {
          console.warn(
            `[video-status] Video ${videoId} exists but courseId mismatch: ` +
            `requested=${id}, actual=${videoAny.courseId}`,
          );
          return NextResponse.json(
            { error: "Video not found in this course. Course ID mismatch." },
            { status: 404 },
          );
        }
        console.warn(`[video-status] Video ${videoId} does not exist in DB at all.`);
        return NextResponse.json({ error: "Video record not found." }, { status: 404 });
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

    let upload;
    try {
      upload = await mux.video.uploads.retrieve(video.muxUploadId);
    } catch (muxErr: unknown) {
      const muxMessage = muxErr instanceof Error ? muxErr.message : String(muxErr);
      console.error(`[video-status] Mux upload retrieve failed for ${video.muxUploadId}:`, muxMessage);

      // Check for quota / auth errors from Mux
      if (muxMessage.includes("401") || muxMessage.includes("403")) {
        return NextResponse.json(
          { error: "Mux API authentication failed. Check MUX_TOKEN_ID and MUX_TOKEN_SECRET." },
          { status: 502 },
        );
      }
      if (muxMessage.includes("429") || muxMessage.toLowerCase().includes("quota") || muxMessage.toLowerCase().includes("limit")) {
        return NextResponse.json(
          { error: "Mux API rate/quota limit reached. Please try again later." },
          { status: 429 },
        );
      }

      return NextResponse.json(
        { error: `Mux API error: ${muxMessage}` },
        { status: 502 },
      );
    }

    if (upload.status === "errored") {
        await CourseVideo.updateOne({ _id: videoId }, { $set: { status: "ERRORED" } });
        return NextResponse.json({ status: "ERRORED", error: "Mux upload errored." });
    }

    if (upload.status === "asset_created" && upload.asset_id) {
        let asset;
        try {
          asset = await mux.video.assets.retrieve(upload.asset_id);
        } catch (muxErr: unknown) {
          const muxMessage = muxErr instanceof Error ? muxErr.message : String(muxErr);
          console.error(`[video-status] Mux asset retrieve failed for ${upload.asset_id}:`, muxMessage);
          return NextResponse.json(
            { error: `Mux asset lookup failed: ${muxMessage}` },
            { status: 502 },
          );
        }
        
        if (asset.status === "errored") {
            await CourseVideo.updateOne({ _id: videoId }, { $set: { status: "ERRORED" } });
            return NextResponse.json({ status: "ERRORED", error: "Mux asset processing errored." });
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
    const message = error instanceof Error ? error.message : "Failed to fetch video status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
