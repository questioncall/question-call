"use client";

import { useEffect, useState } from "react";
import {
  ClapperboardIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
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
import type { OnboardingVideoConfig, OnboardingVideoRole } from "@/lib/onboarding-videos";

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
              <div className="aspect-video bg-muted/40">
                {video?.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post Onboarding Video</DialogTitle>
            <DialogDescription>
              Choose who the video is for, then save the video URL and thumbnail.
            </DialogDescription>
          </DialogHeader>

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
                rows={4}
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
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail URL (optional)</label>
              <Input
                value={editor.thumbnailUrl}
                onChange={(event) =>
                  setEditor((prev) => ({
                    ...prev,
                    thumbnailUrl: event.target.value,
                  }))
                }
                placeholder="https://..."
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
              Save Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
