"use client";

import { useState, useRef, useEffect } from "react";
import imageCompression from "browser-image-compression";
import {
  CameraIcon,
  ChevronDownIcon,
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
  LEVEL_OPTIONS,
  STREAM_OPTIONS,
  SUBJECT_OPTIONS,
} from "@/lib/academic-options";
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
import { updateProfile } from "@/store/features/user/user-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const FORMAT_OPTIONS: {
  value: SelectableAnswerFormat;
  label: string;
  desc: string;
}[] = [
  { value: "ANY", label: "Any Format", desc: "Let the answerer choose" },
  { value: "TEXT", label: "Text", desc: "Written explanation" },
  { value: "PHOTO", label: "Photo", desc: "Photo-based answer" },
];

const VISIBILITY_OPTIONS: { value: AnswerVisibility; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Private" },
];

type PostQuestionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PostQuestionModal({ open, onOpenChange }: PostQuestionModalProps) {
  const dispatch = useAppDispatch();
  const questionsRemaining = useAppSelector((s) => s.user.questionsRemaining);
  const maxQuestions = useAppSelector((s) => s.user.maxQuestions);
  const questionsAsked = useAppSelector((s) => s.user.questionsAsked);

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
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
  // Quota shown at the top of the modal. `questionsRemaining` is null for
  // unlimited plans, in which case there is nothing to meter.
  const hasQuota = questionsRemaining !== null && maxQuestions > 0;
  const quotaUsedPercent = hasQuota
    ? Math.min(100, (questionsAsked / maxQuestions) * 100)
    : 0;
  const isQuotaLow = hasQuota && questionsRemaining <= 3;
  const isQuotaEmpty = hasQuota && questionsRemaining === 0;

  // Details are fully optional — any length up to the 5000 cap enforced by
  // maxLength below (and by POST /api/questions).
  const canSubmit = isTitleValid && !isQuotaEmpty && !isSubmitting;

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

  // Refresh the quota each time the modal opens so the meter is never stale
  // (questions can also be posted from the mobile app).
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/user/subscription");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        dispatch(
          updateProfile({
            questionsAsked: data.questionsAsked,
            questionsRemaining: data.questionsRemaining,
            maxQuestions: data.maxQuestions,
          }),
        );
      } catch {
        // Non-fatal: the meter just keeps showing the last known values.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dispatch]);

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
      const trimmedSubject = subject.trim();
      const trimmedStream = stream.trim();
      const trimmedLevel = level.trim();
      const payload: CreateQuestionPayload = {
        title: title.trim(),
        body: body.trim(),
        images: uploadedImageUrls,
        answerFormat,
        answerVisibility: visibility,
        ...(trimmedSubject ? { subject: trimmedSubject } : {}),
        ...(trimmedStream ? { stream: trimmedStream } : {}),
        ...(trimmedLevel ? { level: trimmedLevel } : {}),
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
      dispatch(
        updateProfile({
          questionsAsked: questionsAsked + 1,
          ...(questionsRemaining !== null
            ? { questionsRemaining: Math.max(0, questionsRemaining - 1) }
            : {}),
        }),
      );
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
        <DialogHeader className="gap-3 border-b border-border/70 pb-4">
          <div className="flex flex-col gap-1 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              Post a Question
            </DialogTitle>
            <DialogDescription>
              Describe your doubt clearly. You can attach up to 4 images to help teachers understand perfectly.
            </DialogDescription>
          </div>

          {hasQuota ? (
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">
                  {isQuotaEmpty ? (
                    "No questions left on your plan"
                  ) : (
                    <>
                      <span
                        className={
                          isQuotaLow ? "text-destructive" : "text-primary"
                        }
                      >
                        {questionsRemaining}
                      </span>{" "}
                      of {maxQuestions} questions left
                    </>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {questionsAsked} used
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isQuotaEmpty
                      ? "bg-destructive"
                      : isQuotaLow
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${quotaUsedPercent}%` }}
                />
              </div>
              {isQuotaEmpty ? (
                <p className="text-xs text-destructive">
                  Upgrade your plan or earn bonus questions to keep asking.
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="flex w-full items-baseline gap-2" htmlFor="q-title">
              Title
              <span className="text-xs font-normal text-destructive">*</span>
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
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
            <Label className="flex w-full items-baseline gap-2" htmlFor="q-body">
              Details
              <span className="text-xs font-normal text-muted-foreground">
                Optional
              </span>
              <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
                {bodyLen}/5000
              </span>
            </Label>
            <Textarea
              className="min-h-32 resize-y"
              id="q-body"
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Explain what you understand so far, what confuses you, and what kind of answer would help…"
              value={body}
            />
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
                      className="absolute right-1 top-1 rounded-full bg-background/90 border border-border p-1 text-foreground shadow-sm sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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

          {/* Advanced options — collapsible on mobile, always visible on sm+ */}
          <div className="sm:contents">
            <button
              type="button"
              className="flex sm:hidden w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              <span>Advanced options</span>
              <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
            </button>

            <div className={`space-y-6 ${advancedOpen ? "block" : "hidden"} sm:block`}>
              {/* Configuration Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Label>Answer format</Label>
                  <div className="grid grid-cols-2 gap-2">
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
                        <span className="hidden sm:block text-xs text-muted-foreground mt-0.5">
                          {opt.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="hidden sm:block text-xs text-muted-foreground">
                    Choose one or more required formats. If you select multiple, the final teacher answer must include all of them.
                  </p>
                </div>

                {/* Visibility */}
                <div className="space-y-3">
                  <Label>Answer visibility</Label>
                  <div className="grid grid-cols-2 gap-2 sm:h-[calc(100%-28px)]">
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
                  <Input
                    id="q-subject"
                    list="question-subject-options"
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Any subject"
                    value={subject}
                  />
                  <datalist id="question-subject-options">
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="q-stream">Stream</Label>
                  <Input
                    id="q-stream"
                    list="question-stream-options"
                    onChange={(e) => setStream(e.target.value)}
                    placeholder="Any stream"
                    value={stream}
                  />
                  <datalist id="question-stream-options">
                    {STREAM_OPTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider" htmlFor="q-level">Level</Label>
                  <Input
                    id="q-level"
                    list="question-level-options"
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="Any level"
                    value={level}
                  />
                  <datalist id="question-level-options">
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l} />
                    ))}
                  </datalist>
                </div>
              </div>
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

        <DialogFooter className="sticky bottom-0 mt-2 border-t border-border/70 bg-popover pt-5">
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
