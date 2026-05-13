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

// ── R2 S3 Client ────────────────────────────────────────────────────────────

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

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

/** Max file size: 100 MB */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** Presigned URL expiry: 10 minutes */
const PRESIGN_EXPIRY_SECONDS = 600;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate that a content type is allowed for R2 uploads.
 */
export function isAllowedR2ContentType(contentType: string): boolean {
  return ALLOWED_MIME_TYPES.has(contentType);
}

/**
 * Get the maximum file size in bytes.
 */
export function getMaxFileSizeBytes(): number {
  return MAX_FILE_SIZE_BYTES;
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
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
    ...(maxSizeBytes ? { ContentLength: maxSizeBytes } : {}),
  });

  return getSignedUrl(r2, command, {
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
