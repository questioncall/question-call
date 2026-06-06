import { NextResponse } from "next/server";
import Mux from "@mux/mux-node";

import { requireMobileAdmin } from "@/lib/mobile-admin-auth";

export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * POST /api/mobile/admin/notices/upload-video
 * Creates a Mux direct-upload URL for an admin notice video.
 * Mirrors `POST /api/admin/notices/upload-video`. Returns { uploadUrl, uploadId }.
 */
export async function POST(request: Request) {
  const gate = await requireMobileAdmin(request);
  if (!gate.ok) return gate.response;

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: JSON.stringify({ type: "notice_video", userId: gate.userId }),
      },
    });

    return NextResponse.json(
      { uploadUrl: upload.url, uploadId: upload.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/mobile/admin/notices/upload-video error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create video upload URL.",
      },
      { status: 500 },
    );
  }
}
