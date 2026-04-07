"use client";

import { useState } from "react";
import { Loader2Icon, SparklesIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  CreateQuestionPayload,
  FeedQuestion,
  QuestionTier,
  AnswerVisibility,
} from "@/types/question";
import { prependFeedQuestion } from "@/store/features/feed/feed-slice";
import { useAppDispatch } from "@/store/hooks";

const TIER_OPTIONS: { value: QuestionTier; label: string; desc: string }[] = [
  { value: "UNSET", label: "Any", desc: "Let the answerer choose" },
  { value: "ONE", label: "Tier I · Text", desc: "Written explanation" },
  { value: "TWO", label: "Tier II · Photo", desc: "Photo-based answer" },
  { value: "THREE", label: "Tier III · Video", desc: "Video walkthrough" },
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
  const [tier, setTier] = useState<QuestionTier>("UNSET");
  const [visibility, setVisibility] = useState<AnswerVisibility>("PUBLIC");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState("");
  const [level, setLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const isTitleValid = titleLen >= 6 && titleLen <= 180;
  const isBodyValid = bodyLen >= 12 && bodyLen <= 5000;
  const canSubmit = isTitleValid && isBodyValid && !isSubmitting;

  const resetForm = () => {
    setTitle("");
    setBody("");
    setTier("UNSET");
    setVisibility("PUBLIC");
    setSubject("");
    setStream("");
    setLevel("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateQuestionPayload = {
        title: title.trim(),
        body: body.trim(),
        tier,
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
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary" />
            Post a Question
          </SheetTitle>
          <SheetDescription>
            Describe your doubt clearly. The more context you provide, the better the answer you&apos;ll receive.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-6 pb-6">
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

          {/* Tier picker */}
          <div className="space-y-2">
            <Label>Answer tier</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    tier === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                  onClick={() => setTier(opt.value)}
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
          <div className="space-y-2">
            <Label>Answer visibility</Label>
            <div className="flex gap-2">
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

          {/* Optional metadata */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="q-subject">Subject</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                id="q-subject"
                onChange={(e) => setSubject(e.target.value)}
                value={subject}
              >
                <option value="">Any</option>
                {SUBJECT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="q-stream">Stream</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                id="q-stream"
                onChange={(e) => setStream(e.target.value)}
                value={stream}
              >
                <option value="">Any</option>
                {STREAM_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="q-level">Level</Label>
              <select
                className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm"
                id="q-level"
                onChange={(e) => setLevel(e.target.value)}
                value={level}
              >
                <option value="">Any</option>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <XIcon className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="border-t border-border/70">
          <Button
            onClick={() => { resetForm(); onOpenChange(false); }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {isSubmitting && <Loader2Icon className="mr-2 size-4 animate-spin" />}
            Post Question
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
