"use client";

import { useState } from "react";
import { CheckIcon, GlobeIcon, Loader2Icon, LockIcon, TagIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FileType, NoteDetail, Visibility } from "./note-types";
import { FILE_TYPE_CONFIG, FILE_TYPES, GRADES, SUBJECTS } from "./note-types";

export function NoteEditForm({
  note,
  noteId,
  onSaved,
  onCancel,
}: {
  note: NoteDetail;
  noteId: string;
  onSaved: (n: NoteDetail) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description);
  const [subject, setSubject] = useState(note.subject);
  const [grade, setGrade] = useState(note.grade);
  const [fileType, setFileType] = useState<FileType>(note.fileType);
  const [visibility, setVisibility] = useState<Visibility>(note.visibility);
  const [pricingMode, setPricingMode] = useState<"free" | "paid">(note.price > 0 ? "paid" : "free");
  const [price, setPrice] = useState(String(note.price || ""));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title cannot be empty.");
      return;
    }
    if (!subject.trim() || !grade.trim()) {
      toast.error("Subject and grade cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          subject: subject.trim(),
          grade: grade.trim(),
          fileType,
          visibility,
          price: pricingMode === "paid" ? Math.max(0, Number(price) || 0) : 0,
        }),
      });
      if (res.ok) {
        const updated: NoteDetail = await res.json();
        onSaved(updated);
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

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          maxLength={2000}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
        <Input
          list="edit-note-subject-options"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Type or choose subject"
        />
        <datalist id="edit-note-subject-options">
          {SUBJECTS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button key={s} type="button" onClick={() => setSubject(s)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                subject === s ? "border-primary bg-primary text-white" : "border-border bg-background text-muted-foreground hover:border-primary/30"
              )}>{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grade</label>
        <Input
          list="edit-note-grade-options"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="Type or choose grade, class, or level"
        />
        <datalist id="edit-note-grade-options">
          {GRADES.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => (
            <button key={g} type="button" onClick={() => setGrade(g)}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                grade === g ? "border-primary bg-primary text-white" : "border-border bg-background text-muted-foreground hover:border-primary/30"
              )}>{g}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">File Type</label>
        <div className="grid grid-cols-4 gap-2">
          {FILE_TYPES.map((ft) => {
            const ftCfg = FILE_TYPE_CONFIG[ft];
            const Icon = ftCfg.icon;
            return (
              <button key={ft} type="button" onClick={() => setFileType(ft)}
                className={cn("flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all",
                  ft === fileType ? "border-primary/40 bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/20"
                )}>
                <Icon className="size-5" />{ft}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setVisibility("public")}
            className={cn("flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
              visibility === "public" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm" : "border-border bg-background text-muted-foreground"
            )}>
            <GlobeIcon className="size-4" /> Public
          </button>
          <button type="button" onClick={() => setVisibility("private")}
            className={cn("flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
              visibility === "private" ? "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-sm" : "border-border bg-background text-muted-foreground"
            )}>
            <LockIcon className="size-4" /> Private
          </button>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricing</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setPricingMode("free"); setPrice(""); }}
            className={cn("flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
              pricingMode === "free" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm" : "border-border bg-background text-muted-foreground"
            )}>Free</button>
          <button type="button" onClick={() => setPricingMode("paid")}
            className={cn("flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium transition-all",
              pricingMode === "paid" ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm" : "border-border bg-background text-muted-foreground"
            )}>
            <TagIcon className="size-4" /> Paid
          </button>
        </div>
        {pricingMode === "paid" && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm font-semibold text-muted-foreground">Rs.</span>
            <Input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 50" className="max-w-[140px]" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
          {isSaving ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
          Save Changes
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <XIcon className="mr-1.5 size-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}
