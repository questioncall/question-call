"use client";

import { useRef, useState } from "react";
import {
  CloudUploadIcon,
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  LockIcon,
  PlusIcon,
  PresentationIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type NoteFileType = "PDF" | "DOCX" | "PPT" | "Image";
export type NoteVisibility = "public" | "private";

export type UploadedNote = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  fileType: NoteFileType;
  fileUrl: string | null;
  visibility: NoteVisibility;
  price: number;
  uploaderId: string | null;
  uploaderName: string;
  uploaderUsername: string | null;
  uploaderImage: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const FILE_TYPE_CONFIG: Record<
  NoteFileType,
  { color: string; icon: typeof FileTextIcon; label: string }
> = {
  PDF:   { color: "text-red-600 dark:text-red-400",    icon: FileTextIcon,     label: "PDF"   },
  DOCX:  { color: "text-blue-600 dark:text-blue-400",  icon: FileIcon,         label: "DOCX"  },
  PPT:   { color: "text-amber-600 dark:text-amber-400",icon: PresentationIcon, label: "PPT"   },
  Image: { color: "text-violet-600 dark:text-violet-400", icon: ImageIcon,     label: "Image" },
};

export const FILE_TYPE_BG: Record<NoteFileType, string> = {
  PDF:   "bg-red-500/10",
  DOCX:  "bg-blue-500/10",
  PPT:   "bg-amber-500/10",
  Image: "bg-violet-500/10",
};

export const SUBJECTS = [
  "Physics", "Biology", "Chemistry", "Mathematics", "English",
  "Computer Science", "Social Studies", "Accountancy", "Other",
];

export const GRADES = [
  "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12", "Bachelor's", "Other",
];

const FILE_TYPES: NoteFileType[] = ["PDF", "DOCX", "PPT", "Image"];

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (note: UploadedNote) => void;
};

export function UploadNoteDialog({ open, onClose, onCreated }: Props) {
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [subject,      setSubject]      = useState(SUBJECTS[0]);
  const [grade,        setGrade]        = useState(GRADES[0]);
  const [fileType,     setFileType]     = useState<NoteFileType>("PDF");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility,   setVisibility]   = useState<NoteVisibility>("public");
  const [pricingMode,  setPricingMode]  = useState<"free" | "paid">("free");
  const [price,        setPrice]        = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle(""); setDescription(""); setSubject(SUBJECTS[0]); setGrade(GRADES[0]);
    setFileType("PDF"); setSelectedFile(null); setVisibility("public");
    setPricingMode("free"); setPrice("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf")                                    setFileType("PDF");
    else if (["doc", "docx"].includes(ext || ""))        setFileType("DOCX");
    else if (["ppt", "pptx"].includes(ext || ""))        setFileType("PPT");
    else if (["jpg","jpeg","png","webp"].includes(ext || "")) setFileType("Image");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    const noteTitle       = title.trim();
    const noteDescription = description.trim();
    const noteSubject     = subject;
    const noteGrade       = grade;
    const noteFileType    = fileType;
    const file            = selectedFile;
    const noteVisibility  = visibility;
    const notePrice       = pricingMode === "paid" ? Math.max(0, Number(price) || 0) : 0;

    resetForm();
    onClose();

    if (file) {
      const { startGeneralUpload } = await import("@/lib/general-upload-manager");
      const isImage = noteFileType === "Image" || file.type.startsWith("image/");

      startGeneralUpload({
        file,
        label: `Note: ${noteTitle}`,
        fileType: isImage ? "image" : "raw",
        folder: "notes",
        onComplete: async (fileUrl) => {
          try {
            const res = await fetch("/api/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: noteTitle, description: noteDescription,
                subject: noteSubject, grade: noteGrade,
                fileType: noteFileType, fileUrl,
                visibility: noteVisibility, price: notePrice,
              }),
            });
            if (res.ok) {
              onCreated(await res.json());
            } else {
              const err = await res.json();
              toast.error(err.error || "Failed to create note.");
            }
          } catch {
            toast.error("Failed to save note after upload.");
          }
        },
        onError: (error) => toast.error(`Upload failed: ${error}`),
      });

      toast.info("Upload started — you can navigate away safely.");
    } else {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: noteTitle, description: noteDescription,
            subject: noteSubject, grade: noteGrade,
            fileType: noteFileType, fileUrl: null,
            visibility: noteVisibility, price: notePrice,
          }),
        });
        if (res.ok) {
          onCreated(await res.json());
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
            Share your study notes with the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 w-full overflow-hidden">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Newton's Laws of Motion" maxLength={200} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the notes…"
              className="min-h-[72px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={2000}
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Subject</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s} type="button" onClick={() => setSubject(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    subject === s
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/30",
                  )}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Grade */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Grade / Class</label>
            <div className="flex flex-wrap gap-2">
              {GRADES.map((g) => (
                <button
                  key={g} type="button" onClick={() => setGrade(g)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    grade === g
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/30",
                  )}
                >{g}</button>
              ))}
            </div>
          </div>

          {/* File Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">File Type</label>
            <div className="grid grid-cols-4 gap-2">
              {FILE_TYPES.map((ft) => {
                const cfg = FILE_TYPE_CONFIG[ft];
                const Icon = cfg.icon;
                return (
                  <button
                    key={ft} type="button" onClick={() => setFileType(ft)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all",
                      ft === fileType
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

          {/* Visibility */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button" onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
                  visibility === "public"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-emerald-500/20",
                )}
              >
                <GlobeIcon className="size-4" /> Public
              </button>
              <button
                type="button" onClick={() => setVisibility("private")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
                  visibility === "private"
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-orange-500/20",
                )}
              >
                <LockIcon className="size-4" /> Private
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {visibility === "public"
                ? "Everyone can discover and view this note."
                : "Only you can see this note. Others cannot access it."}
            </p>
          </div>

          {/* File attachment */}
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" />

          {!selectedFile ? (
            <button
              type="button" onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-5 text-sm text-foreground transition-colors hover:border-primary/30"
            >
              <CloudUploadIcon className="size-5" />
              Tap to attach file
            </button>
          ) : (
            <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 overflow-hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FileIcon className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-foreground/70">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="shrink-0 rounded-full p-1 hover:bg-primary/10 hover:text-primary"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            <PlusIcon className="mr-1.5 size-4" />
            Upload Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
