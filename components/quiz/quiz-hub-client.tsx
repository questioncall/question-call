"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Loader2Icon,
  LockIcon,
  PlayCircleIcon,
  SparklesIcon,
  TimerResetIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatPoints } from "@/lib/points";
import type { QuizHistoryResponse, QuizTopicClient, QuizType } from "@/types/quiz";

type QuizTopicsResponse = {
  topics: QuizTopicClient[];
  suggestions?: {
    subjects: string[];
    levels: string[];
    fields: string[];
  };
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function getModeLabel(mode: QuizType) {
  return mode === "FREE" ? "Free quiz" : "Premium quiz";
}

export function QuizHubClient() {
  const router = useRouter();
  const [allTopics, setAllTopics] = useState<QuizTopicClient[]>([]);
  const [topics, setTopics] = useState<QuizTopicClient[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<QuizTopicsResponse["suggestions"] | null>(null);
  const [history, setHistory] = useState<QuizHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [startingMode, setStartingMode] = useState<QuizType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    let active = true;

    async function loadQuizHub() {
      setLoading(true);
      setError(null);

      try {
        const [topicsResponse, historyResponse] = await Promise.all([
          fetch("/api/quiz/topics", { cache: "no-store" }),
          fetch("/api/quiz/history?limit=8", { cache: "no-store" }),
        ]);

        const topicsData = (await topicsResponse.json()) as QuizTopicsResponse & { error?: string };
        const historyData = (await historyResponse.json()) as QuizHistoryResponse & { error?: string };

        if (!topicsResponse.ok) {
          throw new Error(topicsData.error || "Failed to load quiz topics.");
        }

        if (!historyResponse.ok) {
          throw new Error(historyData.error || "Failed to load quiz history.");
        }

        if (!active) {
          return;
        }

        setAllTopics(topicsData.topics);
        setTopics(topicsData.topics);
        setTopicSuggestions(topicsData.suggestions ?? null);
        setHistory(historyData);
      } catch (fetchError) {
        if (!active) {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : "Failed to load quiz hub.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadQuizHub();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!searchQuery.trim()) {
      setActionError(null);
      setTopics(allTopics);
      setTopicSuggestions({
        subjects: [...new Set(allTopics.map((item) => item.subject))].slice(0, 10),
        levels: [...new Set(allTopics.map((item) => item.level))].slice(0, 10),
        fields: [...new Set(allTopics.flatMap((item) => (item.field ? [item.field] : [])))].slice(0, 10),
      });
      return () => {
        active = false;
      };
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setActionError(null);
        const response = await fetch(
          `/api/quiz/topics?q=${encodeURIComponent(searchQuery.trim())}&limit=24`,
          { cache: "no-store" },
        );

        const data = (await response.json()) as QuizTopicsResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Failed to search quiz topics.");
        }

        if (!active) {
          return;
        }

        setTopics(data.topics);
        setTopicSuggestions(data.suggestions ?? null);
        setActionError(null);
      } catch (searchError) {
        if (!active) {
          return;
        }

        setActionError(
          searchError instanceof Error ? searchError.message : "Failed to search quiz topics.",
        );
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [allTopics, searchQuery]);

  const subjectOptions = useMemo(
    () => [...new Set(topics.map((item) => item.subject))],
    [topics],
  );

  const topicOptions = useMemo(() => {
    return [...new Set(topics.filter((item) => item.subject === subject).map((item) => item.topic))];
  }, [subject, topics]);

  const levelOptions = useMemo(() => {
    return [
      ...new Set(
        topics
          .filter((item) => item.subject === subject && item.topic === topic)
          .map((item) => item.level),
      ),
    ];
  }, [subject, topic, topics]);

  useEffect(() => {
    if (!subjectOptions.length) {
      setSubject("");
      return;
    }

    setSubject((current) => (subjectOptions.includes(current) ? current : subjectOptions[0]));
  }, [subjectOptions]);

  useEffect(() => {
    if (!topicOptions.length) {
      setTopic("");
      return;
    }

    setTopic((current) => (topicOptions.includes(current) ? current : topicOptions[0]));
  }, [topicOptions]);

  useEffect(() => {
    if (!levelOptions.length) {
      setLevel("");
      return;
    }

    setLevel((current) => (levelOptions.includes(current) ? current : levelOptions[0]));
  }, [levelOptions]);

  const selectedTopic = useMemo(() => {
    return topics.find(
      (item) =>
        item.subject === subject && item.topic === topic && item.level === level,
    ) ?? null;
  }, [level, subject, topic, topics]);

  const hasSearchQuery = searchQuery.trim().length > 0;

  async function handleStart(mode: QuizType) {
    if (!selectedTopic) {
      setActionError("Choose a valid subject, topic, and level before starting.");
      return;
    }

    setActionError(null);
    setStartingMode(mode);

    try {
      const response = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizType: mode,
          topicId: selectedTopic.id,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        sessionId?: string;
      };

      if (!response.ok || !data.sessionId) {
        throw new Error(data.error || "Failed to start quiz.");
      }

      router.push(`/quiz/${data.sessionId}`);
    } catch (startError) {
      setActionError(startError instanceof Error ? startError.message : "Failed to start quiz.");
    } finally {
      setStartingMode(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.15),_transparent_35%),linear-gradient(180deg,#09090b_0%,#111827_100%)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              Back to workspace
            </Link>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Quiz Service
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Launch a focused full-screen session, keep your answers synced as you go,
                and earn points when you clear the pass mark.
              </p>
            </div>
          </div>
          {history?.activeSession ? (
            <Button asChild className="h-11 rounded-full px-6">
              <Link href={`/quiz/${history.activeSession.id}`}>
                <PlayCircleIcon className="mr-2 size-4" />
                Resume active quiz
              </Link>
            </Button>
          ) : null}
        </div>

        {actionError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
            {actionError}
          </div>
        ) : null}

        {history?.activeSession ? (
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">You already have a quiz in progress</CardTitle>
              <CardDescription>
                Finish or submit the current session before starting another one.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                {history.activeSession.subject} · {history.activeSession.topic} · {history.activeSession.level}
              </div>
              <Button asChild variant="outline">
                <Link href={`/quiz/${history.activeSession.id}`}>Open active session</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden border-border/70 bg-background/95 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <h2 className="text-xl font-semibold">Topic Picker</h2>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <Input
              className="h-12 rounded-xl border-border/80 bg-background/90"
              value={searchQuery}
              onChange={(event) => {
                setActionError(null);
                setSearchQuery(event.target.value);
              }}
              placeholder="Search topics..."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Subject"
                value={subject}
                onChange={setSubject}
                options={subjectOptions}
              />
              <SelectField
                label="Topic"
                value={topic}
                onChange={setTopic}
                options={topicOptions}
              />
              <SelectField
                label="Level"
                value={level}
                onChange={setLevel}
                options={levelOptions}
              />
            </div>

            {topics.length === 0 ? (
              <EmptyState
                message={
                  hasSearchQuery
                    ? "No topics found for that search."
                    : "No quiz topics available."
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topics.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSubject(item.subject);
                      setTopic(item.topic);
                      setLevel(item.level);
                    }}
                    className={`cursor-pointer rounded-xl border p-4 transition hover:border-primary ${
                      selectedTopic?.id === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border/70 bg-muted/20"
                    }`}
                  >
                    <p className="font-medium">{item.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.subject} · {item.level}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <ModeCard
            title="Free quiz"
            description="Open to every student, including free-trial and expired-plan users."
            remaining={history?.free.remainingToday ?? 0}
            usedToday={history?.free.usedToday ?? 0}
            dailyLimit={history?.free.dailyLimit ?? 0}
            passPercent={history?.free.passPercent ?? 0}
            pointReward={history?.free.pointReward ?? 0}
            isEligible={history?.free.isEligible ?? true}
            isStarting={startingMode === "FREE"}
            onStart={() => handleStart("FREE")}
            disabled={!selectedTopic || topics.length === 0}
            icon={<SparklesIcon className="size-5 text-emerald-600 dark:text-emerald-300" />}
          />

          <ModeCard
            title="Premium quiz"
            description="Reserved for students on an active paid plan."
            remaining={history?.premium.remainingToday ?? 0}
            usedToday={history?.premium.usedToday ?? 0}
            dailyLimit={history?.premium.dailyLimit ?? 0}
            passPercent={history?.premium.passPercent ?? 0}
            pointReward={history?.premium.pointReward ?? 0}
            isEligible={history?.premium.isEligible ?? false}
            reason={history?.premium.reason ?? null}
            isStarting={startingMode === "PREMIUM"}
            onStart={() => handleStart("PREMIUM")}
            disabled={!selectedTopic || topics.length === 0}
            icon={<LockIcon className="size-5 text-violet-600 dark:text-violet-300" />}
            footer={
              !(history?.premium.isEligible ?? false) ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/subscription">View paid plans</Link>
                </Button>
              ) : null
            }
          />
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Recent sessions</CardTitle>
            <CardDescription>
              Your latest quiz attempts stay here so you can review scores, rewards, and submit reasons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.items.length === 0 ? (
              <EmptyState message="No quiz sessions yet. Start your first one from the cards above." />
            ) : (
              <div className="space-y-4">
                {history.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold ring-1 ring-border/60">
                          {getModeLabel(item.quizType)}
                        </span>
                        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold ring-1 ring-border/60">
                          {item.subject} · {item.topic} · {item.level}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(item.startedAt).toLocaleString()} · {item.submitReason ?? "In progress"}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm md:min-w-[320px]">
                      <HistoryMetric label="Score" value={`${item.score.toFixed(2)}%`} />
                      <HistoryMetric label="Answered" value={`${item.answeredCount}/${item.questionCount}`} />
                      <HistoryMetric label="Reward" value={`${formatPoints(item.pointsAwarded)} pts`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-border/70 bg-background/80 px-5 py-4 text-sm text-muted-foreground backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 text-foreground">
            <TimerResetIcon className="size-4 text-primary" />
            <span className="font-medium">Quiz rules snapshot</span>
          </div>
          <p className="mt-2">
            Sessions reset by the Nepal day boundary, run in a dedicated full-screen view,
            and warn twice before the next violation forces auto-submit.
          </p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-3 rounded-2xl border border-border/70 bg-background px-4 py-4 text-sm shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <select
        className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        disabled={!options.length}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.length ? (
          options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))
        ) : (
          <option value="">
            No options available
          </option>
        )}
      </select>
    </label>
  );
}

function ModeCard({
  title,
  description,
  remaining,
  usedToday,
  dailyLimit,
  passPercent,
  pointReward,
  isEligible,
  reason,
  isStarting,
  onStart,
  disabled,
  icon,
  footer,
}: {
  title: string;
  description: string;
  remaining: number;
  usedToday: number;
  dailyLimit: number;
  passPercent: number;
  pointReward: number;
  isEligible: boolean;
  reason?: string | null;
  isStarting: boolean;
  onStart: () => void;
  disabled: boolean;
  icon: ReactNode;
  footer?: ReactNode;
}) {
  const quotaReached = remaining <= 0;
  const locked = !isEligible;

  return (
    <Card className={`border-border/70 ${locked ? "opacity-80" : ""}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-3">{icon}</div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <HistoryMetric label="Remaining" value={`${remaining}`} />
          <HistoryMetric label="Pass mark" value={`${passPercent}%`} />
          <HistoryMetric label="Reward" value={`${formatPoints(pointReward)} pts`} />
        </div>

        <div className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Used today: {usedToday}/{dailyLimit}
        </div>

        {locked && reason ? (
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-200">
            {reason}
          </div>
        ) : null}

        {quotaReached ? (
          <div className="rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-700/60 dark:bg-rose-950/20 dark:text-rose-200">
            Today&apos;s quota is already used for this mode.
          </div>
        ) : null}

        <Button
          className="h-11 w-full rounded-full"
          disabled={disabled || locked || quotaReached || isStarting}
          onClick={onStart}
        >
          {isStarting ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <PlayCircleIcon className="mr-2 size-4" />
              Start {title.toLowerCase()}
            </>
          )}
        </Button>

        {footer}
      </CardContent>
    </Card>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}
