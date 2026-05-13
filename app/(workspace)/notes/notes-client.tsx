"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenIcon,
  CloudUploadIcon,
  FileTextIcon,
  FileIcon,
  GlobeIcon,
  ImageIcon,
  Loader2Icon,
  LockIcon,
  PresentationIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FileType = "PDF" | "DOCX" | "PPT" | "Image";
type Visibility = "public" | "private";

type NoteItem = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileType: FileType;
  fileUrl: string | null;
  visibility: Visibility;
  price: number;
  uploaderId: string | null;
  uploaderName: string;
  uploaderUsername: string | null;
  uploaderImage: string | null;
  createdAt: string;
  updatedAt: string;
};

const FILE_TYPE_CONFIG: Record<
  FileType,
  { color: string; icon: typeof FileTextIcon; label: string }
> = {
  PDF: {
    color: "text-red-600 dark:text-red-400",
    icon: FileTextIcon,
    label: "PDF",
  },
  DOCX: {
    color: "text-blue-600 dark:text-blue-400",
    icon: FileIcon,
    label: "DOCX",
  },
  PPT: {
    color: "text-amber-600 dark:text-amber-400",
    icon: PresentationIcon,
    label: "PPT",
  },
  Image: {
    color: "text-violet-600 dark:text-violet-400",
    icon: ImageIcon,
    label: "Image",
  },
};

const FILE_TYPE_BG: Record<FileType, string> = {
  PDF: "bg-red-500/10",
  DOCX: "bg-blue-500/10",
  PPT: "bg-amber-500/10",
  Image: "bg-violet-500/10",
};

const SUBJECTS = [
  "Physics",
  "Biology",
  "Chemistry",
  "Mathematics",
  "English",
  "Computer Science",
  "Social Studies",
  "Accountancy",
  "Other",
];

const GRADES = [
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Bachelor's",
  "Other",
];

