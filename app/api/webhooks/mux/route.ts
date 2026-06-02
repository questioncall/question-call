import { NextRequest, NextResponse } from "next/server";
import Mux from "@mux/mux-node";

import { connectToDatabase } from "@/lib/mongodb";
import { finalizeReadyCourseVideo } from "@/lib/course-video-ready";
import { finalizeReadyChapterContent } from "@/lib/chapter-content-ready";
import ChapterContent from "@/models/ChapterContent";
import CourseVideo from "@/models/CourseVideo";

// Chapter video uploads tag their asset passthrough with this prefix so the
// webhook can route readiness to ChapterContent instead of CourseVideo.
const CHAPTER_PASSTHROUGH_PREFIX = "chapter:";

// Webhook signature verification needs the raw body, so force the Node runtime
// (Edge would not give us a stable raw-text body here) and disable caching.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

type MuxAssetEventData = {
  id?: string;
  passthrough?: string;
  duration?: number;
  playback_ids?: { id?: string }[];
};

/**
 * Mux webhook receiver.
 *
 * Configure in the Mux dashboard (Settings → Webhooks) to point at
 * `https://<your-domain>/api/webhooks/mux`, and set `MUX_WEBHOOK_SECRET` to the
 * signing secret Mux shows there. With the secret set we verify every request;
 * without it we still process (with a warning) so the endpoint works before the
 * secret is wired up — set the secret in production.
 *
 * We only act on `video.asset.ready` / `*.errored`; the CourseVideo `_id` is
 * carried in the asset's `passthrough` (set when the upload is created).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.MUX_WEBHOOK_SECRET?.trim();

  let event: { type?: string; data?: MuxAssetEventData };

  if (secret) {
    try {
      event = mux.webhooks.unwrap(rawBody, request.headers, secret) as typeof event;
    } catch (error) {
      console.error("[mux-webhook] signature verification failed", error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn(
      "[mux-webhook] MUX_WEBHOOK_SECRET is not set — processing without signature verification",
    );
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  try {
    const type = event?.type;
    const data = event?.data ?? {};
    const rawPassthrough =
      typeof data.passthrough === "string" && data.passthrough.length > 0
        ? data.passthrough
        : null;

    const isChapter = Boolean(rawPassthrough?.startsWith(CHAPTER_PASSTHROUGH_PREFIX));
    const recordId = isChapter
      ? rawPassthrough!.slice(CHAPTER_PASSTHROUGH_PREFIX.length)
      : rawPassthrough;

    if (type === "video.asset.ready" && recordId && data.id) {
      const asset = {
        assetId: data.id,
        playbackId: data.playback_ids?.[0]?.id ?? null,
        durationSeconds: typeof data.duration === "number" ? data.duration : null,
      };
      if (isChapter) {
        await finalizeReadyChapterContent(recordId, asset);
      } else {
        await finalizeReadyCourseVideo(recordId, asset);
      }
    } else if (
      (type === "video.asset.errored" || type === "video.upload.errored") &&
      recordId
    ) {
      await connectToDatabase();
      if (isChapter) {
        await ChapterContent.updateOne(
          { _id: recordId, status: "PROCESSING" },
          { $set: { status: "ERRORED" } },
        );
      } else {
        await CourseVideo.updateOne(
          { _id: recordId, status: "PROCESSING" },
          { $set: { status: "ERRORED" } },
        );
      }
    }

    // Ack everything (including event types we don't handle) so Mux stops
    // retrying. Genuine processing failures throw below and return 500.
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[mux-webhook] processing error", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
