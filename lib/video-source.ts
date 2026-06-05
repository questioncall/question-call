// Onboarding (and other) videos are entered as a free-form URL by an admin.
// A native <video> element can only play direct media streams (mp4/webm/HLS).
// Handing it anything else — a YouTube/Vimeo/Loom link, a Google Drive "view"
// page, or any other web page — fails to play.
//
// So the rule is: only use a <video> element when we are confident the URL is a
// direct media file. Everything else is routed to an <iframe>, which can render
// provider players and arbitrary pages. Mirrors app/lib/video-source.ts.

export type VideoSourceKind =
  | "youtube"
  | "vimeo"
  | "loom"
  | "drive"
  | "file"
  | "webpage"
  // A link we recognise but cannot turn into a single video player (e.g. a
  // YouTube channel/@handle/playlist URL instead of a video URL).
  | "unsupported";

export interface ParsedVideoSource {
  kind: VideoSourceKind;
  /** For "file": the direct media URL for <video>. Otherwise: the URL to load in an <iframe>. */
  url: string;
  /** The original, untouched input. */
  original: string;
  /** true → render in an <iframe>; false → native <video>. */
  isEmbed: boolean;
}

const MEDIA_EXT =
  /\.(mp4|m4v|mov|webm|m3u8|mpd|mkv|avi|flv|3gp|ogv|ogg|mp3|m4a|wav|aac)$/i;

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/i,
    /youtu\.be\/([\w-]{11})/i,
    /youtube\.com\/embed\/([\w-]{11})/i,
    /youtube\.com\/shorts\/([\w-]{11})/i,
    /youtube\.com\/live\/([\w-]{11})/i,
    /youtube\.com\/v\/([\w-]{11})/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] ?? null;
}

function extractLoomId(url: string): string | null {
  const match = url.match(/loom\.com\/(?:share|embed)\/([\w-]+)/i);
  return match?.[1] ?? null;
}

function extractDriveId(url: string): string | null {
  const byPath = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/i);
  if (byPath?.[1]) return byPath[1];
  const byQuery = url.match(
    /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/i,
  );
  return byQuery?.[1] ?? null;
}

function toDropboxDirect(url: string): string | null {
  if (!/dropbox\.com/i.test(url)) return null;
  return url
    .replace(/www\.dropbox\.com/i, "dl.dropboxusercontent.com")
    .replace(/([?&])dl=0/i, "$1raw=1")
    .replace(/([?&])dl=1/i, "$1raw=1");
}

function looksLikeMediaFile(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (MEDIA_EXT.test(path)) return true;
  if (/stream\.mux\.com\//i.test(url)) return true;
  return false;
}

export function parseVideoSource(
  rawUrl: string | null | undefined,
): ParsedVideoSource {
  const original = (rawUrl ?? "").trim();
  if (!original) {
    return { kind: "file", url: "", original, isEmbed: false };
  }

  const youtubeId = extractYouTubeId(original);
  if (youtubeId) {
    return {
      kind: "youtube",
      url: `https://www.youtube.com/embed/${youtubeId}?playsinline=1&rel=0&modestbranding=1`,
      original,
      isEmbed: true,
    };
  }

  const vimeoId = extractVimeoId(original);
  if (vimeoId) {
    return {
      kind: "vimeo",
      url: `https://player.vimeo.com/video/${vimeoId}`,
      original,
      isEmbed: true,
    };
  }

  const loomId = extractLoomId(original);
  if (loomId) {
    return {
      kind: "loom",
      url: `https://www.loom.com/embed/${loomId}`,
      original,
      isEmbed: true,
    };
  }

  const driveId = extractDriveId(original);
  if (driveId) {
    return {
      kind: "drive",
      url: `https://drive.google.com/file/d/${driveId}/preview`,
      original,
      isEmbed: true,
    };
  }

  // A YouTube link that didn't yield a video id is a channel/@handle/playlist/
  // search URL — flag it as unsupported rather than embedding the whole site.
  if (/(?:^|\/\/|\.)(youtube\.com|youtu\.be)\b/i.test(original)) {
    return { kind: "unsupported", url: original, original, isEmbed: false };
  }

  const dropbox = toDropboxDirect(original);
  if (dropbox) {
    return { kind: "file", url: dropbox, original, isEmbed: false };
  }

  if (looksLikeMediaFile(original)) {
    return { kind: "file", url: original, original, isEmbed: false };
  }

  return { kind: "webpage", url: original, original, isEmbed: true };
}

export function isEmbeddedVideoSource(
  rawUrl: string | null | undefined,
): boolean {
  return parseVideoSource(rawUrl).isEmbed;
}
