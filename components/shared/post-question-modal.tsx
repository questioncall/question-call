"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { Loader2Icon, SparklesIcon, XIcon, ImageIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { uploadFileViaServer } from "@/lib/client-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AnswerFormat,
  CreateQuestionPayload,
  FeedQuestion,
  AnswerVisibility,
} from "@/types/question";
import { prependFeedQuestion } from "@/store/features/feed/feed-slice";
import { useAppDispatch } from "@/store/hooks";

const FORMAT_OPTIONS: { value: AnswerFormat; label: string; desc: string }[] = [
  { value: "ANY", label: "Any Format", desc: "Let the answerer choose" },
  { value: "TEXT", label: "Text", desc: "Written explanation" },
  { value: "PHOTO", label: "Photo", desc: "Photo-based answer" },
  { value: "VIDEO", label: "Video", desc: "Video walkthrough" },
];

const VISIBILITY_OPTIONS: { value: AnswerVisibility; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
];

const SUBJECT_OPTIONS = [
  "IT",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "English",
  "Accountancy",
] as const;

const STREAM_OPTIONS = ["Science", "Management"] as const;
const LEVEL_OPTIONS = ["School level", "Plus 2", "Bachelor"] as const;

type PostQuestionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PostQuestionModal({ open, onOpenChange }: PostQuestionModalProps) {
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat>("ANY");
  const [visibility, setVisibility] = useState<AnswerVisibility>("PUBLIC");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState("");
  const [level, setLevel] = useState("");
  
  // Image attachments
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    value: number;
    detail: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const isTitleValid = titleLen >= 6 && titleLen <= 180;
  const isBodyValid = bodyLen >= 12 && bodyLen <= 5000;
  const canSubmit = isTitleValid && isBodyValid && !isSubmitting;

  useEffect(() => {
    // Cleanup preview URLs on unmount
    return () => {
      pendingImages.forEach((pi) => URL.revokeObjectURL(pi.preview));
    };
  }, [pendingImages]);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAnswerFormat("ANY");
    setVisibility("PUBLIC");
    setSubject("");
    setStream("");
    setLevel("");
    setError(null);
    pendingImages.forEach((pi) => URL.revokeObjectURL(pi.preview));
    setPendingImages([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (pendingImages.length + files.length > 4) {
      toast.error("You can only attach up to 4 images per question.");
      return;
    }

    const newPending = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file), // create local preview
    }));

    setPendingImages((prev) => [...prev, ...newPending]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (indexToRemove: number) => {
    setPendingImages((prev) => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[indexToRemove].preview);
      newArr.splice(indexToRemove, 1);
      return newArr;
    });
  };

  // Upload sequential helper
  const _uploadFiles = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    const totalFiles = pendingImages.length;
    
    for (const [index, pending] of pendingImages.entries()) {
      let fileToUpload = pending.file;
      
      // Compress if eligible
      if (!fileToUpload.type.includes("gif")) {
         try {
           fileToUpload = await imageCompression(fileToUpload, {
             maxSizeMB: 5,
             maxWidthOrHeight: 1920,
             useWebWorker: true,
           });
         } catch (err) {
           console.error("Compression failed:", err);
         }
      }
      
      const data = await uploadFileViaServer<{ secure_url: string }>(fileToUpload, {
        onProgress: ({ percent }) => {
          const overallProgress = ((index + percent / 100) / totalFiles) * 100;
          setUploadProgress({
            value: overallProgress,
            detail: `Uploading image ${index + 1} of ${totalFiles}`,
          });
        },
      });

      uploadedUrls.push(data.secure_url);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(null);

    try {
      // 1. First upload any pending images to Cloudinary
      let uploadedImageUrls: string[] = [];
      if (pendingImages.length > 0) {
        uploadedImageUrls = await _uploadFiles();
      }

      // 2. Submit question text along with Cloudinary URLs
      const payload: CreateQuestionPayload = {
        title: title.trim(),
        body: body.trim(),
        images: uploadedImageUrls,
        answerFormat,
        answerVisibility: visibility,
        ...(subject ? { subject } : {}),
        ...(stream ? { stream } : {}),
        ...(level ? { level } : {}),
      };

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to post question");
      }

      const feedQuestion: FeedQuestion = await res.json();
      dispatch(prependFeedQuestion(feedQuestion));
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            Post a Question
          </DialogTitle>
          <DialogDescription>
            Describe your doubt clearly. You can attach up to 4 images to help teachers understand perfectly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="q-title">
              Title
              <span className="ml-2 text-xs text-muted-foreground">
                {titleLen}/180
              </span>
            </Label>
            <Input
              id="q-title"
              maxLength={180}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Why does current split in a parallel circuit?"
              value={title}
            />
            {titleLen > 0 && !isTitleValid && (
              <p className="text-xs text-destructive">
                Title must be between 6 and 180 characters
              </p>
            )}
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="q-body">
              Details
              <span className="ml-2 text-xs text-muted-foreground">
                {bodyLen}/5000
              </span>
            </Label>
            <Textarea
              className="min-h-32 resize-none"
              id="q-body"
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Explain what you understand so far, what confuses you, and what kind of answer would help…"
              value={body}
            />
            {bodyLen > 0 && !isBodyValid && (
              <p className="text-xs text-destructive">
                Body must be between 12 and 5000 characters
              </p>
            )}
          </div>

          {/* Image Attachments */}
          <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Attached Images ({pendingImages.length}/4)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={pendingImages.length >= 4 || isSubmitting}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-3.5" />
                Add Image
              </Button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />

            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-4 pt-2">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative group rounded-md border border-border overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={img.preview} 
                      alt="pending attachment preview" 
                      className="size-24 object-cover" 
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-8px] translate-y-[8px]"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
                
                {pendingImages.length < 4 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className="size-24 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    <PlusIcon className="size-5" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Add More</span>
                  </button>
                )}
              </div>
            )}

            {isSubmitting && uploadProgress ? (
              <UploadProgressBar
                className="mt-3"
                label="Uploading question images"
                value={uploadProgress.value}
                detail={uploadProgress.detail}
              />
            ) : null}
          </div>

          {/* Configuration Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label>Answer format</Label>
              <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      answerFormat === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                    onClick={() => setAnswerFormat(opt.value)}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <Label>Answer visibility</Label>
              <div className="flex gap-2 h-[calc(100%-28px)]">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                      visibility === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                    onClick={() => setVisibility(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional metadata */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="q-subject">Subject</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                id="q-subject"
                onChange={(e) => setSubject(e.target.value)}
                value={subject}
              >
                <option value="">Any Subject</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="q-stream">Stream</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                id="q-stream"
                onChange={(e) => setStream(e.target.value)}
                value={stream}
              >
                <option value="">Any Stream</option>
                {STREAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="q-level">Level</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50"
                id="q-level"
                onChange={(e) => setLevel(e.target.value)}
                value={level}
              >
                <option value="">Any Level</option>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <XIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 pt-5 mt-2 bg-background sticky bottom-0">
          <Button
            onClick={() => { resetForm(); onOpenChange(false); }}
            variant="ghost"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {isSubmitting && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? "Uploading & Posting..." : "Post Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
