"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import {
  CameraIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
  ImageIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { uploadFileViaServer } from "@/lib/client-upload";
import {
  buildAnswerFormatFromSelection,
  toggleSelectableAnswerFormat,
} from "@/lib/question-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  SelectableAnswerFormat,
  CreateQuestionPayload,
  FeedQuestion,
  AnswerVisibility,
} from "@/types/question";
import { prependFeedQuestion } from "@/store/features/feed/feed-slice";
import { useAppDispatch } from "@/store/hooks";

const FORMAT_OPTIONS: {
  value: SelectableAnswerFormat;
  label: string;
  desc: string;
}[] = [
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
  const [selectedFormats, setSelectedFormats] = useState<SelectableAnswerFormat[]>(["ANY"]);
  const [visibility, setVisibility] = useState<AnswerVisibility>("PUBLIC");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState("");
  const [level, setLevel] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOpeningCamera, setIsOpeningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Image attachments
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    value: number;
    detail: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const pendingImagesRef = useRef<{ file: File; preview: string }[]>([]);

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const answerFormat = buildAnswerFormatFromSelection(selectedFormats);
  const isTitleValid = titleLen >= 6 && titleLen <= 180;
  const isBodyValid = bodyLen >= 12 && bodyLen <= 5000;
  const canSubmit = isTitleValid && isBodyValid && !isSubmitting;

  const stopCamera = (resetState = true) => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    if (resetState) {
      setIsCameraOpen(false);
      setCameraError(null);
    }
  };

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((pi) => URL.revokeObjectURL(pi.preview));
      stopCamera(false);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;

    if (!video || !stream || !isCameraOpen) {
      return;
    }

    video.srcObject = stream;
    void video.play().catch(() => null);
  }, [isCameraOpen]);

  const addPendingFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    const remainingSlots = 4 - pendingImagesRef.current.length;
    if (remainingSlots <= 0) {
      toast.error("You can only attach up to 4 images per question.");
      return;
    }

    const validFiles = files.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Only image files can be attached to a question.");
      return;
    }

    const acceptedFiles = validFiles.slice(0, remainingSlots);
    if (acceptedFiles.length < validFiles.length) {
      toast.error("Only the first few images were added because the question is full.");
    }

    const newPending = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPendingImages((prev) => [...prev, ...newPending]);
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setSelectedFormats(["ANY"]);
    setVisibility("PUBLIC");
    setSubject("");
    setStream("");
    setLevel("");
    stopCamera();
    setError(null);
    pendingImagesRef.current.forEach((pi) => URL.revokeObjectURL(pi.preview));
    setPendingImages([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPendingFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCameraCaptureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPendingFiles(files);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setPendingImages((prev) => {
      const newArr = [...prev];
      URL.revokeObjectURL(newArr[indexToRemove].preview);
      newArr.splice(indexToRemove, 1);
      return newArr;
    });
  };

  const openCamera = async () => {
    if (pendingImagesRef.current.length >= 4) {
      toast.error("You can only attach up to 4 images per question.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    setIsOpeningCamera(true);
    setCameraError(null);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not open the camera on this device.";
      setCameraError(message);
      toast.error(message);
    } finally {
      setIsOpeningCamera(false);
    }
  };

  const capturePhoto = async () => {
    const video = cameraVideoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera preview is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Could not capture a photo from the camera.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      toast.error("Could not capture a photo from the camera.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = new File([blob], `question-camera-${timestamp}.jpg`, {
      type: "image/jpeg",
    });

    addPendingFiles([file]);
    toast.success("Photo added to your question.");
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
      <DialogContent className="max-h-[92vh] w-full max-w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-3xl">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium">Attached Images ({pendingImages.length}/4)</Label>
              <div className="flex flex-wrap gap-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={pendingImages.length >= 4 || isSubmitting || isOpeningCamera}
                  onClick={() => {
                    void openCamera();
                  }}
                >
                  {isOpeningCamera ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CameraIcon className="size-3.5" />
                  )}
                  Use Camera
                </Button>
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
            <input
              type="file"
              ref={cameraInputRef}
              className="hidden"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCaptureSelect}
            />

            {isCameraOpen && (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Live Camera Preview</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => stopCamera()}
                  >
                    Close camera
                  </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-border bg-black/90">
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                {cameraError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {cameraError}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={isSubmitting}
                    onClick={() => {
                      void capturePhoto();
                    }}
                  >
                    <CameraIcon className="size-3.5" />
                    Capture Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Camera opens only after you tap the button, and it stops when you close it.
                  </p>
                </div>
              </div>
            )}

            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2 sm:gap-4">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative group rounded-md border border-border overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={img.preview} 
                      alt="pending attachment preview" 
                      className="size-20 object-cover sm:size-24" 
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
                    className="flex size-20 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted/50 sm:size-24"
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
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label>Answer format</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                      selectedFormats.includes(opt.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40"
                    }`}
                    onClick={() =>
                      setSelectedFormats((current) =>
                        toggleSelectableAnswerFormat(current, opt.value),
                      )
                    }
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose one or more required formats. If you select multiple, the final teacher answer must include all of them.
              </p>
            </div>

            {/* Visibility */}
            <div className="space-y-3">
              <Label>Answer visibility</Label>
              <div className="grid gap-2 sm:h-[calc(100%-28px)] sm:grid-cols-2">
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
          <div className="grid gap-3 pt-2 sm:grid-cols-3">
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
