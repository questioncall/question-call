/**
 * Cloudflare R2 Client
 *
 * S3-compatible client for Cloudflare R2 object storage.
 * Used for documents, PDFs, ZIPs, and other non-media files.
 *
 * Upload flow (presigned):
 *   1. Server generates a time-limited presigned PUT URL
 *   2. Client uploads directly to R2 (bypasses Next.js server)
 *   3. File is accessible via the public R2 URL
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ── R2 S3 Client (lazy-initialized) ─────────────────────────────────────────

let _r2: S3Client | null = null;

function getR2Client(): S3Client {
  if (!_r2) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing R2 env vars. Ensure R2_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are set.",
      );
    }

    _r2 = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _r2;
}

// ── Allowed MIME types for R2 uploads ────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Presentations
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  // Text
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE_STUDENT_BYTES = 100 * 1024 * 1024;  // 100 MB
const MAX_FILE_SIZE_TEACHER_BYTES = 500 * 1024 * 1024;  // 500 MB
const MAX_FILE_SIZE_ADMIN_BYTES   = 1024 * 1024 * 1024; // 1 GB

/** Presigned URL expiry: 10 minutes */
const PRESIGN_EXPIRY_SECONDS = 600;

// ── Helpers ─────────────────────────────────────────────────────────────────

export function isAllowedR2ContentType(contentType: string): boolean {
  return ALLOWED_MIME_TYPES.has(contentType);
}

/**
 * Returns the note upload size cap for the given role.
 * Students: 100 MB · Teachers: 500 MB · Admins: 1 GB.
 */
export function getMaxFileSizeBytesForRole(
  role: "STUDENT" | "TEACHER" | "ADMIN",
): number {
  if (role === "ADMIN") return MAX_FILE_SIZE_ADMIN_BYTES;
  if (role === "TEACHER") return MAX_FILE_SIZE_TEACHER_BYTES;
  return MAX_FILE_SIZE_STUDENT_BYTES;
}

/**
 * Sanitize a filename for use as an object key.
 * Removes special characters, replaces spaces with hyphens.
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 128);
}

/**
 * Generate a unique object key for an upload.
 *
 * Format: {folder}/{timestamp}-{random}-{sanitized_filename}
 */
export function generateObjectKey(
  filename: string,
  folder = "uploads",
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeName = sanitizeFilename(filename);
  return `${folder}/${timestamp}-${random}-${safeName}`;
}

/**
 * Generate a presigned PUT URL for direct browser upload to R2.
 *
 * @param key       - Object key (path in bucket)
 * @param contentType - MIME type of the file
 * @param maxSizeBytes - Optional content-length constraint
 * @returns Presigned PUT URL (valid for PRESIGN_EXPIRY_SECONDS)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  maxSizeBytes?: number,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME environment variable is not set.");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ...(maxSizeBytes ? { ContentLength: maxSizeBytes } : {}),
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: PRESIGN_EXPIRY_SECONDS,
  });
}

/**
 * Construct the public access URL for a stored object.
 */
export function getPublicUrl(key: string): string {
  const publicBase = process.env.R2_PUBLIC_URL!;
  return `${publicBase}/${key}`;
}
