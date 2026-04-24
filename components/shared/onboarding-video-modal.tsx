"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon, PlayCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OnboardingVideo = {
  role: "STUDENT" | "TEACHER" | "ADMIN";
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  isActive: boolean;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId =
        parsed.searchParams.get("v") ||
        parsed.pathname.split("/shorts/")[1]?.split("/")[0] ||
        parsed.pathname.split("/embed/")[1]?.split("/")[0];

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function OnboardingVideoModal() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const [video, setVideo] = useState<OnboardingVideo | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchVideo() {
      try {
        const res = await fetch("/api/onboarding-video");
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as {
          shouldShow?: boolean;
          video?: OnboardingVideo | null;
        };

        if (!mounted) {
          return;
        }

        if (data.shouldShow && data.video) {
          setVideo(data.video);
          setIsOpen(true);
          setSecondsRemaining(5);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void fetchVideo();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || secondsRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isOpen, secondsRemaining]);

  const canClose = secondsRemaining <= 0;
  const youtubeEmbedUrl = useMemo(
    () => (video ? getYouTubeEmbedUrl(video.videoUrl) : null),
    [video],
  );

  const handleClose = async () => {
    if (!canClose || saving) {
      return;
    }

    setSaving(true);
    try {
      await fetch("/api/onboarding-video/dismiss", {
        method: "POST",
      });
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !video) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          void handleClose();
        }
      }}
    >
      <DialogContent
        className="max-w-3xl overflow-hidden p-0"
        showCloseButton={canClose}
        onEscapeKeyDown={(event) => {
          if (!canClose) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (!canClose) {
            event.preventDefault();
          }
        }}
      >
        <div className="border-b border-border bg-muted/30 px-6 py-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {video.role} Onboarding
        </div>

        <div className="space-y-5 p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">{video.title}</DialogTitle>
            <DialogDescription className="text-sm">
              {video.description || "Quick introduction to help you get started."}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            {youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              <video
                controls
                playsInline
                poster={video.thumbnailUrl || undefined}
                className="aspect-video w-full bg-black"
                src={video.videoUrl}
              />
            )}
          </div>

          {!canClose ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <PlayCircleIcon className="size-4" />
              Close button unlocks in {secondsRemaining}s so the user sees the intro first.
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            This intro is only shown once for this role.
          </p>
          <Button onClick={() => void handleClose()} disabled={!canClose || saving}>
            {saving ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
