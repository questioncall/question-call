"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClapperboardIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { OnboardingVideoConfig, OnboardingVideoRole } from "@/lib/onboarding-videos";
import { parseVideoSource } from "@/lib/video-source";
import {
  VideoPreview,
  getVideoSourceStatus,
} from "@/components/shared/video-preview";

const ROLE_OPTIONS: OnboardingVideoRole[] = ["STUDENT", "TEACHER", "ADMIN"];

type EditorState = OnboardingVideoConfig;

function createEmptyEditor(role: OnboardingVideoRole = "STUDENT"): EditorState {
  return {
    role,
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    isActive: true,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function OnboardingVideosClient() {
  const [videos, setVideos] = useState<OnboardingVideoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState>(createEmptyEditor());

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/onboarding-videos");
      if (!res.ok) {
        throw new Error("Failed to fetch onboarding videos");
      }

      const data = (await res.json()) as { videos?: OnboardingVideoConfig[] };
      setVideos(Array.isArray(data.videos) ? data.videos : []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchVideos();
  }, []);

  const persistVideos = async (nextVideos: OnboardingVideoConfig[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/onboarding-videos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: nextVideos }),
      });

      const data = (await res.json()) as {
        error?: string;
        videos?: OnboardingVideoConfig[];
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to save onboarding videos");
      }

      setVideos(Array.isArray(data.videos) ? data.videos : []);
      toast.success("Onboarding videos updated.");
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (role?: OnboardingVideoRole) => {
    const targetRole = role || "STUDENT";
    const existing = videos.find((video) => video.role === targetRole);
    setEditor(existing ? { ...existing } : createEmptyEditor(targetRole));
    setEditorOpen(true);
  };

  const handleSubmit = async () => {
    if (!editor.title.trim() || !editor.videoUrl.trim()) {
      toast.error("Title and video URL are required.");
      return;
    }

    if (parseVideoSource(editor.videoUrl).kind === "unsupported") {
      toast.error(
        "That's a YouTube channel/handle link, not a video. Paste a single video URL (youtu.be/… or youtube.com/watch?v=…).",
      );
      return;
    }

    const nextVideos = [
      ...videos.filter((video) => video.role !== editor.role),
      {
        ...editor,
        title: editor.title.trim(),
        description: editor.description.trim(),
        videoUrl: editor.videoUrl.trim(),
        thumbnailUrl: editor.thumbnailUrl.trim(),
      },
    ].sort(
      (left, right) =>
        ROLE_OPTIONS.indexOf(left.role) - ROLE_OPTIONS.indexOf(right.role),
    );

    const success = await persistVideos(nextVideos);
    if (success) {
      setEditorOpen(false);
    }
  };

  const handleDelete = async (role: OnboardingVideoRole) => {
    const nextVideos = videos.filter((video) => video.role !== role);
    await persistVideos(nextVideos);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const videoStatus = getVideoSourceStatus(editor.videoUrl);
  const canSave =
    Boolean(editor.title.trim()) && Boolean(editor.videoUrl.trim()) && videoStatus.ok;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            <ClapperboardIcon className="mr-2 inline-block size-6 text-primary" />
            Onboarding Videos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the first-time intro video shown once to each role after signup.
          </p>
        </div>
        <Button onClick={() => openEditor("STUDENT")} disabled={saving}>
          <PlusIcon className="mr-2 size-4" />
          Post Video
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {ROLE_OPTIONS.map((role) => {
          const video = videos.find((entry) => entry.role === role);

          return (
            <Card key={role} className="overflow-hidden border-border/70 shadow-sm">
              <div className="aspect-video bg-black">
                {video ? (
                  <VideoPreview
                    url={video.videoUrl}
                    title={video.title}
                    poster={video.thumbnailUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white/70">
                    <ClapperboardIcon className="size-10" />
                  </div>
                )}
              </div>

              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{role}</CardTitle>
                  <Badge variant={video?.isActive ? "default" : "outline"}>
                    {video ? (video.isActive ? "Active" : "Hidden") : "Empty"}
                  </Badge>
                </div>
                <CardDescription>
                  {video
                    ? "Shown once to new users of this role."
                    : "No onboarding video posted for this role yet."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {video ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{video.title}</p>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {video.description || "No description added."}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {video.videoUrl}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Post a video URL and optional thumbnail for this role.
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(role)}
                    disabled={saving}
                  >
                    <PencilIcon className="mr-1.5 size-4" />
                    {video ? "Edit" : "Create"}
                  </Button>
                  {video ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(role)}
                      disabled={saving}
                    >
                      <Trash2Icon className="mr-1.5 size-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Post Onboarding Video</DialogTitle>
            <DialogDescription>
              Paste a link and preview it live before saving. Plays YouTube,
              Vimeo, Loom, Google Drive, or a direct mp4/HLS file.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left: form fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={editor.role}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      role: event.target.value as OnboardingVideoRole,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editor.title}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Getting started on Question Call"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  rows={3}
                  value={editor.description}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explain what this intro helps the user understand."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Video URL</label>
                <Input
                  value={editor.videoUrl}
                  onChange={(event) =>
                    setEditor((prev) => ({ ...prev, videoUrl: event.target.value }))
                  }
                  placeholder="https://youtu.be/… or https://…/intro.mp4"
                />
                {/* Live link status */}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium",
                    videoStatus.ok && !videoStatus.warn
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : videoStatus.warn
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400",
                  )}
                >
                  {videoStatus.ok && !videoStatus.warn ? (
                    <CheckCircle2Icon className="size-4 shrink-0" />
                  ) : videoStatus.warn ? (
                    <AlertTriangleIcon className="size-4 shrink-0" />
                  ) : (
                    <XCircleIcon className="size-4 shrink-0" />
                  )}
                  <span>{videoStatus.label}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Thumbnail URL (optional)
                </label>
                <Input
                  value={editor.thumbnailUrl}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      thumbnailUrl: event.target.value,
                    }))
                  }
                  placeholder="https://… (poster image)"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editor.isActive}
                  onChange={(event) =>
                    setEditor((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Active and eligible to show on first login
              </label>
            </div>

            {/* Right: live preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Live preview</label>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {editor.role}
                </Badge>
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-black">
                <VideoPreview
                  url={editor.videoUrl}
                  title={editor.title}
                  poster={editor.thumbnailUrl}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {editor.title?.trim() || "Untitled video"}
              </p>
              <p className="text-xs text-muted-foreground">
                This is exactly what users see in the onboarding modal.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || !canSave}
            >
              {saving ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
              Save Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
