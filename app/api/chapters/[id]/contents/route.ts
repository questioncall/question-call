import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import Mux from "@mux/mux-node";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import Chapter from "@/models/Chapter";
import ChapterContent from "@/models/ChapterContent";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "demo",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "demo",
});

// Mirrors the course Mux flow; the `chapter:` prefix lets the shared webhook
// route readiness to ChapterContent.
const CHAPTER_PASSTHROUGH_PREFIX = "chapter:";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid chapter id." }, { status: 400 });
    }

    await connectToDatabase();

    const contents = await ChapterContent.find({ chapterId: id })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ contents });
  } catch (error) {
    console.error("[GET /api/chapters/:id/contents]", error);
    return NextResponse.json(
      { error: "Failed to load chapter contents." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authenticatedUser.role !== "TEACHER" && authenticatedUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only teachers or admins can add content." },
        { status: 403 },
      );
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid chapter id." }, { status: 400 });
    }

    await connectToDatabase();

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }

    if (
      authenticatedUser.role !== "ADMIN" &&
      chapter.instructorId.toString() !== authenticatedUser.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (type !== "VIDEO" && type !== "DOC") {
      return NextResponse.json(
        { error: "type must be VIDEO or DOC." },
        { status: 400 },
      );
    }

    const existingCount = await ChapterContent.countDocuments({ chapterId: id });
    const order = existingCount + 1;

    // ── DOC: file already uploaded to R2 by the client ─────────────────────
    if (type === "DOC") {
      const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";
      const fileKey = typeof body.fileKey === "string" ? body.fileKey.trim() : "";
      const fileName =
        typeof body.fileName === "string" ? body.fileName.trim() : title;
      const fileType = typeof body.fileType === "string" ? body.fileType.trim() : "";
      const fileSizeBytes =
        typeof body.fileSizeBytes === "number" ? body.fileSizeBytes : 0;

      if (!fileUrl) {
        return NextResponse.json(
          { error: "fileUrl is required for a document." },
          { status: 400 },
        );
      }

      const content = await ChapterContent.create({
        chapterId: id,
        type: "DOC",
        title,
        description,
        order,
        status: "READY",
        fileUrl,
        fileKey: fileKey || null,
        fileName,
        fileType: fileType || null,
        fileSizeBytes,
      });

      return NextResponse.json({ content }, { status: 201 });
    }

    // ── VIDEO via external link (Zoom/YouTube/etc.) ────────────────────────
    const externalUrl =
      typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
    if (externalUrl) {
      const content = await ChapterContent.create({
        chapterId: id,
        type: "VIDEO",
        title,
        description,
        order,
        status: "READY",
        videoUrl: externalUrl,
      });

      return NextResponse.json({ content }, { status: 201 });
    }

    // ── VIDEO via Mux direct upload ────────────────────────────────────────
    const contentId = new Types.ObjectId();

    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: `${CHAPTER_PASSTHROUGH_PREFIX}${contentId.toString()}`,
      },
    });

    const content = await ChapterContent.create({
      _id: contentId,
      chapterId: id,
      type: "VIDEO",
      title,
      description,
      order,
      status: "PROCESSING",
      muxUploadId: upload.id,
    });

    return NextResponse.json({ uploadUrl: upload.url, content }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/chapters/:id/contents]", error);
    return NextResponse.json(
      { error: "Failed to add chapter content." },
      { status: 500 },
    );
  }
}
