import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";

import { getAuthenticatedUser } from "@/lib/unified-auth";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * GET /api/chat-upload/video/[uploadId]/status
 *
 * Polls the Mux upload → asset pipeline to get the playback URL once the
 * asset is ready.  Returns { status, playbackUrl }.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { uploadId } = await params;

    const upload = await mux.video.uploads.retrieve(uploadId);

    if (!upload.asset_id) {
      return NextResponse.json({
        status: "waiting",
        playbackUrl: null,
      });
    }

    const asset = await mux.video.assets.retrieve(upload.asset_id);

    if (asset.status === "ready") {
      const playbackId = asset.playback_ids?.[0]?.id;

      if (!playbackId) {
        return NextResponse.json({
          status: "processing",
          playbackUrl: null,
        });
      }

      // Mux playback URL format
      const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
      // Thumbnail for preview
      const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.webp`;

      return NextResponse.json({
        status: "ready",
        playbackUrl,
        playbackId,
        thumbnailUrl,
        duration: asset.duration,
      });
    }

    if (asset.status === "errored") {
      return NextResponse.json({
        status: "errored",
        playbackUrl: null,
      });
    }

    return NextResponse.json({
      status: "processing",
      playbackUrl: null,
    });
  } catch (error) {
    console.error("[GET /api/chat-upload/video/[uploadId]/status]", error);
    return NextResponse.json(
      { error: "Failed to check upload status." },
      { status: 500 },
    );
  }
}
