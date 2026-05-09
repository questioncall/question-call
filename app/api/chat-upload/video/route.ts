import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";

import { getAuthenticatedUser } from "@/lib/unified-auth";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

/**
 * POST /api/chat-upload/video
 *
 * Creates a Mux direct-upload URL for chat video messages.
 * The client uploads directly to Mux (bypassing our server), making it
 * dramatically faster than the old flow (client → server → Cloudinary).
 *
 * Returns: { uploadUrl, assetId, playbackId }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as {
      channelId?: string;
      durationSeconds?: number;
    };

    if (!body.channelId) {
      return NextResponse.json(
        { error: "channelId is required" },
        { status: 400 },
      );
    }

    // Create a Mux direct upload — the client PUTs the file directly to Mux
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        // Store channel context so we can trace back if needed
        passthrough: JSON.stringify({
          type: "chat_video",
          channelId: body.channelId,
          userId: user.id,
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
    console.error("[POST /api/chat-upload/video]", error);
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
