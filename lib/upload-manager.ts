/**
 * Global Upload Manager
 *
 * Manages Mux/UpChunk video uploads outside of any React component lifecycle.
 * Progress and status are dispatched to the Redux store so the
 * GlobalUploadProgress component (or any component) can read them.
 *
 * This means an upload survives page navigation — the teacher can close
 * the manage page, browse around, and the upload keeps going.
 */

import * as UpChunk from "@mux/upchunk";
import { toast } from "sonner";

import type { AppStore } from "@/store/store";
import {
  addUploadJob,
  updateUploadProgress,
  setUploadProcessing,
  completeUpload,
  failUpload,
} from "@/store/features/upload/upload-slice";

let storeRef: AppStore | null = null;

/** Must be called once from a client component that has access to the store. */
export function initUploadManager(store: AppStore) {
  storeRef = store;
}

function getStore(): AppStore {
  if (!storeRef) {
    throw new Error(
      "Upload manager not initialised. Call initUploadManager(store) first.",
    );
  }
  return storeRef;
}

// ── Active upload map (module-level, never destroyed by React) ───────────

const activeUploads = new Map<
  string,
  { abort?: () => void; courseId: string; videoId?: string }
>();

// ── Public API ──────────────────────────────────────────────────────────

export type StartUploadParams = {
  file: File;
  courseId: string;
  sectionId: string;
  title: string;
  /** Called when the video record is created on the server (before upload) */
  onVideoCreated?: (videoId: string) => void;
  /** Called when the video finishes processing and is READY */
  onReady?: () => void;
};

export async function startGlobalUpload({
  file,
  courseId,
  sectionId,
  title,
  onVideoCreated,
  onReady,
}: StartUploadParams) {
  const store = getStore();
  const clientId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Register in Redux
  store.dispatch(
    addUploadJob({ id: clientId, filename: file.name, title }),
  );

  try {
    // 2. Get Mux direct-upload URL from our API
    const res = await fetch(`/api/courses/${courseId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, sectionId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create upload");
    }

    const { uploadUrl, video: serverVideo } = await res.json();
    const videoId: string = serverVideo._id;
    onVideoCreated?.(videoId);

    activeUploads.set(clientId, { courseId, videoId });

    // 3. Direct XMLHttpRequest upload to Mux for flawless finalization
    const xhr = new XMLHttpRequest();

    activeUploads.set(clientId, {
      courseId,
      videoId,
      abort: () => xhr.abort(),
    });

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable) {
        const progress = Math.round((evt.loaded * 100) / evt.total);
        store.dispatch(updateUploadProgress({ id: clientId, progress }));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        store.dispatch(setUploadProcessing(clientId));
        toast.success(`"${title}" uploaded — processing…`);
        pollVideoStatus({ clientId, courseId, videoId, onReady });
      } else {
        const errMsg = `Upload failed with status ${xhr.status}`;
        store.dispatch(failUpload({ id: clientId, error: errMsg }));
        toast.error(errMsg);
        activeUploads.delete(clientId);
      }
    });

    xhr.addEventListener("error", () => {
      store.dispatch(failUpload({ id: clientId, error: "Network error during upload" }));
      toast.error("Upload failed due to a network error.");
      activeUploads.delete(clientId);
    });

    xhr.addEventListener("abort", () => {
      store.dispatch(failUpload({ id: clientId, error: "Upload cancelled" }));
      toast.info(`Upload of "${title}" was cancelled.`);
      activeUploads.delete(clientId);
    });

    // Send the PUT request
    xhr.open("PUT", uploadUrl, true);
    xhr.send(file);
  } catch (err) {
    store.dispatch(
      failUpload({
        id: clientId,
        error: err instanceof Error ? err.message : "Upload failed",
      }),
    );
    toast.error(err instanceof Error ? err.message : "Upload failed");
    activeUploads.delete(clientId);
  }
}

// ── Poll Mux asset status until READY ───────────────────────────────────

function pollVideoStatus({
  clientId,
  courseId,
  videoId,
  onReady,
}: {
  clientId: string;
  courseId: string;
  videoId: string;
  onReady?: () => void;
}) {
  const store = getStore();
  const maxAttempts = 120; // ~10 min at 5s
  let attempts = 0;

  const check = async () => {
    attempts++;
    try {
      const res = await fetch(
        `/api/courses/${courseId}/videos/${videoId}/status`,
      );
      const data = await res.json();

      if (data.status === "READY") {
        store.dispatch(completeUpload(clientId));
        toast.success("Video is ready!");
        activeUploads.delete(clientId);
        onReady?.();
        return;
      }

      if (data.status === "ERRORED") {
        store.dispatch(
          failUpload({ id: clientId, error: "Video processing failed" }),
        );
        toast.error("Video processing failed.");
        activeUploads.delete(clientId);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(check, 5000);
      }
    } catch {
      if (attempts < maxAttempts) {
        setTimeout(check, 5000);
      }
    }
  };

  // First check after a short delay so Mux has time to create the asset
  setTimeout(check, 3000);
}
