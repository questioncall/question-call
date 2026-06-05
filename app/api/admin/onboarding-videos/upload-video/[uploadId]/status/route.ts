import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * GET /api/admin/onboarding-videos/upload-video/[uploadId]/status
 *
 * Polls the Mux upload → asset pipeline so the admin onboarding form can wait
 * for the asset to be ready and grab the HLS playback URL. Admin-only.
 * Returns { status, playbackUrl, playbackId, thumbnailUrl, duration }.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      "[GET /api/admin/onboarding-videos/upload-video/[uploadId]/status]",
      error,
    );
    return NextResponse.json(
      { error: "Failed to check upload status." },
      { status: 500 },
    );
  }
}
