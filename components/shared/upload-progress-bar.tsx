"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UploadProgressBarProps = {
  label: string;
  value: number;
  detail?: string;
  className?: string;
};

export function UploadProgressBar({
  label,
  value,
  detail,
  className,
}: UploadProgressBarProps) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("rounded-xl border border-border bg-muted/20 p-3", className)}>
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{safeValue}%</span>
      </div>
      {detail ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
      ) : null}
      <Progress value={safeValue} className="mt-3 h-2 rounded-full bg-muted" />
    </div>
  );
}
