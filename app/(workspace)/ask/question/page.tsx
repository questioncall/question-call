"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRightIcon,
  EyeIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  CreateQuestionPayload,
  FeedQuestion,
  AnswerFormat,
  AnswerVisibility,
} from "@/types/question";
import { prependFeedQuestion } from "@/store/features/feed/feed-slice";
import { useAppDispatch } from "@/store/hooks";

const FORMAT_OPTIONS: { value: AnswerFormat; label: string; desc: string; color: string }[] = [
  { value: "ANY", label: "Any", desc: "Let the answerer decide the format", color: "border-muted-foreground/30" },
  { value: "TEXT", label: "Text", desc: "Written explanation only", color: "border-blue-500" },
  { value: "PHOTO", label: "Photo", desc: "Photo-based answer with annotations", color: "border-amber-500" },
  { value: "VIDEO", label: "Video", desc: "Full video walkthrough", color: "border-purple-500" },
];

const VISIBILITY_OPTIONS: { value: AnswerVisibility; label: string; desc: string }[] = [
  { value: "PUBLIC", label: "Public", desc: "Everyone can see the answer on the feed" },
  { value: "PRIVATE", label: "Private", desc: "Only you will see the answer in your inbox" },
];

const SUBJECT_OPTIONS = [
  "IT", "Biology", "Chemistry", "Physics", "Mathematics", "English", "Accountancy",
] as const;

const STREAM_OPTIONS = ["Science", "Management"] as const;
const LEVEL_OPTIONS = ["School level", "Plus 2", "Bachelor"] as const;

const formatLabelMap: Record<AnswerFormat, string> = {
  ANY: "Any format",
  TEXT: "Text format",
  PHOTO: "Photo format",
  VIDEO: "Video format",
};

const visibilityLabelMap: Record<AnswerVisibility, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
};

export default function AskQuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  const initialQuery = searchParams.get("q") || "";

  const [title, setTitle] = useState(initialQuery);
  const [body, setBody] = useState("");
  const [answerFormat, setAnswerFormat] = useState<AnswerFormat>("ANY");
  const [visibility, setVisibility] = useState<AnswerVisibility>("PUBLIC");
  const [subject, setSubject] = useState("");
  const [stream, setStream] = useState("");
  const [level, setLevel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (initialQuery && !title) {
      setTitle(initialQuery);
    }
  }, [initialQuery, title]);

  const titleLen = title.trim().length;
  const bodyLen = body.trim().length;
  const isTitleValid = titleLen >= 6 && titleLen <= 180;
  const isBodyValid = bodyLen >= 12 && bodyLen <= 5000;
  const canSubmit = isTitleValid && isBodyValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateQuestionPayload = {
        title: title.trim(),
        body: body.trim(),
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
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-5 text-primary" />
              <CardTitle>Ask a Question</CardTitle>
            </div>
            <CardDescription>
              Describe your doubt clearly. The more context you provide, the better the answer you&apos;ll receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="q-title">
                Title
                <span className={`ml-2 text-xs ${isTitleValid || titleLen === 0 ? "text-muted-foreground" : "text-destructive"}`}>
                  {titleLen}/180
                </span>
              </Label>
              <Input
                autoFocus
                id="q-title"
                maxLength={180}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Why does current split in a parallel circuit instead of staying equal?"
                value={title}
              />
              {titleLen > 0 && titleLen < 6 && (
                <p className="text-xs text-destructive">Title must be at least 6 characters</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-body">
                Details
                <span className={`ml-2 text-xs ${isBodyValid || bodyLen === 0 ? "text-muted-foreground" : "text-destructive"}`}>
                  {bodyLen}/5000
                </span>
              </Label>
              <Textarea
                className="min-h-44 resize-none"
                id="q-body"
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Explain what you understand so far, what confuses you, and what kind of answer would help. Include the chapter, concept, or exact confusion..."
                value={body}
              />
              {bodyLen > 0 && bodyLen < 12 && (
                <p className="text-xs text-destructive">Body must be at least 12 characters</p>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Answer format</Label>
              <div className="grid grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                      answerFormat === opt.value
                        ? `${opt.color} bg-primary/5 ring-1 ring-primary/20`
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                    onClick={() => setAnswerFormat(opt.value)}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Answer visibility</Label>
              <div className="grid grid-cols-2 gap-3">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition-all ${
                      visibility === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                    onClick={() => setVisibility(opt.value)}
                    type="button"
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="q-subject">Subject</Label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="q-stream">Stream</Label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="q-level">Level</Label>
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button disabled={!canSubmit} onClick={handleSubmit} size="lg">
                {isSubmitting ? (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRightIcon className="mr-2 size-4" />
                )}
                Post Question
              </Button>
              <Button
                onClick={() => setShowPreview(!showPreview)}
                size="lg"
                variant="outline"
              >
                <EyeIcon className="mr-2 size-4" />
                {showPreview ? "Hide preview" : "Show preview"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {showPreview && (
          <Card className="border border-primary/20 shadow-sm">
            <CardHeader>
              <CardDescription>Feed preview</CardDescription>
              <CardTitle className="text-sm">How your question will look</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                You • just now • {subject || "General"}
              </div>
              <p className="text-sm font-medium text-foreground">
                {title.trim() || "Your question title will appear here..."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {formatLabelMap[answerFormat]}
                </span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {visibilityLabelMap[visibility]}
                </span>
                {stream && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {stream}
                  </span>
                )}
                {level && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {level}
                  </span>
                )}
              </div>
              <p className="text-xs leading-6 text-muted-foreground line-clamp-3">
                {body.trim() || "Your question details will appear here..."}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>Tips</CardDescription>
            <CardTitle className="text-sm">Write a great question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-primary">1.</span>
              <span>Write your question naturally — describe what confuses you.</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-primary">2.</span>
              <span>Include the chapter, topic, or concept for faster matching.</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-primary">3.</span>
              <span>Choose a higher duration format if you need a visual or video explanation.</span>
            </div>
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-primary">4.</span>
              <span>Set visibility to Private if you don&apos;t want the answer shown publicly.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardDescription>What happens next</CardDescription>
            <CardTitle className="text-sm">After posting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your question appears on the feed immediately. Teachers and fellow students can:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>React to your question (like, insightful, same doubt)</li>
              <li>Accept it to start a private channel with you</li>
              <li>Submit an answer within the format&apos;s time limit</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}