const FILE_TYPES: FileType[] = ["PDF", "DOCX", "PPT", "Image"];

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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function NoteCard({ note }: { note: NoteItem }) {
  const cfg = FILE_TYPE_CONFIG[note.fileType];
  const FileIcon = cfg.icon;

  return (
    <Link
      href={`/notes/${note.id}`}
      className="group block overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md"
    >
      {/* Color accent bar */}
      <div className={cn("h-1.5", FILE_TYPE_BG[note.fileType])} />

      <div className="p-5 space-y-3">
        {/* Title + icon row */}
        <div className="flex items-start gap-3">
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", FILE_TYPE_BG[note.fileType])}>
            <FileIcon className={cn("size-5", cfg.color)} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary line-clamp-2">
              {note.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{note.subject}</span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{note.grade}</span>
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", FILE_TYPE_BG[note.fileType], cfg.color)}>{note.fileType}</span>
              {note.visibility === "private" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                  <LockIcon className="size-2.5" /> Private
                </span>
              )}
            </div>
          </div>
        </div>

        {note.description && (
          <p className="text-sm leading-5 text-muted-foreground line-clamp-2">{note.description}</p>
        )}

        {/* Author row */}
        <div className="flex items-center gap-2.5 pt-1 border-t border-border/40">
          {note.uploaderImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={note.uploaderImage} alt={note.uploaderName} className="size-7 rounded-full border border-border/50 object-cover" />
          ) : (
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {note.uploaderName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{note.uploaderName}</p>
          </div>
          <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(note.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function UploadNoteDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (note: NoteItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[0]);
  const [fileType, setFileType] = useState<FileType>("PDF");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [pricingMode, setPricingMode] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSubject(SUBJECTS[0]);
    setGrade(GRADES[0]);
    setFileType("PDF");
    setSelectedFile(null);
    setVisibility("public");
    setPricingMode("free");
    setPrice("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-set file type based on extension if possible
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf") setFileType("PDF");
      else if (["doc", "docx"].includes(ext || "")) setFileType("DOCX");
      else if (["ppt", "pptx"].includes(ext || "")) setFileType("PPT");
      else if (["jpg", "jpeg", "png", "webp"].includes(ext || ""))
        setFileType("Image");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const noteTitle = title.trim();
    const noteDescription = description.trim();
    const noteSubject = subject;
    const noteGrade = grade;
    const noteFileType = fileType;
    const file = selectedFile;
    const noteVisibility = visibility;
    const notePrice = pricingMode === "paid" ? Math.max(0, Number(price) || 0) : 0;

    // Close dialog immediately — upload runs in background
    resetForm();
    onClose();

    if (file) {
      // Push to the global background upload queue
      const { startGeneralUpload } = await import(
        "@/lib/general-upload-manager"
      );

      const isImage =
        noteFileType === "Image" || file.type.startsWith("image/");

      startGeneralUpload({
        file,
        label: `Note: ${noteTitle}`,
        fileType: isImage ? "image" : "raw",
        folder: "notes",
        onComplete: async (fileUrl) => {
          // Create the note record after file upload completes
          try {
            const res = await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: noteTitle,
                description: noteDescription,
                subject: noteSubject,
                grade: noteGrade,
                fileType: noteFileType,
                fileUrl,
                visibility: noteVisibility,
                price: notePrice,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              onCreated(data as NoteItem);
            } else {
              const err = await res.json();
              toast.error(err.error || "Failed to create note.");
            }
          } catch {
            toast.error("Failed to save note after upload.");
          }
        },
        onError: (error) => {
          toast.error(`Upload failed: ${error}`);
        },
      });

      toast.info("Upload started — you can navigate away safely.");
    } else {
      // No file — create note directly (instant, no queue needed)
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: noteTitle,
            description: noteDescription,
            subject: noteSubject,
            grade: noteGrade,
            fileType: noteFileType,
            fileUrl: null,
            visibility: noteVisibility,
            price: notePrice,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          onCreated(data as NoteItem);
          toast.success("Note created!");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to create note.");
        }
      } catch {
        toast.error("An unexpected error occurred.");
      }
    }
  };


  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-screen overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUploadIcon className="size-5 text-primary" />
            Upload Note
          </DialogTitle>
          <DialogDescription className="text-foreground">
            Share your study notes with the community. All users can upload
            notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 w-full overflow-hidden">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Newton's Laws of Motion"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the notes…"
              className="min-h-[72px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Subject
            </label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    subject === s
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Grade / Class
            </label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    grade === g
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              File Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FILE_TYPES.map((ft) => {
                const cfg = FILE_TYPE_CONFIG[ft];
                const Icon = cfg.icon;
                const isActive = ft === fileType;
                return (
                  <button
                    key={ft}
                    type="button"
                    onClick={() => setFileType(ft)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all",
                      isActive
                        ? "border-primary/40 bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/20 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5" />
                    {ft}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Visibility Toggle ── */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
                  visibility === "public"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-emerald-500/20",
                )}
              >
                <GlobeIcon className="size-4" />
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
                  visibility === "private"
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-orange-500/20",
                )}
              >
                <LockIcon className="size-4" />
                Private
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {visibility === "public"
                ? "Everyone can discover and view this note."
                : "Only you can see this note. Others cannot access it."}
            </p>
          </div>



          {/* File Attachment */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
          />

          {!selectedFile ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-5 text-sm text-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <CloudUploadIcon className="size-5" />
              Tap to attach file
            </button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 overflow-hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FileIcon className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-foreground/70">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="shrink-0 rounded-full p-1 hover:bg-primary/10 hover:text-primary"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            <PlusIcon className="mr-1.5 size-4" />
            Upload Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NotesClient() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchNotes = useCallback(async (cursor?: string) => {
    const isInitial = !cursor;
    if (isInitial) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (res.ok) {
        const data: NoteItem[] = await res.json();
        if (isInitial) {
          setNotes(data);
        } else {
          setNotes((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);
      }
    } catch {
      toast.error("Failed to load notes.");
    } finally {
      if (isInitial) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreated = (note: NoteItem) => {
    setNotes((prev) => [note, ...prev]);
  };

  const filtered = search.trim()
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.subject.toLowerCase().includes(search.toLowerCase()) ||
          n.grade.toLowerCase().includes(search.toLowerCase()) ||
          n.uploaderName.toLowerCase().includes(search.toLowerCase()),
      )
    : notes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            <BookOpenIcon className="mr-2 inline-block size-6 text-primary" />
            Community Notes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and share study notes with everyone.
          </p>
        </div>

        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <CloudUploadIcon className="size-4" />
          Upload Note
        </Button>
      </div>

      {/* Search */}
      <Card className="overflow-hidden border border-border/70 shadow-sm">
        <CardContent className="px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, subject, grade, or uploader…"
              className="pl-10 pr-8"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background p-4 shadow-sm"
            >
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <Card className="border border-dashed border-border/70 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpenIcon className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">
              {notes.length === 0
                ? "No notes yet"
                : "No notes match your search"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {notes.length === 0
                ? "Be the first to share study notes with the community!"
                : "Try a different search term."}
            </p>
            {notes.length === 0 && (
              <Button
                onClick={() => setShowUpload(true)}
                className="mt-6 gap-2"
              >
                <PlusIcon className="size-4" />
                Upload First Note
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !search && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => {
              const lastNote = notes[notes.length - 1];
              if (lastNote) fetchNotes(lastNote.id);
            }}
            disabled={isLoadingMore}
            className="gap-2"
          >
            {isLoadingMore && <Loader2Icon className="size-4 animate-spin" />}
            Load More
          </Button>
        </div>
      )}

      {/* Upload dialog */}
      <UploadNoteDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
