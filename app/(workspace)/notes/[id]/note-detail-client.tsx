"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, BookOpenIcon, GlobeIcon, LockIcon, TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { NoteDetail } from "./note-types";
import { FILE_TYPE_CONFIG } from "./note-types";
import { NoteDocumentViewer } from "./note-document-viewer";
import { NoteEditForm } from "./note-edit-form";
import { NotePublisherToolbar } from "./note-publisher-toolbar";
import { NoteSidebar } from "./note-sidebar";

export function NoteDetailClient({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const fetchNote = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`);
      if (res.ok) setNote(await res.json());
      else if (res.status === 404) { toast.error("Note not found."); router.push("/notes"); }
      else if (res.status === 403) { toast.error("This note is private."); router.push("/notes"); }
    } catch { toast.error("Failed to load note."); }
    finally { setIsLoading(false); }
  }, [noteId, router]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Note deleted."); router.push("/notes"); }
      else { const err = await res.json(); toast.error(err.error || "Failed to delete note."); }
    } catch { toast.error("Failed to delete note."); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Skeleton className="h-[70vh] w-full rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <BookOpenIcon className="size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-foreground">Note not found</p>
        <Button asChild variant="outline"><Link href="/notes">Back to Notes</Link></Button>
      </div>
    );
  }

  const cfg = FILE_TYPE_CONFIG[note.fileType];
  const FileTypeIcon = cfg.icon;

  return (
    <div className="space-y-5">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="gap-1.5">
        <Link href="/notes"><ArrowLeftIcon className="size-4" />Notes</Link>
      </Button>

      {/* Layout: LEFT = full document viewer, RIGHT = details + author */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* ─── LEFT: Document viewer (full width & height) ─── */}
        <div className="min-h-[70vh]">
          {isEditing ? (
            <Card className="border border-border/70 shadow-sm">
              <CardContent className="p-6">
                <NoteEditForm
                  note={note}
                  noteId={noteId}
                  onSaved={(updated) => { setNote(updated); setIsEditing(false); }}
                  onCancel={() => setIsEditing(false)}
                />
              </CardContent>
            </Card>
          ) : (
            <NoteDocumentViewer note={note} />
          )}
        </div>

        {/* ─── RIGHT: Note details on top, author below ─── */}
        <div className="space-y-4">
          {/* Note info card */}
          <Card className="overflow-hidden border border-border/70 shadow-sm">
            {/* Color banner */}
            <div className={cn("relative h-16", cfg.bgColor)}>
              <div className="absolute inset-0 bg-gradient-to-r from-background/20 to-transparent" />
              <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
                <div className={cn("flex size-10 items-center justify-center rounded-xl border-2 border-background bg-background shadow", cfg.bgColor)}>
                  <FileTypeIcon className={cn("size-5", cfg.color)} />
                </div>
                <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
              </div>
              {/* Badges */}
              <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                  note.visibility === "private"
                    ? "bg-orange-500/20 text-orange-700 dark:text-orange-300"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                )}>
                  {note.visibility === "private" ? <LockIcon className="size-2.5" /> : <GlobeIcon className="size-2.5" />}
                  {note.visibility === "private" ? "Private" : "Public"}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
                  note.price > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                )}>
                  <TagIcon className="size-2.5" />
                  {note.price > 0 ? `Rs. ${note.price}` : "Free"}
                </span>
              </div>
            </div>

            <CardContent className="space-y-3 p-4">
              <h1 className="text-lg font-bold leading-tight text-foreground">{note.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{note.subject}</span>
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{note.grade}</span>
              </div>
              {note.description ? (
                <p className="text-sm leading-6 text-foreground/80 whitespace-pre-wrap">{note.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description provided.</p>
              )}
            </CardContent>
          </Card>

          {/* Publisher toolbar (owner only) */}
          {note.isOwner && !isEditing && (
            <NotePublisherToolbar
              note={note}
              noteId={noteId}
              onStartEdit={() => setIsEditing(true)}
              onDelete={handleDelete}
              onUpdated={setNote}
            />
          )}

          {/* Author + details sidebar */}
          <NoteSidebar note={note} />
        </div>
      </div>
    </div>
  );
}
