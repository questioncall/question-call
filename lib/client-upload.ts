import axios from "axios";

export type UploadProgressSnapshot = {
  loaded: number;
  total: number | null;
  percent: number;
};

export type CloudinaryDirectUploadSignature = {
  apiKey: string;
  chunkSize: number;
  cloudName: string;
  folder: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
};

export type CloudinaryUploadedVideo = {
  bytes?: number;
  duration: number;
  public_id: string;
  secure_url: string;
};

type UploadProgressHandler = (progress: UploadProgressSnapshot) => void;

type MultipartRequestOptions = {
  onProgress?: UploadProgressHandler;
};

type UploadFileOptions = MultipartRequestOptions & {
  fields?: Record<string, string>;
  url?: string;
};

type ApiErrorShape = {
  error?: string;
  message?: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCloudinaryErrorMessage(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return null;
}

function getRequestErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    return data?.error || data?.message || error.message || "Request failed.";
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export async function postMultipartWithProgress<T>(
  url: string,
  formData: FormData,
  options: MultipartRequestOptions = {},
) {
  try {
    const response = await axios.post<T>(url, formData, {
      withCredentials: true,
      headers: {
        Accept: "application/json",
      },
      onUploadProgress: (event) => {
        const total = typeof event.total === "number" && event.total > 0 ? event.total : null;
        const percent = total ? clampPercent((event.loaded / total) * 100) : 0;
        options.onProgress?.({
          loaded: event.loaded,
          total,
          percent,
        });
      },
    });

    options.onProgress?.({
      loaded: 1,
      total: 1,
      percent: 100,
    });

    return response.data;
  } catch (error) {
    throw new Error(getRequestErrorMessage(error));
  }
}

export async function uploadFileViaServer<T extends { secure_url: string }>(
  file: File,
  options: UploadFileOptions = {},
) {
  const formData = new FormData();
  formData.append("file", file);

  if (options.fields) {
    for (const [key, value] of Object.entries(options.fields)) {
      formData.append(key, value);
    }
  }

  return postMultipartWithProgress<T>(options.url || "/api/upload", formData, {
    onProgress: options.onProgress,
  });
}

function uploadCloudinaryChunk(
  url: string,
  formData: FormData,
  headers: Record<string, string>,
  onProgress?: UploadProgressHandler,
  signal?: AbortSignal,
) {
  return new Promise<CloudinaryUploadedVideo>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", url);

    for (const [key, value] of Object.entries(headers)) {
      request.setRequestHeader(key, value);
    }

    if (signal) {
      const abortUpload = () => request.abort();
      signal.addEventListener("abort", abortUpload, { once: true });
      request.addEventListener(
        "loadend",
        () => signal.removeEventListener("abort", abortUpload),
        { once: true },
      );
    }

    request.upload.onprogress = (event) => {
      const total =
        typeof event.total === "number" && event.total > 0 ? event.total : null;
      const percent = total ? clampPercent((event.loaded / total) * 100) : 0;

      onProgress?.({
        loaded: event.loaded,
        total,
        percent,
      });
    };

    request.onerror = () => {
      reject(new Error("Cloudinary upload failed."));
    };

    request.onabort = () => {
      reject(new Error("Upload cancelled."));
    };

    request.onload = () => {
      let payload: unknown = null;

      try {
        payload = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        payload = null;
      }

      if (request.status >= 200 && request.status < 300 && payload) {
        resolve(payload as CloudinaryUploadedVideo);
        return;
      }

      reject(
        new Error(
          getCloudinaryErrorMessage(payload) ||
            `Cloudinary upload failed with status ${request.status}.`,
        ),
      );
    };

    request.send(formData);
  });
}

