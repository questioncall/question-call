"use client";

import { useSelector, useDispatch } from "react-redux";
import {
  CheckCircle2Icon,
  Loader2Icon,
  UploadCloudIcon,
  XCircleIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { RootState } from "@/store/store";
import { clearUploadJob } from "@/store/features/upload/upload-slice";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function GlobalUploadProgress() {
  const jobs = useSelector((state: RootState) => state.upload.jobs);
  const dispatch = useDispatch();
  const [collapsed, setCollapsed] = useState(false);

  const jobList = Object.values(jobs);

  const activeCount = jobList.filter(
    (j) => j.status === "UPLOADING" || j.status === "PROCESSING",
  ).length;
  const doneCount = jobList.filter((j) => j.status === "READY").length;
  const errorCount = jobList.filter((j) => j.status === "ERROR").length;

  // ── Prevent page refresh/close while uploads are active ──
  useEffect(() => {
    if (activeCount === 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        "A video upload is still in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [activeCount]);

  if (jobList.length === 0) return null;

  return (
    <div className="fixed bottom-3 right-2 z-[9999] w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 sm:bottom-4 sm:right-4">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-muted/40 cursor-pointer border-b border-border"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {activeCount > 0 ? (
            <Loader2Icon className="size-4 text-blue-500 animate-spin" />
          ) : errorCount > 0 ? (
            <XCircleIcon className="size-4 text-red-500" />
          ) : (
            <CheckCircle2Icon className="size-4 text-emerald-500" />
          )}
          <span>
            {activeCount > 0
              ? `Uploading ${activeCount} video${activeCount !== 1 ? "s" : ""}...`
              : errorCount > 0
                ? `${errorCount} failed`
                : `${doneCount} complete`}
          </span>
        </div>
        {collapsed ? (
          <ChevronUpIcon className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        )}
      </div>

      {/* Job list */}
      {!collapsed && (
        <div className="max-h-60 overflow-y-auto divide-y divide-border">
          {jobList.map((job) => (
            <div key={job.id} className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">
                {job.status === "UPLOADING" && (
                  <UploadCloudIcon className="size-4 text-blue-500" />
                )}
                {job.status === "PROCESSING" && (
                  <Loader2Icon className="size-4 text-amber-500 animate-spin" />
                )}
                {job.status === "READY" && (
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                )}
                {job.status === "ERROR" && (
                  <XCircleIcon className="size-4 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{job.title}</div>
                {job.status === "UPLOADING" && (
                  <div className="mt-1">
                    <Progress value={job.progressPercent} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {job.progressPercent}%
                    </div>
                  </div>
                )}
                {job.status === "PROCESSING" && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Processing...
                  </div>
                )}
                {job.status === "READY" && (
                  <div className="text-xs text-emerald-600 mt-0.5">
                    Ready to play
                  </div>
                )}
                {job.status === "ERROR" && (
                  <div className="text-xs text-red-500 mt-0.5">
                    {job.error || "Failed"}
                  </div>
                )}
              </div>

              {(job.status === "READY" || job.status === "ERROR") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(clearUploadJob(job.id));
                  }}
                >
                  <XIcon className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
