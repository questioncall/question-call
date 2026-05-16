"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileTextIcon,
  Loader2Icon,
  Trash2Icon,
  SearchIcon,
  UploadIcon,
  ExternalLinkIcon,
  FileIcon,
  BookOpenIcon,
  ImageIcon,
  PresentationIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UploadNoteDialog } from "@/components/shared/upload-note-dialog";

import { getAdminNotesAction, deleteAdminNoteAction } from "./actions";

// ── Types ────────────────────────────────────────────────────────────────────

type NoteRecord = {
  _id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileType: "PDF" | "DOCX" | "PPT" | "Image";
  fileUrl: string | null;
  visibility: "public" | "private";
  price: number;
  uploaderId: { _id: string; name?: string; username?: string; role?: string } | null;
  createdAt: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const FILE_TYPE_OPTIONS = ["PDF", "DOCX", "PPT", "Image"] as const;

const FILE_TYPE_ICON: Record<string, React.ElementType> = {
  PDF:   FileTextIcon,
  DOCX:  FileIcon,
  PPT:   PresentationIcon,
  Image: ImageIcon,
};

const FILE_TYPE_COLOR: Record<string, string> = {
  PDF:   "text-red-500",
  DOCX:  "text-blue-500",
  PPT:   "text-orange-500",
  Image: "text-green-500",
};

const VISIBILITY_BADGE: Record<string, string> = {
  public:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  private: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

const ROLE_BADGE: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  TEACHER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ADMIN:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

// ── Main client ──────────────────────────────────────────────────────────────

export function NotesClient() {
  const [notes,        setNotes]        = useState<NoteRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NoteRecord | null>(null);
  const [uploadOpen,   setUploadOpen]   = useState(false);

  // Filters
  const [search,     setSearch]     = useState("");
  const [subject,    setSubject]    = useState("");
  const [grade,      setGrade]      = useState("");
  const [fileType,   setFileType]   = useState("all");
  const [visibility, setVisibility] = useState("all");

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminNotesAction(
        search,
        subject,
        grade,
        fileType === "all" ? "" : fileType,
        visibility === "all" ? "" : visibility,
      );
      setNotes(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }, [search, subject, grade, fileType, visibility]);

  useEffect(() => {
    const t = setTimeout(fetchNotes, 400);
    return () => clearTimeout(t);
  }, [fetchNotes]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      await deleteAdminNoteAction(deleteTarget._id);
      toast.success("Note deleted.");
      setNotes((prev) => prev.filter((n) => n._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploaded = () => {
    fetchNotes();
  };

  // Stats
  const total   = notes.length;
  const pub     = notes.filter((n) => n.visibility === "public").length;
  const priv    = notes.filter((n) => n.visibility === "private").length;
  const byType  = FILE_TYPE_OPTIONS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = notes.filter((n) => n.fileType === t).length;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View, search, and manage all platform notes. Upload new notes on behalf of any user.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <UploadIcon className="size-4 mr-2" />
          Upload Note
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",   value: total, color: "text-foreground" },
          { label: "Public",  value: pub,   color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Private", value: priv,  color: "text-neutral-500" },
          ...FILE_TYPE_OPTIONS.map((t) => ({ label: t, value: byType[t] ?? 0, color: FILE_TYPE_COLOR[t] })),
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-3">
            <CardContent className="px-4 py-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input placeholder="Subject…" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Input placeholder="Grade…" value={grade} onChange={(e) => setGrade(e.target.value)} />
            <div className="flex gap-2">
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {FILE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>{total} result{total !== 1 ? "s" : ""}</CardDescription>
          </div>
          {loading && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="p-0">
          {loading && notes.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin mr-2" />
              Loading notes…
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <BookOpenIcon className="size-8 opacity-30" />
              <p className="text-sm">No notes found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject / Grade</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Uploader</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Visibility</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {notes.map((note) => {
                    const Icon = FILE_TYPE_ICON[note.fileType] || FileTextIcon;
                    const uploaderRole = (note.uploaderId as any)?.role as string | undefined;
                    const uploaderName = (note.uploaderId as any)?.name || "Unknown";
                    const uploaderUsername = (note.uploaderId as any)?.username || null;

                    return (
                      <tr key={note._id} className="hover:bg-muted/30 transition-colors">
                        {/* Title */}
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="font-medium truncate">{note.title}</p>
                          {note.description && (
                            <p className="text-xs text-muted-foreground truncate">{note.description}</p>
                          )}
                        </td>

                        {/* Subject / Grade */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p>{note.subject}</p>
                          <p className="text-xs text-muted-foreground">{note.grade}</p>
                        </td>

                        {/* File type */}
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5 ${FILE_TYPE_COLOR[note.fileType]}`}>
                            <Icon className="size-4 shrink-0" />
                            {note.fileType}
                          </span>
                        </td>

                        {/* Uploader */}
                        <td className="px-4 py-3">
                          <p className="font-medium">{uploaderName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {uploaderUsername && (
                              <span className="text-xs text-muted-foreground">@{uploaderUsername}</span>
                            )}
                            {uploaderRole && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[uploaderRole] || ""}`}>
                                {uploaderRole}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Visibility */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${VISIBILITY_BADGE[note.visibility]}`}>
                            {note.visibility}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {note.price > 0 ? (
                            <span className="font-medium">Rs {note.price}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Free</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {note.fileUrl && (
                              <Button variant="ghost" size="icon" className="size-8" asChild>
                                <a href={note.fileUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLinkIcon className="size-3.5" />
                                </a>
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(note)}
                                  disabled={deletingId === note._id}
                                >
                                  {deletingId === note._id
                                    ? <Loader2Icon className="size-3.5 animate-spin" />
                                    : <Trash2Icon className="size-3.5" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete note?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    &ldquo;{deleteTarget?.title}&rdquo; will be permanently removed. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleDelete}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadNoteDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={handleUploaded}
      />
    </div>
  );
}