export async function uploadVideoToCloudinaryDirect(
  file: File,
  signatureData: CloudinaryDirectUploadSignature,
  options: MultipartRequestOptions = {},
) {
  const totalBytes = file.size;
  const chunkSize = Math.max(5 * 1024 * 1024, signatureData.chunkSize || totalBytes);
  const uploadId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let lastResponse: CloudinaryUploadedVideo | null = null;

  for (let start = 0; start < totalBytes; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalBytes);
    const chunk = file.slice(start, end);
    const formData = new FormData();

    formData.append("file", chunk, file.name);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", String(signatureData.timestamp));
    formData.append("signature", signatureData.signature);
    formData.append("folder", signatureData.folder);

    const response = await uploadCloudinaryChunk(
      signatureData.uploadUrl,
      formData,
      {
        "Content-Range": `bytes ${start}-${end - 1}/${totalBytes}`,
        "X-Unique-Upload-Id": uploadId,
      },
      (progress) => {
        options.onProgress?.({
          loaded: start + progress.loaded,
          total: totalBytes,
          percent: clampPercent(((start + progress.loaded) / totalBytes) * 100),
        });
      },
    );

    lastResponse = response;
  }

  if (!lastResponse?.secure_url || !lastResponse.public_id) {
    throw new Error("Cloudinary upload did not return the uploaded video details.");
  }

  options.onProgress?.({
    loaded: totalBytes,
    total: totalBytes,
    percent: 100,
  });

  return lastResponse;
}

export type VideoCompressOptions = {
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  onProgress?: (percent: number) => void;
};

export async function compressVideo(
  file: File,
  options: VideoCompressOptions = {},
): Promise<File> {
  const {
    maxSizeMB = 64,
    maxWidth = 1280,
    maxHeight = 720,
    onProgress,
  } = options;

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxBytes) return file;

  return new Promise<File>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => {
      cleanup();
      resolve(file);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        cleanup();
        resolve(file);
        return;
      }

      let { videoWidth: w, videoHeight: h } = video;
      const scale = Math.min(1, maxWidth / w, maxHeight / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      // ensure even dimensions for codec compat
      w = w % 2 === 0 ? w : w - 1;
      h = h % 2 === 0 ? h : h - 1;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const targetBitsPerSecond = Math.max(
        500_000,
        Math.floor((maxBytes * 8) / duration * 0.85),
      );

      const stream = canvas.captureStream(30);

      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        // no audio track or unsupported — continue without audio
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: targetBitsPerSecond,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        const compressed = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, ".webm"),
          { type: mimeType, lastModified: Date.now() },
        );
        onProgress?.(100);
        resolve(compressed);
      };

      recorder.onerror = () => {
        cleanup();
        resolve(file);
      };

      recorder.start(1000);

      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, w, h);
        onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        requestAnimationFrame(drawFrame);
      };

      video.onplay = () => drawFrame();

      video.onended = () => {
        recorder.stop();
        stream.getTracks().forEach((t) => t.stop());
      };

      video.currentTime = 0;
      video.play().catch(() => {
        cleanup();
        resolve(file);
      });
    };

    video.src = objectUrl;
  });
}

// ── R2 presigned upload ─────────────────────────────────────────────────────

export type R2UploadResult = {
  url: string;
  key: string;
};

type R2UploadOptions = {
  folder?: string;
  onProgress?: UploadProgressHandler;
  signal?: AbortSignal;
};

/**
 * Upload a file directly to Cloudflare R2 via presigned PUT URL.
 *
 * Flow:
 *   1. POST /api/upload/presign → { uploadUrl, publicUrl, key }
 *   2. PUT file directly to R2 presigned URL (XHR for progress)
 *
 * This bypasses the Next.js server entirely for file transfer.
 */
export async function uploadFileToR2(
  file: File,
  options: R2UploadOptions = {},
): Promise<R2UploadResult> {
  // 1. Get presigned URL from our server
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      fileSize: file.size,
      folder: options.folder,
    }),
  });

  if (!presignRes.ok) {
    const data = (await presignRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(data.error || "Failed to get upload URL.");
  }

  const { uploadUrl, publicUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    publicUrl: string;
    key: string;
  };

  // 2. PUT the file directly to R2
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (options.signal) {
      const abortUpload = () => xhr.abort();
      options.signal.addEventListener("abort", abortUpload, { once: true });
      xhr.addEventListener(
        "loadend",
        () => options.signal!.removeEventListener("abort", abortUpload),
        { once: true },
      );
    }

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        const percent = clampPercent((evt.loaded / evt.total) * 100);
        options.onProgress?.({
          loaded: evt.loaded,
          total: evt.total,
          percent,
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.({ loaded: 1, total: 1, percent: 100 });
        resolve();
      } else {
        reject(new Error(`R2 upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during R2 upload."));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled."));
    });

    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });

  return { url: publicUrl, key: publicUrl.split("/").slice(-1)[0] || "" };
}

export async function getVideoDurationSeconds(file: File) {
  return new Promise<number>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read the selected video's duration."));
        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read the selected video's duration."));
    };

    video.src = objectUrl;
  });
}
