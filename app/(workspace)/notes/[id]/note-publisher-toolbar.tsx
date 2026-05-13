"use client";

import { useState } from "react";
import {
  CopyIcon,
  GlobeIcon,
  Loader2Icon,
  LockIcon,
  PencilIcon,
  ShareIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NoteDetail, Visibility } from "./note-types";

export function NotePublisherToolbar({
  note,
  noteId,
  onStartEdit,
  onDelete,
  onUpdated,
}: {
  note: NoteDetail;
  noteId: string;
  onStartEdit: () => void;
  onDelete: () => void;
  onUpdated: (n: NoteDetail) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [priceValue, setPriceValue] = useState(String(note.price || ""));
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [isTogglingVis, setIsTogglingVis] = useState(false);

  const handleToggleVisibility = async () => {
    setIsTogglingVis(true);
    const newVis: Visibility = note.visibility === "public" ? "private" : "public";
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVis }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data);
        toast.success(`Note is now ${newVis}.`);
      } else {
        toast.error("Failed to update visibility.");
      }
    } catch {
      toast.error("Failed to update visibility.");
    } finally {
      setIsTogglingVis(false);
    }
  };

  const handleSavePrice = async () => {
    setIsSavingPrice(true);
    const newPrice = Math.max(0, Number(priceValue) || 0);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: newPrice }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data);
        setShowPriceInput(false);
        toast.success(newPrice > 0 ? `Price set to Rs. ${newPrice}` : "Note is now free.");
      } else {
        toast.error("Failed to update price.");
      }
    } catch {
      toast.error("Failed to update price.");
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    setIsDeleting(true);
    onDelete();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Publisher Actions
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onStartEdit} variant="outline" size="sm" className="gap-1.5 w-full">
          <PencilIcon className="size-3.5" />
          Edit
        </Button>
        <Button onClick={handleCopyLink} variant="outline" size="sm" className="gap-1.5 w-full">
          <CopyIcon className="size-3.5" />
          Copy Link
        </Button>
        <Button
          onClick={handleToggleVisibility}
          variant="outline"
          size="sm"
          disabled={isTogglingVis}
          className={cn(
            "gap-1.5 w-full",
            note.visibility === "public"
              ? "text-orange-600 hover:bg-orange-500/10 hover:text-orange-600 dark:text-orange-400"
              : "text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400"
          )}
        >
          {isTogglingVis ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : note.visibility === "public" ? (
            <LockIcon className="size-3.5" />
          ) : (
            <GlobeIcon className="size-3.5" />
          )}
          {note.visibility === "public" ? "Make Private" : "Make Public"}
        </Button>
        <Button
          onClick={() => { setShowPriceInput(!showPriceInput); setPriceValue(String(note.price || "")); }}
          variant="outline"
          size="sm"
          className="gap-1.5 w-full"
        >
          <TagIcon className="size-3.5" />
          {note.price > 0 ? `Rs. ${note.price}` : "Set Price"}
        </Button>
      </div>

      {showPriceInput && (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-sm font-semibold text-muted-foreground shrink-0">Rs.</span>
          <Input
            type="number"
            min="0"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder="0 = free"
            className="max-w-[120px]"
          />
          <Button size="sm" onClick={handleSavePrice} disabled={isSavingPrice}>
            {isSavingPrice ? <Loader2Icon className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      )}

      <Button
        onClick={handleDeleteClick}
        variant="outline"
        disabled={isDeleting}
        size="sm"
        className="w-full gap-1.5 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400"
      >
        {isDeleting ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
        Delete Note
      </Button>
    </div>
  );
}
