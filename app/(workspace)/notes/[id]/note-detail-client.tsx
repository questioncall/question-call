"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckIcon,
  CloudUploadIcon,
  DownloadIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  PencilIcon,
  PresentationIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FileType = "PDF" | "DOCX" | "PPT" | "Image";

type NoteDetail = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileType: FileType;
  fileUrl: string | null;
  uploaderId: string | null;
  uploaderName: string;
  uploaderUsername: string | null;
  uploaderImage: string | null;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

const FILE_TYPE_CONFIG: Record<FileType, { color: string; bgColor: string; icon: typeof FileTextIcon; label: string }> = {
  PDF: { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10", icon: FileTextIcon, label: "PDF Document" },
  DOCX: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10", icon: FileIcon, label: "Word Document" },
  PPT: { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10", icon: PresentationIcon, label: "Presentation" },
  Image: { color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10", icon: ImageIcon, label: "Image" },
};

const SUBJECTS = [
  "Physics", "Biology", "Chemistry", "Mathematics", "English",
  "Computer Science", "Social Studies", "Accountancy", "Other",
];

const GRADES = [
  "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
  "Bachelor's", "Other",
];

const FILE_TYPES: FileType[] = ["PDF", "DOCX", "PPT", "Image"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeAgo(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "just now";
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function NoteDetailClient({
  noteId,
}: {
  noteId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editFileType, setEditFileType] = useState<FileType>("PDF");

  const fetchNote = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`);
      if (res.ok) {
        const data: NoteDetail = await res.json();
        setNote(data);
      } else if (res.status === 404) {
        toast.error("Note not found.");
        router.push("/notes");
      }
    } catch {
      toast.error("Failed to load note.");
    } finally {
      setIsLoading(false);
    }
  }, [noteId, router]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const startEditing = () => {
    if (!note) return;
    setEditTitle(note.title);
    setEditDescription(note.description);
    setEditSubject(note.subject);
    setEditGrade(note.grade);
    setEditFileType(note.fileType);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          subject: editSubject,
          grade: editGrade,
          fileType: editFileType,
        }),
      });

      if (res.ok) {
        const updated: NoteDetail = await res.json();
        setNote(updated);
        setIsEditing(false);
        toast.success("Note updated successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update note.");
      }
    } catch {
      toast.error("Failed to update note.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Note deleted.");
        router.push("/notes");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete note.");
      }
    } catch {
      toast.error("Failed to delete note.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <BookOpenIcon className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-foreground">Note not found</p>
        <Button asChild variant="outline">
          <Link href="/notes">Back to Notes</Link>
        </Button>
      </div>
    );
  }

  const cfg = FILE_TYPE_CONFIG[note.fileType];
  const FileTypeIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/notes">
            <ArrowLeftIcon className="size-4" />
            Notes
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main content */}
        <Card className="overflow-hidden border border-border/70 shadow-sm">
          {/* Header banner */}
          <div className={cn("relative h-20", cfg.bgColor)}>
            <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-3">
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-2xl border-2 border-background bg-background shadow-lg",
                  cfg.bgColor
                )}
              >
                <FileTypeIcon className={cn("size-7", cfg.color)} />
              </div>
              <div>
                <span className={cn("text-sm font-semibold", cfg.color)}>
                  {cfg.label}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="space-y-6 pt-6">
            {isEditing ? (
              /* ── Edit mode ─── */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    maxLength={2000}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditSubject(s)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          editSubject === s
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Grade
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setEditGrade(g)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          editGrade === g
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    File Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {FILE_TYPES.map((ft) => {
                      const ftCfg = FILE_TYPE_CONFIG[ft];
                      const Icon = ftCfg.icon;
                      const isActive = ft === editFileType;
                      return (
                        <button
                          key={ft}
                          type="button"
                          onClick={() => setEditFileType(ft)}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all",
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:border-primary/20"
                          )}
                        >
                          <Icon className="size-5" />
                          {ft}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
                    {isSaving ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <CheckIcon className="size-4" />
                    )}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
                    <XIcon className="mr-1.5 size-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Read mode ─── */
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-bold leading-tight text-foreground">
                    {note.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {note.subject}
                    </span>
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {note.grade}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        cfg.bgColor,
                        cfg.color
                      )}
                    >
                      {note.fileType}
                    </span>
                  </div>
                </div>

                {note.description && (
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <p className="text-sm leading-7 text-foreground/90 whitespace-pre-wrap">
                      {note.description}
                    </p>
                  </div>
                )}

                {!note.description && (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-5">
                    <p className="text-sm text-muted-foreground italic">
                      No description provided for this note.
                    </p>
                  </div>
                )}

                {note.fileUrl && (
                  <div className="flex items-center gap-3">
                    <Button asChild variant="outline" className="gap-2">
                      <a href={note.fileUrl} target="_blank" rel="noreferrer">
                        <DownloadIcon className="size-4" />
                        Download File
                      </a>
                    </Button>
                  </div>
                )}

                {!note.fileUrl && (
                  <div className="flex items-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-3">
                    <CloudUploadIcon className="size-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      No file attached yet. File uploads coming soon.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Uploader info */}
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Uploaded by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {note.uploaderImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={note.uploaderImage}
                    alt={note.uploaderName}
                    className="size-10 rounded-full border border-border/60 object-cover"
                  />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {note.uploaderName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {note.uploaderName}
                  </p>
                  {note.uploaderUsername && (
                    <p className="text-xs text-muted-foreground">
                      @{note.uploaderUsername}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium text-foreground">
                  {formatDate(note.createdAt)}
                </span>
              </div>
              {note.updatedAt !== note.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium text-foreground">
                    {formatTimeAgo(note.updatedAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Visibility:</span>
                <span className="font-medium text-foreground">Public</span>
              </div>
            </CardContent>
          </Card>

          {/* Owner actions */}
          {note.isOwner && !isEditing && (
            <Card className="border border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={startEditing}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <PencilIcon className="size-4" />
                  Edit Metadata
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  disabled={isDeleting}
                  className="w-full gap-2 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
                >
                  {isDeleting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Trash2Icon className="size-4" />
                  )}
                  Delete Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
