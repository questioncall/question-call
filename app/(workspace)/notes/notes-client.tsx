"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpenIcon,
  CloudUploadIcon,
  FileTextIcon,
  FileIcon,
  ImageIcon,
  Loader2Icon,
  LockIcon,
  PresentationIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  UploadNoteDialog,
  FILE_TYPE_CONFIG,
  FILE_TYPE_BG,
  type NoteFileType as FileType,
  type NoteVisibility as Visibility,
  type UploadedNote,
} from "@/components/shared/upload-note-dialog";

type NoteItem = UploadedNote;

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
