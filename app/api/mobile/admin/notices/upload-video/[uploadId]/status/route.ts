import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";

export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * GET /api/mobile/admin/notices/upload-video/[uploadId]/status
 * Polls the Mux upload → asset pipeline. Mirrors the web status route.
 * Returns { status, playbackUrl, playbackId, thumbnailUrl, duration }.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const { uploadId } = await params;
    const upload = await mux.video.uploads.retrieve(uploadId);

    if (!upload.asset_id) {
      return NextResponse.json({ status: "waiting", playbackUrl: null });
    }

    const asset = await mux.video.assets.retrieve(upload.asset_id);

    if (asset.status === "ready") {
      const playbackId = asset.playback_ids?.[0]?.id;
      if (!playbackId) {
        return NextResponse.json({ status: "processing", playbackUrl: null });
      }
      return NextResponse.json({
        status: "ready",
        playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
        playbackId,
        thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.webp`,
        duration: asset.duration,
      });
    }

    if (asset.status === "errored") {
      return NextResponse.json({ status: "errored", playbackUrl: null });
    }

    return NextResponse.json({ status: "processing", playbackUrl: null });
  } catch (error) {
    console.error(
      "GET /api/mobile/admin/notices/upload-video/[uploadId]/status error:",
      error,
    );
    return NextResponse.json({ error: "Failed to check upload status." }, { status: 500 });
  }
}
