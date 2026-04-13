"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  LinkIcon,
  Loader2Icon,
  MonitorPlayIcon,
  UploadCloudIcon,
  VideoIcon,
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
import { startGlobalUpload } from "@/lib/upload-manager";

// ── Types ──────────────────────────────────────────────────────────────────

type ContentMethod = "UPLOAD" | "ZOOM_LINK" | "ZOOM_AUTO";

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
  description: string;
  icon: typeof UploadCloudIcon;
  iconColor: string;
  bgColor: string;
}[] = [
  {
    id: "UPLOAD",
    label: "File Upload",
    description: "Upload a video file from your device",
    icon: UploadCloudIcon,
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    id: "ZOOM_LINK",
    label: "Zoom Recording Link",
    description: "Paste a Zoom cloud recording URL",
    icon: LinkIcon,
    iconColor: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    id: "ZOOM_AUTO",
    label: "Auto Zoom Recording",
    description: "Auto-fetch recording via Zoom OAuth",
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

  const [method, setMethod] = useState<ContentMethod>("UPLOAD");
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [zoomLink, setZoomLink] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setMethod("UPLOAD");
      setTitle("");
      setVideoFile(null);
      setZoomLink("");
      setIsWorking(false);
      setSectionId(defaultSectionId || sections[0]?._id || "");
    }
  }, [open, defaultSectionId, sections]);

  // ── File selection handler ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    if (!title.trim()) setTitle(nameWithoutExt);
    setVideoFile(file);
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

      // Delegate to the global upload manager — this keeps the upload alive
      // even if the user navigates away from this page
      startGlobalUpload({
        file: videoFile,
        courseId,
        sectionId,
        title: title.trim(),
        onReady: () => {
          onUploadSuccess?.();
        },
      });

      toast.success(
        "Upload started! Track progress in the bottom-right corner.",
      );
      onOpenChange(false);
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
      toast.info(
        "Zoom OAuth auto-fetch is coming soon. Please use manual link or file upload for now.",
      );
      return;
    }
  };

  // ── Derived ──
  const canSubmit = (() => {
    if (!title.trim() || !sectionId) return false;
    if (method === "UPLOAD" && !videoFile) return false;
    if (method === "ZOOM_LINK" && !zoomLink.trim()) return false;
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
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
                    onClick={() => setMethod(m.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-all ${
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
              onChange={(e) => setSectionId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
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
                        {formatBytes(videoFile.size)} · Click to replace
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

          {/* ── ZOOM_LINK: URL Input ── */}
          {method === "ZOOM_LINK" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Zoom Recording URL
              </Label>
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

          {/* ── ZOOM_AUTO: Coming soon ── */}
          {method === "ZOOM_AUTO" && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/10 p-4 text-center">
              <MonitorPlayIcon className="mx-auto size-8 text-amber-500 mb-2" />
              <h4 className="font-medium text-sm">Coming Soon</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-fetch recordings via Zoom OAuth integration is under
                development. Use &quot;File Upload&quot; or &quot;Zoom Recording
                Link&quot; for now.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isWorking}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 min-w-[120px]"
            onClick={handleSubmit}
            disabled={!canSubmit || isWorking || method === "ZOOM_AUTO"}
          >
            {isWorking ? (
              <>
                <Loader2Icon className="size-4 mr-1.5 animate-spin" />
                Saving...
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
