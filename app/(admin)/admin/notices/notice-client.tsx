"use client";

import { useCallback, useEffect, useState } from "react";
import * as UpChunk from "@mux/upchunk";
import { format } from "date-fns";
import {
  BellIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  Loader2Icon,
  MailIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
  VideoIcon,
  XIcon,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { NoticeVideo } from "@/components/shared/notice-video";
import { cn } from "@/lib/utils";

type Notice = {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  type: "ADVERTISEMENT" | "GENERAL" | "SPECIAL";
  targetAudience: "ALL" | "TEACHER" | "STUDENT" | "SPECIFIC";
  targetEmails: string[];
  isActive: boolean;
  createdAt: string;
};

type NoticeViewer = {
  _id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  userImage: string | null;
};

type NoticeViewersResponse = {
  noticeId: string;
  title: string;
  viewerCount: number;
  viewers: NoticeViewer[];
};

type NoticeViewMode = "list" | "grid";

function getAudienceLabel(audience: Notice["targetAudience"]) {
  switch (audience) {
    case "ALL":
      return "All users";
    case "TEACHER":
      return "Teachers only";
    case "STUDENT":
      return "Students only";
    case "SPECIFIC":
      return "Specific emails";
    default:
      return audience;
  }
}

function getViewerInitials(viewer: Pick<NoticeViewer, "name" | "email">) {
  const label = viewer.name || viewer.email || "U";

  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Upload an image to Cloudinary via /api/upload using XHR so we can report
// real upload progress. Parses the response defensively — on a too-large
// payload an upstream proxy may return a non-JSON body, and we must never
// surface a raw "Unexpected token … is not valid JSON" error to the admin.
async function uploadImageToCloudinary(
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const { status, body } = await new Promise<{ status: number; body: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");
      xhr.withCredentials = true;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.onabort = () => reject(new Error("Upload was cancelled"));

      xhr.send(formData);
    },
  );

  let data: { secure_url?: string; error?: string } | null = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }

  if (status < 200 || status >= 300) {
    if (status === 413 || !data) {
      throw new Error(
        "Upload failed — the image may be too large. Try a smaller file.",
      );
    }
    throw new Error(data.error || "Upload failed");
  }

  const url = data?.secure_url;
  if (!url) {
    throw new Error("Upload did not return a URL");
  }
  return url;
}

// Upload a video to Mux: ask our admin endpoint for a direct-upload URL, push
// the file straight to Mux with UpChunk (resumable + progress), then poll
// until the asset is ready and return its HLS playback URL.
async function uploadVideoToMux(
  file: File,
  callbacks: {
    onProgress: (pct: number) => void;
    onProcessing: () => void;
  },
): Promise<string> {
  const signRes = await fetch("/api/admin/notices/upload-video", {
    method: "POST",
  });

  if (!signRes.ok) {
    const data = (await signRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to prepare video upload.");
  }

  const { uploadUrl, uploadId } = (await signRes.json()) as {
    uploadUrl: string;
    uploadId: string;
  };

  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({
      endpoint: uploadUrl,
      file,
      // 30 MB chunks — resilient for large (multi-GB) uploads.
      chunkSize: 30720,
    });

    upload.on("progress", (event) => {
      onProgressClamp(callbacks.onProgress, event.detail as number);
    });
    upload.on("success", () => resolve());
    upload.on("error", (event) => {
      const detail = event.detail as { message?: string } | undefined;
      reject(new Error(detail?.message || "Video upload failed."));
    });
  });

  callbacks.onProcessing();
  return pollMuxPlaybackUrl(uploadId);
}

function onProgressClamp(onProgress: (pct: number) => void, value: number) {
  onProgress(Math.max(0, Math.min(100, Math.round(value))));
}

async function pollMuxPlaybackUrl(
  uploadId: string,
  maxAttempts = 180,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, attempt < 5 ? 2000 : 5000));

    try {
      const res = await fetch(
        `/api/admin/notices/upload-video/${uploadId}/status`,
      );
      const data = (await res.json()) as {
        status?: string;
        playbackUrl?: string | null;
      };

      if (data.status === "ready" && data.playbackUrl) {
        return data.playbackUrl;
      }

      if (data.status === "errored") {
        throw new Error("Video processing failed on the server.");
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === "Video processing failed on the server."
      ) {
        throw err;
      }
      // Transient network error — keep polling.
    }
  }

  throw new Error("Video processing timed out. Please try again.");
}

