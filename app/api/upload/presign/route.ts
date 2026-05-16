import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/unified-auth";
import {
  isAllowedR2ContentType,
  getMaxFileSizeBytesForRole,
  generateObjectKey,
  getPresignedUploadUrl,
  getPublicUrl,
} from "@/lib/r2";

type PresignRequestBody = {
  filename?: string;
  contentType?: string;
  fileSize?: number;
  folder?: string;
};

/**
 * POST /api/upload/presign
 *
 * Generates a presigned PUT URL for direct browser-to-R2 upload.
 * This keeps large files (PDFs, ZIPs, docs) off the Next.js server entirely.
 *
 * Security:
 *  - Requires authentication (session or bearer token)
 *  - Validates MIME type against allowlist
 *  - Enforces max file size server-side
 *  - Generates unique keys to prevent overwrites
 *
 * Body: { filename, contentType, fileSize?, folder? }
 * Returns: { uploadUrl, publicUrl, key }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as PresignRequestBody;

    const { filename, contentType, fileSize, folder } = body;

    // ── Validate required fields ──────────────────────────────────────────

    if (!filename || typeof filename !== "string" || !filename.trim()) {
      return NextResponse.json(
        { error: "filename is required." },
        { status: 400 },
      );
    }

    if (!contentType || typeof contentType !== "string") {
      return NextResponse.json(
        { error: "contentType is required." },
        { status: 400 },
      );
    }

    // ── Validate MIME type ────────────────────────────────────────────────

    if (!isAllowedR2ContentType(contentType)) {
      return NextResponse.json(
        {
          error:
            "File type not allowed. Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, ZIP, RAR, 7Z, TXT, CSV.",
        },
        { status: 400 },
      );
    }

    // ── Validate file size ────────────────────────────────────────────────

    const maxBytes = getMaxFileSizeBytesForRole(user.role);

    if (
      typeof fileSize === "number" &&
      Number.isFinite(fileSize) &&
      fileSize > maxBytes
    ) {
      const maxMB = Math.round(maxBytes / (1024 * 1024));
      return NextResponse.json(
        { error: `File size exceeds the ${maxMB} MB limit.` },
        { status: 400 },
      );
    }

    // ── Generate key & presigned URL ──────────────────────────────────────

    const uploadFolder =
      typeof folder === "string" && folder.trim()
        ? folder.trim().replace(/^\/+|\/+$/g, "")
        : "documents";

    const key = generateObjectKey(filename.trim(), uploadFolder);
    const uploadUrl = await getPresignedUploadUrl(key, contentType);
    const publicUrl = getPublicUrl(key);

    return NextResponse.json(
      {
        uploadUrl,
        publicUrl,
        key,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST /api/upload/presign]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate upload URL.",
      },
      { status: 500 },
    );
  }
}
