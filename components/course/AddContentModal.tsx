"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  LinkIcon,
  Loader2Icon,
  MonitorPlayIcon,
  UploadCloudIcon,
  VideoIcon,
  XCircleIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

// ── Types ──────────────────────────────────────────────────────────────────

type ContentMethod = "UPLOAD" | "ZOOM_LINK" | "ZOOM_AUTO";

type UploadPhase =
  | "IDLE"
  | "CREATING"      // calling our API to get a Mux upload URL
  | "UPLOADING"     // XHR PUT to Mux
  | "PROCESSING"    // Mux is transcoding
  | "READY"         // done
  | "ERROR";

type AddContentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  sections: Array<{ _id: string; title: string }>;
  defaultSectionId?: string | null;
  onUploadSuccess?: () => void;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

// ── METHOD CARDS CONFIG ────────────────────────────────────────────────────

const METHODS: {
  id: ContentMethod;
  label: string;
  icon: typeof UploadCloudIcon;
  iconColor: string;
  bgColor: string;
}[] = [
  {
    id: "UPLOAD",
    label: "File Upload",
    icon: UploadCloudIcon,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "ZOOM_LINK",
    label: "Zoom Link",
    icon: LinkIcon,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "ZOOM_AUTO",
    label: "Zoom Auto",
    icon: MonitorPlayIcon,
    iconColor: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function AddContentModal({
  open,
  onOpenChange,
  courseId,
  sections,
  defaultSectionId = null,
  onUploadSuccess,
}: AddContentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [method, setMethod] = useState<ContentMethod>("UPLOAD");
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [zoomLink, setZoomLink] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  // ── Upload tracking (local state, no Redux) ──
  const [phase, setPhase] = useState<UploadPhase>("IDLE");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);

  const isBusy = phase === "CREATING" || phase === "UPLOADING" || phase === "PROCESSING";

  // ── Prevent page refresh while uploading ──
  useEffect(() => {
    if (!isBusy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Upload in progress. Leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isBusy]);

  // ── Reset form when dialog opens ──
  useEffect(() => {
    if (open) {
      setMethod("UPLOAD");
      setTitle("");
      setVideoFile(null);
      setZoomLink("");
      setIsWorking(false);
      setSectionId(defaultSectionId || sections[0]?._id || "");
      setPhase("IDLE");
      setProgress(0);
      setStatusText("");
      setVideoId(null);
    }
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [open, defaultSectionId, sections]);

  // ── Block closing while busy ──
  const handleOpenChange = (next: boolean) => {
    if (!next && isBusy) return;
    onOpenChange(next);
  };

  // ── File selection ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    if (!title.trim()) setTitle(nameWithoutExt);
    setVideoFile(file);
  };

  // ── Poll Mux status ──
  const pollStatus = useCallback(
    (cId: string, vId: string, attempt = 0) => {
      if (attempt > 120) {
        setPhase("ERROR");
        setStatusText("Timed out waiting for processing.");
        toast.error("Video processing timed out. Please check the course dashboard and try again.");
        return;
      }

      pollingRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/courses/${cId}/videos/${vId}/status`,
          );

          // Handle non-OK HTTP responses explicitly
          if (!res.ok) {
            let errorMsg = `Server error (${res.status})`;
            try {
              const errData = await res.json();
              if (errData.error) errorMsg = errData.error;
            } catch {
              // ignore JSON parse failure
            }

            // 404 = video record not found — don't keep retrying
            if (res.status === 404) {
              setPhase("ERROR");
              setStatusText(`Video not found: ${errorMsg}`);
              toast.error(`Video processing failed: ${errorMsg}`);
              return;
            }

            // 401/403 = auth issue — don't retry
            if (res.status === 401 || res.status === 403) {
              setPhase("ERROR");
              setStatusText(`Permission denied: ${errorMsg}`);
              toast.error(errorMsg);
              return;
            }

            // 5xx or other transient errors — retry a few times then give up
            if (attempt > 10) {
              setPhase("ERROR");
              setStatusText(`Processing check failed: ${errorMsg}`);
              toast.error(`Video processing check failed after multiple retries: ${errorMsg}`);
              return;
            }

            // Retry on transient errors
            pollStatus(cId, vId, attempt + 1);
            return;
          }

          const data = await res.json();

          if (data.status === "READY") {
            setPhase("READY");
            setStatusText("Video published & ready to play!");
            onUploadSuccess?.();
            return;
          }
          if (data.status === "ERRORED") {
            setPhase("ERROR");
            setStatusText("Mux processing failed.");
            toast.error("Video processing failed on Mux. Please try uploading again.");
            return;
          }
          // Still processing — keep polling
          pollStatus(cId, vId, attempt + 1);
        } catch (err) {
          // Network error — retry with backoff
          if (attempt > 10) {
            setPhase("ERROR");
            const msg = err instanceof Error ? err.message : "Network error";
            setStatusText(`Connection lost: ${msg}`);
            toast.error("Lost connection while checking video processing status.");
            return;
          }
          pollStatus(cId, vId, attempt + 1);
        }
      }, 5000);
    },
    [onUploadSuccess],
  );

  // ── Upload handler (direct XHR, no Redux) ──
  const handleUpload = async () => {
    if (!videoFile) return;

    // Phase 1: Create video record + get Mux upload URL
    setPhase("CREATING");
    setProgress(0);
    setStatusText("Preparing upload…");

    try {
      const res = await fetch(`/api/courses/${courseId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), sectionId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create video");
      }

      const { uploadUrl, video: serverVideo } = await res.json();
      const vId = serverVideo._id as string;
      setVideoId(vId);

      // Phase 2: Upload file to Mux via XHR
      setPhase("UPLOADING");
      setStatusText("Uploading…");

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.upload.addEventListener("progress", (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setProgress(pct);
          setStatusText(`Uploading… ${pct}%`);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Phase 3: Processing
          setPhase("PROCESSING");
          setProgress(100);
          setStatusText("Processing on Mux…");
          toast.success(`"${title.trim()}" uploaded — processing…`);
          pollStatus(courseId, vId);
        } else {
          setPhase("ERROR");
          setStatusText(`Upload failed (HTTP ${xhr.status})`);
        }
      });

      xhr.addEventListener("error", () => {
        setPhase("ERROR");
        setStatusText("Network error during upload.");
      });

      xhr.addEventListener("abort", () => {
        setPhase("ERROR");
        setStatusText("Upload cancelled.");
      });

      xhr.open("PUT", uploadUrl, true);
      xhr.send(videoFile);
    } catch (err) {
      setPhase("ERROR");
      setStatusText(
        err instanceof Error ? err.message : "Upload failed",
      );
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // ── Submit handler ──
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Please enter a video title.");
      return;
    }
    if (!sectionId) {
      toast.error("Please select a section.");
      return;
    }

    if (method === "UPLOAD") {
      if (!videoFile) {
        toast.error("Please select a video file.");
        return;
      }
      handleUpload();
      return;
    }

    if (method === "ZOOM_LINK") {
      if (!zoomLink.trim()) {
        toast.error("Please enter a Zoom recording link.");
        return;
      }
      setIsWorking(true);
      try {
        const res = await fetch(`/api/courses/${courseId}/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            sectionId,
            zoomRecordingUrl: zoomLink.trim(),
            source: "ZOOM_LINK",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to add video");
        }
        toast.success("Zoom recording link saved!");
        onUploadSuccess?.();
        onOpenChange(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save recording link",
        );
      } finally {
        setIsWorking(false);
      }
      return;
    }

    if (method === "ZOOM_AUTO") {
      toast.info("Zoom OAuth auto-fetch is coming soon.");
    }
  };

  // ── Derived ──
  const canSubmit = (() => {
    if (isBusy || phase === "READY") return false;
    if (!title.trim() || !sectionId) return false;
    if (method === "UPLOAD" && !videoFile) return false;
    if (method === "ZOOM_LINK" && !zoomLink.trim()) return false;
    return true;
  })();

  // ── Phase-specific status pill colour ──
  const phaseColor = {
    IDLE: "",
    CREATING: "text-blue-600",
    UPLOADING: "text-blue-600",
    PROCESSING: "text-amber-600",
    READY: "text-emerald-600",
    ERROR: "text-red-600",
  }[phase];

  const phaseIcon = {
    IDLE: null,
    CREATING: <Loader2Icon className="size-4 animate-spin text-blue-500" />,
    UPLOADING: <UploadCloudIcon className="size-4 text-blue-500 animate-pulse" />,
    PROCESSING: <Loader2Icon className="size-4 animate-spin text-amber-500" />,
    READY: <CheckCircle2Icon className="size-4 text-emerald-500" />,
    ERROR: <XCircleIcon className="size-4 text-red-500" />,
  }[phase];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-lg font-semibold">
            Add Video Content
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose how you want to add video content to your course.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* ── Method Picker ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Source
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const isActive = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setMethod(m.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isActive
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bgColor}`}
                    >
                      <m.icon className={`size-4 ${m.iconColor}`} />
                    </div>
                    <span className="text-xs font-medium leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Section Picker ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Section</Label>
            <select
              value={sectionId}
              disabled={isBusy}
              onChange={(e) => setSectionId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
            >
              {sections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* ── Title Input ── */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Video Title</Label>
            <Input
              value={title}
              disabled={isBusy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to React Hooks"
              className="h-10"
              autoFocus
            />
          </div>

          {/* ── UPLOAD: File Picker ── */}
          {method === "UPLOAD" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Video File</Label>
              <div
                onClick={() => {
                  if (!isBusy) fileInputRef.current?.click();
                }}
                className={`relative flex items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
                  isBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                } ${
                  videoFile
                    ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/20"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    videoFile
                      ? "bg-emerald-100 dark:bg-emerald-900/40"
                      : "bg-muted"
                  }`}
                >
                  <VideoIcon
                    className={`size-5 ${
                      videoFile
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {videoFile ? (
                    <>
                      <div className="text-sm font-medium truncate">
                        {videoFile.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(videoFile.size)}
                        {!isBusy && " · Click to replace"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium">
                        Click to select a video file
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        MP4, MOV, WebM, etc.
                      </div>
                    </>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* ── ZOOM_LINK ── */}
          {method === "ZOOM_LINK" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Zoom Recording URL</Label>
              <Input
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/rec/share/..."
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Paste the shareable link to a Zoom cloud recording.
              </p>
            </div>
          )}

          {/* ── ZOOM_AUTO ── */}
          {method === "ZOOM_AUTO" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4 text-center">
              <MonitorPlayIcon className="mx-auto size-8 text-amber-500 mb-2" />
              <h4 className="font-medium text-sm">Coming Soon</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-fetch recordings via Zoom OAuth integration is under
                development.
              </p>
            </div>
          )}
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t border-border px-6 py-4 bg-muted/20 space-y-3">
          {/* ── Progress bar (visible during upload phases) ── */}
          {phase !== "IDLE" && (
            <div className="space-y-1.5">
              {(phase === "UPLOADING" || phase === "CREATING") && (
                <Progress
                  value={phase === "CREATING" ? undefined : progress}
                  className="h-2"
                />
              )}
              {phase === "PROCESSING" && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-amber-500 animate-pulse" />
                </div>
              )}
              <div className={`flex items-center gap-2 text-xs font-medium ${phaseColor}`}>
                {phaseIcon}
                <span>{statusText}</span>
              </div>
            </div>
          )}

          {/* ── Buttons row ── */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              {phase === "READY" || phase === "ERROR" ? "Close" : "Cancel"}
            </Button>

            {phase !== "READY" && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
                onClick={handleSubmit}
                disabled={!canSubmit || isWorking || method === "ZOOM_AUTO"}
              >
                {isWorking ? (
                  <>
                    <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : method === "UPLOAD" ? (
                  <>
                    <UploadCloudIcon className="size-4 mr-1.5" />
                    Upload Video
                  </>
                ) : method === "ZOOM_LINK" ? (
                  <>
                    <LinkIcon className="size-4 mr-1.5" />
                    Save Link
                  </>
                ) : (
                  "Add Content"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
