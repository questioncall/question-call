"use client";

import { useEffect, useState } from "react";
import {
  Loader2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  UploadCloudIcon,
  XIcon,
  ImageIcon,
  VideoIcon,
  MicIcon,
  FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  subscribeToChatUploads,
  clearChatUploadJob,
  type ChatUploadJob,
} from "@/lib/chat-upload-manager";

const FILE_TYPE_ICONS = {
  image: ImageIcon,
  video: VideoIcon,
  audio: MicIcon,
  raw: FileIcon,
} as const;

const STATUS_LABELS: Record<ChatUploadJob["status"], string> = {
  compressing: "Compressing…",
  uploading: "Uploading…",
  processing: "Processing…",
  saving: "Saving…",
  done: "Sent ✓",
  error: "Failed",
};

/**
 * A floating indicator shown at the bottom-right of the screen whenever
 * there are active chat uploads. Survives navigation between pages.
 */
export function GlobalUploadToast() {
  const [jobs, setJobs] = useState<ChatUploadJob[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    return subscribeToChatUploads(setJobs);
  }, []);

  // Filter to only show active or recently completed jobs
  const visibleJobs = jobs.filter((j) => j.status !== "done");
  const hasActive = visibleJobs.some(
    (j) => j.status !== "error",
  );

  if (visibleJobs.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] w-80 overflow-hidden rounded-xl border border-border bg-background shadow-2xl transition-all duration-300",
        isCollapsed && "w-auto",
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2 bg-muted/50 px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
      >
        {hasActive ? (
          <Loader2Icon className="size-3.5 animate-spin text-primary" />
        ) : (
          <UploadCloudIcon className="size-3.5 text-muted-foreground" />
        )}
        <span className="flex-1">
          {hasActive
            ? `Uploading ${visibleJobs.filter((j) => j.status !== "error").length} file${visibleJobs.filter((j) => j.status !== "error").length > 1 ? "s" : ""}…`
            : `${visibleJobs.length} upload${visibleJobs.length > 1 ? "s" : ""}`}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {isCollapsed ? "▲" : "▼"}
        </span>
      </button>

      {/* Jobs list */}
      {!isCollapsed && (
        <div className="max-h-60 divide-y divide-border overflow-y-auto">
          {visibleJobs.map((job) => {
            const FileTypeIcon = FILE_TYPE_ICONS[job.fileType];
            const isError = job.status === "error";
            const isDone = job.status === "done";

            return (
              <div key={job.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <FileTypeIcon
                    className={cn(
                      "size-4 shrink-0",
                      isError
                        ? "text-destructive"
                        : isDone
                          ? "text-green-500"
                          : "text-primary",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {job.filename}
                    </p>
                    <p
                      className={cn(
                        "text-[10px]",
                        isError
                          ? "text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {isError
                        ? job.error || "Upload failed"
                        : STATUS_LABELS[job.status]}
                    </p>
                  </div>

                  {isDone && (
                    <CheckCircle2Icon className="size-4 shrink-0 text-green-500" />
                  )}
                  {isError && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearChatUploadJob(job.id);
                      }}
                      className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <XIcon className="size-3" />
                    </button>
                  )}
                  {!isDone && !isError && (
                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-primary">
                      {job.progress}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {!isDone && !isError && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        job.status === "processing"
                          ? "animate-pulse bg-amber-500"
                          : "bg-primary",
                      )}
                      style={{
                        width: `${Math.max(2, job.progress)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
