import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Mux from "@mux/mux-node";

import { finalizeReadyChapterContent } from "@/lib/chapter-content-ready";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import ChapterContent from "@/models/ChapterContent";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, contentId } = await params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(contentId)) {
      return NextResponse.json(
        { error: "Invalid chapter or content id." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const content = await ChapterContent.findOne({ _id: contentId, chapterId: id });
    if (!content) {
      return NextResponse.json({ error: "Content record not found." }, { status: 404 });
    }

    if (content.type !== "VIDEO") {
      return NextResponse.json({ status: "READY", content });
    }
    if (content.status === "READY") {
      return NextResponse.json({ status: "READY", content });
    }
    if (content.status === "ERRORED") {
      return NextResponse.json({ status: "ERRORED", content });
    }
    if (!content.muxUploadId) {
      return NextResponse.json({ status: "PROCESSING", content });
    }

    let upload;
    try {
      upload = await mux.video.uploads.retrieve(content.muxUploadId);
    } catch (muxErr: unknown) {
      const muxMessage = muxErr instanceof Error ? muxErr.message : String(muxErr);
      console.error(
        `[chapter-content-status] Mux upload retrieve failed for ${content.muxUploadId}:`,
        muxMessage,
      );
      return NextResponse.json({ error: `Mux API error: ${muxMessage}` }, { status: 502 });
    }

    if (upload.status === "errored") {
      await ChapterContent.updateOne(
        { _id: contentId },
        { $set: { status: "ERRORED" } },
      );
      return NextResponse.json({ status: "ERRORED", error: "Mux upload errored." });
    }

    if (upload.status === "asset_created" && upload.asset_id) {
      let asset;
      try {
        asset = await mux.video.assets.retrieve(upload.asset_id);
      } catch (muxErr: unknown) {
        const muxMessage = muxErr instanceof Error ? muxErr.message : String(muxErr);
        return NextResponse.json(
          { error: `Mux asset lookup failed: ${muxMessage}` },
          { status: 502 },
        );
      }

      if (asset.status === "errored") {
        await ChapterContent.updateOne(
          { _id: contentId },
          { $set: { status: "ERRORED" } },
        );
        return NextResponse.json({
          status: "ERRORED",
          error: "Mux asset processing errored.",
        });
      }

      if (asset.status === "ready") {
        const updated = await finalizeReadyChapterContent(contentId, {
          assetId: asset.id,
          playbackId: asset.playback_ids?.[0]?.id ?? null,
          durationSeconds: asset.duration ?? null,
        });
        return NextResponse.json({ status: "READY", content: updated || content });
      }
    }

    return NextResponse.json({ status: "PROCESSING", content });
  } catch (error) {
    console.error("[GET /api/chapters/:id/contents/:contentId/status]", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch content status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
