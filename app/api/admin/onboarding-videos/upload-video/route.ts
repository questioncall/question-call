import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * POST /api/admin/onboarding-videos/upload-video
 *
 * Creates a Mux direct-upload URL for admin onboarding videos. The admin's
 * browser uploads the file straight to Mux (resumable, chunked via UpChunk), so
 * we bypass the serverless request-body limit. Mirrors the notices uploader but
 * tags the asset as an onboarding video. Admin-only.
 *
 * Returns: { uploadUrl, uploadId }
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: JSON.stringify({
          type: "onboarding_video",
          userId: session.user.id,
        }),
      },
    });

    return NextResponse.json(
      {
        uploadUrl: upload.url,
        uploadId: upload.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/onboarding-videos/upload-video]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create video upload URL.",
      },
      { status: 500 },
    );
  }
}
