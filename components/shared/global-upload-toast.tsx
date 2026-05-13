"use client";

import { useEffect, useState } from "react";
import {
  Loader2Icon,
  CheckCircle2Icon,
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
import {
  subscribeToGeneralUploads,
  clearGeneralUploadJob,
  type GeneralUploadJob,
} from "@/lib/general-upload-manager";

const FILE_TYPE_ICONS = {
  image: ImageIcon,
  video: VideoIcon,
  audio: MicIcon,
  raw: FileIcon,
} as const;

// Unified shape so the UI can render both chat & general uploads identically
type UnifiedJob = {
  id: string;
  source: "chat" | "general";
  fileType: "image" | "video" | "audio" | "raw";
  filename: string;
  label?: string;
  progress: number;
  status: string;
  error?: string;
};

function chatJobToUnified(job: ChatUploadJob): UnifiedJob {
  return {
    id: job.id,
    source: "chat",
    fileType: job.fileType,
    filename: job.filename,
    progress: job.progress,
    status: job.status,
    error: job.error,
  };
}

function generalJobToUnified(job: GeneralUploadJob): UnifiedJob {
  return {
    id: job.id,
    source: "general",
    fileType: job.fileType,
    filename: job.filename,
    label: job.label,
    progress: job.progress,
    status: job.status,
    error: job.error,
  };
}

const STATUS_LABELS: Record<string, string> = {
  compressing: "Compressing…",
  uploading: "Uploading…",
  processing: "Processing…",
  saving: "Saving…",
  done: "Done ✓",
  error: "Failed",
};

/**
 * A floating indicator shown at the bottom-right of the screen whenever
 * there are active uploads (chat or general). Survives navigation between pages.
 */
export function GlobalUploadToast() {
  const [chatJobs, setChatJobs] = useState<ChatUploadJob[]>([]);
  const [generalJobs, setGeneralJobs] = useState<GeneralUploadJob[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const unsubChat = subscribeToChatUploads(setChatJobs);
    const unsubGeneral = subscribeToGeneralUploads(setGeneralJobs);
    return () => {
      unsubChat();
      unsubGeneral();
    };
  }, []);

  // Merge both sources into a unified list
  const allJobs: UnifiedJob[] = [
    ...chatJobs.map(chatJobToUnified),
    ...generalJobs.map(generalJobToUnified),
  ];

  // Filter to only show active or recently failed jobs
  const visibleJobs = allJobs.filter((j) => j.status !== "done");
  const hasActive = visibleJobs.some(
    (j) => j.status !== "error",
  );

  if (visibleJobs.length === 0) return null;

  const handleClear = (job: UnifiedJob) => {
    if (job.source === "chat") {
      clearChatUploadJob(job.id);
    } else {
      clearGeneralUploadJob(job.id);
    }
  };

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
                      {job.label || job.filename}
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
                        : STATUS_LABELS[job.status] || job.status}
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
                        handleClear(job);
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