export function NoticeClient() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeenDialogOpen, setIsSeenDialogOpen] = useState(false);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [viewerData, setViewerData] = useState<NoticeViewersResponse | null>(null);
  const [viewMode, setViewMode] = useState<NoticeViewMode>("list");

  // Form State
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Notice["type"]>("GENERAL");
  const [targetAudience, setTargetAudience] = useState<Notice["targetAudience"]>("ALL");
  const [targetEmails, setTargetEmails] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // "uploading" = bytes leaving the browser; "processing" = Mux is encoding the
  // asset (we're polling for the playback URL).
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">("uploading");

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-triggers onChange.
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Please choose an image or a video file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadPhase("uploading");
    try {
      if (isVideo) {
        // Videos → Mux direct upload. The file streams straight from the
        // browser to Mux (resumable, chunked via UpChunk), so there's no
        // serverless body-size limit — multi-GB notice videos work fine.
        const url = await uploadVideoToMux(file, {
          onProgress: setUploadProgress,
          onProcessing: () => setUploadPhase("processing"),
        });
        setVideoUrl(url);
        // A fresh video replaces any previously attached image and vice versa
        // is handled below; keep both possible since a notice may carry both.
        toast.success("Video attached");
      } else {
        const url = await uploadImageToCloudinary(file, setUploadProgress);
        setImageUrl(url);
        toast.success("Image attached");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload media");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadPhase("uploading");
    }
  };

  const resetForm = useCallback(() => {
    setTitle("");
    setBody("");
    setType("GENERAL");
    setTargetAudience("ALL");
    setTargetEmails("");
    setSendPush(false);
    setPushMessage("");
    setImageUrl(null);
    setVideoUrl(null);
  }, []);

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notices");
      if (!res.ok) {
        throw new Error("Failed to fetch notices");
      }

      const data = await res.json();
      setNotices(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() && !imageUrl && !videoUrl) {
      toast.error("Add a message, an image, or a video.");
      return;
    }

    setIsSubmitting(true);

    try {
      const emailsArray =
        targetAudience === "SPECIFIC"
          ? targetEmails.split(",").map((email) => email.trim()).filter(Boolean)
          : [];

      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          imageUrl,
          videoUrl,
          type,
          targetAudience,
          targetEmails: emailsArray,
          sendPush,
          pushMessage: sendPush
            ? pushMessage.trim() || body.substring(0, 120) || title
            : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create notice");
      }

      toast.success(sendPush ? "Notice saved & push sent" : "Notice saved");
      fetchNotices();
      setIsCreateOpen(false);
      resetForm();
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice forever?")) return;

    try {
      const res = await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete notice");
      }

      toast.success("Notice deleted");
      fetchNotices();
    } catch {
      toast.error("Failed to delete notice");
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/notices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle notice");
      }

      toast.success(currentStatus ? "Notice deactivated" : "Notice activated");
      fetchNotices();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleViewSeenBy = async (notice: Notice) => {
    setSelectedNotice(notice);
    setViewerData(null);
    setIsSeenDialogOpen(true);
    setIsLoadingViewers(true);

    try {
      const res = await fetch(`/api/admin/notices/${notice._id}/seen`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch notice viewers");
      }

      setViewerData(data);
    } catch {
      toast.error("Failed to load notice viewers");
    } finally {
      setIsLoadingViewers(false);
    }
  };

  const isGridView = viewMode === "grid";

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setViewMode((currentMode) => (currentMode === "list" ? "grid" : "list"))}
          >
            {isGridView ? "Switch to List View" : "Switch to Grid View"}
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[95vh] w-[95vw] max-w-5xl overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create New Notice</DialogTitle>
                  <DialogDescription>
                    This notice will instantly pop up for the targeted users. Users only see it once.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Notice Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="E.g. System Maintenance"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Body Message{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (optional if you attach media)
                      </span>
                    </Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Type the message here..."
                      rows={4}
                    />
                  </div>

                  {/* Media attachment (image or video) */}
                  <div className="space-y-2">
                    <Label>Media (optional)</Label>
                    {imageUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-border/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Notice image preview"
                          className="max-h-64 w-full object-contain bg-muted/30"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8"
                          onClick={() => setImageUrl(null)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    {videoUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-black">
                        <NoticeVideo src={videoUrl} className="max-h-64 w-full" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 z-10"
                          onClick={() => setVideoUrl(null)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        asChild
                      >
                        <label className="cursor-pointer">
                          {isUploading ? (
                            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <UploadIcon className="mr-2 h-4 w-4" />
                          )}
                          {isUploading ? "Uploading…" : "Upload image or video"}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleMediaUpload}
                            disabled={isUploading}
                          />
                        </label>
                      </Button>
                      {!imageUrl && !videoUrl && !isUploading ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <ImageIcon className="h-3.5 w-3.5" />
                          <VideoIcon className="h-3.5 w-3.5" />
                          Attach a banner image or a short video.
                        </span>
                      ) : null}
                    </div>
                    {isUploading ? (
                      <div className="space-y-1.5">
                        <Progress
                          value={uploadPhase === "processing" ? 100 : uploadProgress}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {uploadPhase === "processing"
                            ? "Processing video on Mux… this can take a moment for large files."
                            : `Uploading… ${uploadProgress}%`}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {type === "GENERAL"
                              ? "General"
                              : type === "ADVERTISEMENT"
                                ? "Advertisement"
                                : "Special"}
                            <ChevronDownIcon className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          <DropdownMenuItem onClick={() => setType("GENERAL")}>General</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setType("ADVERTISEMENT")}>Advertisement</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setType("SPECIAL")}>Special</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {getAudienceLabel(targetAudience)}
                            <ChevronDownIcon className="ml-2 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                          <DropdownMenuItem onClick={() => setTargetAudience("ALL")}>All Users</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTargetAudience("TEACHER")}>Teachers Only</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTargetAudience("STUDENT")}>Students Only</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTargetAudience("SPECIFIC")}>Specific Emails</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {targetAudience === "SPECIFIC" ? (
                    <div className="space-y-2">
                      <Label>Specific Emails (comma separated)</Label>
                      <Input
                        value={targetEmails}
                        onChange={(e) => setTargetEmails(e.target.value)}
                        placeholder="user1@example.com, user2@example.com"
                        required
                      />
                    </div>
                  ) : null}

                  {/* Push notification toggle */}
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="send-push"
                        checked={sendPush}
                        onCheckedChange={(val) => setSendPush(Boolean(val))}
                      />
                      <div className="flex items-center gap-2">
                        <BellIcon className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="send-push" className="cursor-pointer font-medium">
                          Also send as push notification
                        </Label>
                      </div>
                    </div>
                    {sendPush && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Push message{" "}
                          <span className="text-muted-foreground/60">
                            (short, leave blank to use notice body)
                          </span>
                        </Label>
                        <Input
                          value={pushMessage}
                          onChange={(e) => setPushMessage(e.target.value)}
                          placeholder={body.substring(0, 80) || "Enter a short push message…"}
                          maxLength={150}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        {sendPush ? "Saving & Sending…" : "Saving…"}
                      </>
                    ) : sendPush ? (
                      <>
                        <BellIcon className="mr-2 h-4 w-4" />
                        Save Notice & Send Push
                      </>
                    ) : (
                      "Save Notice"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Notice queue</CardTitle>
            <CardDescription>
              Newest notices appear first. Use the toggle above to switch between list and grid layouts.
            </CardDescription>
          </CardHeader>
        </Card>

        <div
          className={cn(
            isGridView ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3",
          )}
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading notices...</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices created yet.</p>
          ) : (
            notices.map((notice) => (
              <Card
                key={notice._id}
                className={cn(
                  "border border-border/70 shadow-sm",
                  !notice.isActive && "opacity-60",
                  isGridView && "h-full",
                )}
              >
                <CardContent
                  className={cn(
                    "py-4",
                    isGridView
                      ? "flex h-full flex-col gap-4"
                      : "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{notice.title}</h3>
                      <Badge variant="secondary" className="h-6 px-2 text-[10px] uppercase tracking-wide">
                        {notice.type}
                      </Badge>
                      <Badge
                        variant={notice.isActive ? "default" : "outline"}
                        className="h-6 px-2 text-[10px] uppercase tracking-wide"
                      >
                        {notice.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(notice.createdAt), "MMM d, yyyy 'at' p")}</span>
                      <span className="size-1 rounded-full bg-muted-foreground/50" />
                      <span>Audience: {getAudienceLabel(notice.targetAudience)}</span>
                      {notice.targetAudience === "SPECIFIC" ? (
                        <>
                          <span className="size-1 rounded-full bg-muted-foreground/50" />
                          <span className="inline-flex items-center gap-1">
                            <MailIcon className="h-3.5 w-3.5" />
                            {notice.targetEmails.length} email{notice.targetEmails.length === 1 ? "" : "s"}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {notice.body ? (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {notice.body}
                      </p>
                    ) : null}

                    {notice.imageUrl ? (
                      <div className="overflow-hidden rounded-xl border border-border/70">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={notice.imageUrl}
                          alt={notice.title}
                          className="max-h-72 w-full bg-muted/30 object-contain"
                        />
                      </div>
                    ) : null}

                    {notice.videoUrl ? (
                      <div className="overflow-hidden rounded-xl border border-border/70 bg-black">
                        <NoticeVideo src={notice.videoUrl} className="max-h-72 w-full" />
                      </div>
                    ) : null}

                    {notice.targetAudience === "SPECIFIC" && notice.targetEmails.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {notice.targetEmails.map((email) => (
                          <Badge
                            key={`${notice._id}-${email}`}
                            variant="outline"
                            className="h-auto px-2 py-1 text-[10px] font-normal"
                          >
                            {email}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "flex shrink-0 flex-wrap gap-2",
                      isGridView
                        ? "mt-auto items-center"
                        : "items-center lg:max-w-[260px] lg:justify-end",
                    )}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSeenBy(notice)}
                      disabled={isLoadingViewers && selectedNotice?._id === notice._id}
                    >
                      {isLoadingViewers && selectedNotice?._id === notice._id ? (
                        <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <UsersIcon className="mr-1.5 h-4 w-4" />
                      )}
                      Seen by
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(notice._id, notice.isActive)}
                    >
                      {notice.isActive ? (
                        <>
                          <EyeOffIcon className="mr-1.5 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <EyeIcon className="mr-1.5 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(notice._id)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={isSeenDialogOpen}
        onOpenChange={(open) => {
          setIsSeenDialogOpen(open);
          if (!open) {
            setSelectedNotice(null);
            setViewerData(null);
            setIsLoadingViewers(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notice viewers</DialogTitle>
            <DialogDescription>
              {selectedNotice
                ? `Users who have dismissed "${selectedNotice.title}".`
                : "Users who have dismissed this notice."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {isLoadingViewers ? (
              <div className="flex min-h-32 items-center justify-center rounded-xl border border-border/70 bg-muted/20 text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Loading viewers...
              </div>
            ) : viewerData ? (
              <>
                <div className="text-xs font-medium text-muted-foreground">
                  {viewerData.viewerCount} user{viewerData.viewerCount === 1 ? "" : "s"}{" "}
                  {viewerData.viewerCount === 1 ? "has" : "have"} seen this notice.
                </div>
                {viewerData.viewers.length > 0 ? (
                  viewerData.viewers.map((viewer) => (
                    <div
                      key={viewer._id}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/15 p-3"
                    >
                      {viewer.userImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={viewer.userImage}
                          alt={viewer.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getViewerInitials(viewer)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {viewer.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="h-5 px-2 text-[10px] uppercase tracking-wide"
                          >
                            {viewer.role}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
                        {viewer.username ? (
                          <p className="text-xs text-muted-foreground">@{viewer.username}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                    No users have dismissed this notice yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                Viewer details could not be loaded for this notice.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
