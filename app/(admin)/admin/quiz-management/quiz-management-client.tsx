"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheckIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatPoints } from "@/lib/points";

type QuizTopicAdminItem = {
  id: string;
  subject: string;
  topic: string;
  level: string;
  field?: string | null;
  levelCategory?: string;
  searchAliases?: string[];
  isActive: boolean;
  questionCount: number;
  sessionCount: number;
};

type QuizGenerationStats = {
  totalQuestions: number;
  generatedToday: number;
  adminTotals: Array<{
    adminId: string;
    adminName: string;
    totalQuestions: number;
    totalRuns: number;
    lastGeneratedAt: string;
  }>;
  dailyAdminBreakdown: Array<{
    day: string;
    adminId: string;
    adminName: string;
    totalQuestions: number;
    totalRuns: number;
    lastGeneratedAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    adminName: string;
    subject: string;
    topic: string;
    level: string;
    mode: "STARTER_SEED" | "TOPIC_SEED" | "SMART_SEED";
    searchQuery?: string | null;
    requestedCount: number;
    createdCount: number;
    createdAt: string;
  }>;
};

type QuizTopicsAdminResponse = {
  topics: QuizTopicAdminItem[];
  generationStats: QuizGenerationStats;
};

type QuizManagementConfig = {
  quizQuestionCount: number;
  quizTimeLimitSeconds: number;
  quizRepeatResetDays: number;
  freeQuizDailySessionLimit: number;
  freeQuizPassPercent: number;
  freeQuizPointReward: number;
  premiumQuizDailySessionLimit: number;
  premiumQuizPassPercent: number;
  premiumQuizPointReward: number;
  quizViolationWarningLimit: number;
};

type GenerationProgressState = {
  percent: number;
  title: string;
  detail: string;
};

const initialTopicForm = {
  subject: "",
  topic: "",
  level: "",
  field: "",
  searchAliases: "",
  isActive: true,
};

function parseAliases(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function readJsonResponse<T>(response: Response): Promise<T & { error?: string }> {
  const text = await response.text();

  if (!text) {
    return {} as T & { error?: string };
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error:
        text.trim() || `Request failed with status ${response.status}.`,
    } as T & { error?: string };
  }
}

function modeLabel(mode: "STARTER_SEED" | "TOPIC_SEED" | "SMART_SEED") {
  if (mode === "SMART_SEED") return "Smart AI";
  if (mode === "TOPIC_SEED") return "Topic seed";
  return "Starter";
}

export function QuizManagementClient() {
  const [config, setConfig] = useState<QuizManagementConfig | null>(null);
  const [topics, setTopics] = useState<QuizTopicAdminItem[]>([]);
  const [stats, setStats] = useState<QuizGenerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [seedingStarter, setSeedingStarter] = useState(false);
  const [smartGenerating, setSmartGenerating] = useState(false);
  const [generatingTopicId, setGeneratingTopicId] = useState<string | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState(initialTopicForm);
  const [smartPrompt, setSmartPrompt] = useState("");
  const [smartCount, setSmartCount] = useState("100");
  const [smartMaxTopics, setSmartMaxTopics] = useState("4");
  const [perTopicSeedCount, setPerTopicSeedCount] = useState("25");
  const [generationProgress, setGenerationProgress] = useState<GenerationProgressState | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const generationIntervalRef = useRef<number | null>(null);
  const generationHideTimeoutRef = useRef<number | null>(null);

  const isGenerationBusy =
    seedingStarter || smartGenerating || generatingTopicId !== null;

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setBanner(null);

      try {
        const [configRes, topicsRes] = await Promise.all([
          fetch("/api/admin/config", { cache: "no-store" }),
          fetch("/api/admin/quiz-topics", { cache: "no-store" }),
        ]);

        const configData = (await configRes.json()) as QuizManagementConfig & { error?: string };
        const topicsData = (await topicsRes.json()) as QuizTopicsAdminResponse & {
          error?: string;
        };

        if (!configRes.ok) throw new Error(configData.error || "Failed to load quiz config.");
        if (!topicsRes.ok) throw new Error(topicsData.error || "Failed to load quiz topics.");
        if (!active) return;

        setConfig({
          quizQuestionCount: configData.quizQuestionCount,
          quizTimeLimitSeconds: configData.quizTimeLimitSeconds,
          quizRepeatResetDays: configData.quizRepeatResetDays,
          freeQuizDailySessionLimit: configData.freeQuizDailySessionLimit,
          freeQuizPassPercent: configData.freeQuizPassPercent,
          freeQuizPointReward: configData.freeQuizPointReward,
          premiumQuizDailySessionLimit: configData.premiumQuizDailySessionLimit,
          premiumQuizPassPercent: configData.premiumQuizPassPercent,
          premiumQuizPointReward: configData.premiumQuizPointReward,
          quizViolationWarningLimit: configData.quizViolationWarningLimit,
        });
        setTopics(topicsData.topics ?? []);
        setStats(topicsData.generationStats ?? null);
      } catch (error) {
        if (!active) return;
        setBanner({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load quiz data.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (generationIntervalRef.current !== null) {
        window.clearInterval(generationIntervalRef.current);
      }

      if (generationHideTimeoutRef.current !== null) {
        window.clearTimeout(generationHideTimeoutRef.current);
      }
    };
  }, []);

  const sortedTopics = useMemo(
    () =>
      [...topics].sort(
        (a, b) =>
          a.subject.localeCompare(b.subject) ||
          a.topic.localeCompare(b.topic) ||
          a.level.localeCompare(b.level),
      ),
    [topics],
  );

  function clearGenerationTimers() {
    if (generationIntervalRef.current !== null) {
      window.clearInterval(generationIntervalRef.current);
      generationIntervalRef.current = null;
    }

    if (generationHideTimeoutRef.current !== null) {
      window.clearTimeout(generationHideTimeoutRef.current);
      generationHideTimeoutRef.current = null;
    }
  }

  function startGenerationProgress(title: string, detail: string) {
    clearGenerationTimers();
    setGenerationProgress({
      percent: 0,
      title,
      detail,
    });

    generationIntervalRef.current = window.setInterval(() => {
      setGenerationProgress((current) => {
        if (!current) {
          return current;
        }

        let increment = 1;
        if (current.percent < 20) {
          increment = 6;
        } else if (current.percent < 45) {
          increment = 4;
        } else if (current.percent < 70) {
          increment = 2;
        }

        return {
          ...current,
          percent: Math.min(94, current.percent + increment),
        };
      });
    }, 450);
  }

  function completeGenerationProgress(detail?: string) {
    clearGenerationTimers();
    setGenerationProgress((current) =>
      current
        ? {
            ...current,
            percent: 100,
            detail: detail ?? current.detail,
          }
        : null,
    );

    generationHideTimeoutRef.current = window.setTimeout(() => {
      setGenerationProgress(null);
      generationHideTimeoutRef.current = null;
    }, 1200);
  }

  function failGenerationProgress() {
    clearGenerationTimers();
    generationHideTimeoutRef.current = window.setTimeout(() => {
      setGenerationProgress(null);
      generationHideTimeoutRef.current = null;
    }, 300);
  }

  async function refreshTopics() {
    const res = await fetch("/api/admin/quiz-topics", { cache: "no-store" });
    const data = (await res.json()) as QuizTopicsAdminResponse & { error?: string };
    if (!res.ok) throw new Error(data.error || "Failed to refresh quiz topics.");
    setTopics(data.topics ?? []);
    setStats(data.generationStats ?? null);
  }

  function resetTopicForm() {
    setEditingTopicId(null);
    setTopicForm(initialTopicForm);
  }

  function handleConfigChange(field: keyof QuizManagementConfig, value: string) {
    setConfig((current) => (current ? { ...current, [field]: Number(value) } : current));
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSavingConfig(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as QuizManagementConfig & { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save quiz config.");
      setConfig(data);
      setBanner({ type: "success", message: "Quiz configuration updated." });
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save quiz config.",
      });
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSaveTopic() {
    if (!topicForm.subject.trim() || !topicForm.topic.trim() || !topicForm.level.trim()) {
      setBanner({ type: "error", message: "Subject, topic, and level are required." });
      return;
    }

    setSavingTopic(true);
    setBanner(null);

    try {
      const res = await fetch(
        editingTopicId ? `/api/admin/quiz-topics/${editingTopicId}` : "/api/admin/quiz-topics",
        {
          method: editingTopicId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: topicForm.subject,
            topic: topicForm.topic,
            level: topicForm.level,
            field: topicForm.field || null,
            searchAliases: parseAliases(topicForm.searchAliases),
            isActive: topicForm.isActive,
          }),
        },
      );

      const data = (await res.json()) as { error?: string; topic?: QuizTopicAdminItem };
      if (!res.ok || !data.topic) throw new Error(data.error || "Failed to save quiz topic.");
      const savedTopic = data.topic;

      setTopics((current) =>
        editingTopicId
          ? current.map((item) => (item.id === savedTopic.id ? savedTopic : item))
          : [...current, savedTopic],
      );
      resetTopicForm();
      setBanner({
        type: "success",
        message: editingTopicId ? "Quiz topic updated." : "Quiz topic created.",
      });
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save quiz topic.",
      });
    } finally {
      setSavingTopic(false);
    }
  }

  async function handleToggleTopic(topic: QuizTopicAdminItem) {
    try {
      const res = await fetch(`/api/admin/quiz-topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !topic.isActive }),
      });
      const data = (await res.json()) as { error?: string; topic?: QuizTopicAdminItem };
      if (!res.ok || !data.topic) throw new Error(data.error || "Failed to update topic.");
      setTopics((current) =>
        current.map((item) => (item.id === data.topic?.id ? data.topic : item)),
      );
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to update topic.",
      });
    }
  }

  async function handleDeleteTopic(topicId: string) {
    setDeletingTopicId(topicId);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/quiz-topics/${topicId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete quiz topic.");
      setTopics((current) => current.filter((item) => item.id !== topicId));
      if (editingTopicId === topicId) resetTopicForm();
      setBanner({ type: "success", message: "Quiz topic deleted." });
    } catch (error) {
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete quiz topic.",
      });
    } finally {
      setDeletingTopicId(null);
    }
  }

  async function handleSeedStarter() {
    setSeedingStarter(true);
    setBanner(null);
    startGenerationProgress("Seeding starter quiz bank", "Preparing starter subjects and question sets.");
    try {
      const res = await fetch("/api/admin/quiz-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "STARTER" }),
      });
      const data = await readJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to seed starter data.");
      await refreshTopics();
      completeGenerationProgress(data.message || "Starter quiz generation finished.");
      setBanner({ type: "success", message: data.message || "Starter data seeded." });
    } catch (error) {
      failGenerationProgress();
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to seed starter data.",
      });
    } finally {
      setSeedingStarter(false);
    }
  }

  async function handleSmartGenerate() {
    setSmartGenerating(true);
    setBanner(null);
    startGenerationProgress(
      "Generating smart quiz questions",
      "Asking the AI to choose near-fit subjects, fields, and levels for this batch.",
    );
    try {
      const res = await fetch("/api/admin/quiz-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "SMART",
          prompt: smartPrompt,
          count: Number(smartCount),
          maxTopics: Number(smartMaxTopics),
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        message?: string;
        totalQuestionsCreated?: number;
      }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to run smart generation.");
      await refreshTopics();
      completeGenerationProgress(
        data.message || `Generated ${data.totalQuestionsCreated ?? 0} quiz questions.`,
      );
      setBanner({
        type: "success",
        message:
          data.message || `Generated ${data.totalQuestionsCreated ?? 0} quiz questions.`,
      });
    } catch (error) {
      failGenerationProgress();
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to run smart generation.",
      });
    } finally {
      setSmartGenerating(false);
    }
  }

  async function handleGenerateTopic(topic: QuizTopicAdminItem) {
    setGeneratingTopicId(topic.id);
    setBanner(null);
    startGenerationProgress(
      "Generating topic questions",
      `Building more questions for ${topic.subject} / ${topic.topic} / ${topic.level}.`,
    );
    try {
      const res = await fetch("/api/admin/quiz-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "TOPIC_SEED",
          topicId: topic.id,
          count: Number(perTopicSeedCount),
        }),
      });
      const data = await readJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Failed to generate topic questions.");
      await refreshTopics();
      completeGenerationProgress(data.message || `Generated more questions for ${topic.topic}.`);
      setBanner({
        type: "success",
        message: data.message || `Generated more questions for ${topic.topic}.`,
      });
    } catch (error) {
      failGenerationProgress();
      setBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to generate topic questions.",
      });
    } finally {
      setGeneratingTopicId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            <BookOpenCheckIcon className="mr-2 inline-block size-6 text-primary" />
            Quiz Management
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage quiz rules, searchable topic metadata, smart AI seeding, and per-admin activity.
          </p>
        </div>
        <Button variant="outline" onClick={() => void handleSeedStarter()} disabled={isGenerationBusy}>
          {seedingStarter ? (
            <Loader2Icon className="mr-2 size-4 animate-spin" />
          ) : (
            <SparklesIcon className="mr-2 size-4" />
          )}
          Seed Starter Data
        </Button>
      </div>

      {banner ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/20 dark:text-emerald-200"
              : "border border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {banner.message}
        </div>
      ) : null}

      {generationProgress ? (
        <GenerationProgressPanel
          percent={generationProgress.percent}
          title={generationProgress.title}
          detail={generationProgress.detail}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Questions Generated" value={`${stats?.totalQuestions ?? 0}`} description="Tracked admin-created quiz questions" />
        <MetricCard label="Generated Today" value={`${stats?.generatedToday ?? 0}`} description="Nepal-day total across admins" />
        <MetricCard label="Active Topics" value={`${topics.filter((topic) => topic.isActive).length}`} description={`${topics.length} topic combinations in the bank`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Smart AI Generation</CardTitle>
          <CardDescription>
            Mention the level, field, or subject mix you want. The LLM will choose multiple close topic/level combinations and generate questions accordingly. A 100-question batch works well.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={smartPrompt}
            onChange={(event) => setSmartPrompt(event.target.value)}
            placeholder="Example: Class 8 science basics, Plus 2 management accounting, Bachelor BCA programming."
            className="min-h-24"
          />
          <div className="grid gap-4 md:grid-cols-3">
            <NumberField label="Total Questions" value={smartCount} onChange={setSmartCount} />
            <NumberField label="Max Topic Plans" value={smartMaxTopics} onChange={setSmartMaxTopics} />
            <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Search-aware prompts work best with `Class 7`, `Plus 2 - Science`, `Bachelor - BBS`, or subject words like `physics`, `accounting`, `programming`.
            </div>
          </div>
          <Button onClick={() => void handleSmartGenerate()} disabled={isGenerationBusy}>
            {smartGenerating ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SparklesIcon className="mr-2 size-4" />}
            Generate Smart Seed
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Rules</CardTitle>
          <CardDescription>These values are stored in PlatformConfig and apply to new sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Questions / Session" value={String(config?.quizQuestionCount ?? 0)} onChange={(value) => handleConfigChange("quizQuestionCount", value)} />
            <NumberField label="Timer (Seconds)" value={String(config?.quizTimeLimitSeconds ?? 0)} onChange={(value) => handleConfigChange("quizTimeLimitSeconds", value)} />
            <NumberField label="Repeat Reset (Days)" value={String(config?.quizRepeatResetDays ?? 0)} onChange={(value) => handleConfigChange("quizRepeatResetDays", value)} />
            <NumberField label="Warning Limit" value={String(config?.quizViolationWarningLimit ?? 0)} onChange={(value) => handleConfigChange("quizViolationWarningLimit", value)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Free Mode</CardTitle>
                <CardDescription>Current reward: {formatPoints(config?.freeQuizPointReward ?? 0)} pts on pass.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <NumberField label="Daily Sessions" value={String(config?.freeQuizDailySessionLimit ?? 0)} onChange={(value) => handleConfigChange("freeQuizDailySessionLimit", value)} />
                <NumberField label="Pass Percent" value={String(config?.freeQuizPassPercent ?? 0)} onChange={(value) => handleConfigChange("freeQuizPassPercent", value)} />
                <NumberField label="Point Reward" value={String(config?.freeQuizPointReward ?? 0)} onChange={(value) => handleConfigChange("freeQuizPointReward", value)} step="0.01" />
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">Premium Mode</CardTitle>
                <CardDescription>Current reward: {formatPoints(config?.premiumQuizPointReward ?? 0)} pts on pass.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <NumberField label="Daily Sessions" value={String(config?.premiumQuizDailySessionLimit ?? 0)} onChange={(value) => handleConfigChange("premiumQuizDailySessionLimit", value)} />
                <NumberField label="Pass Percent" value={String(config?.premiumQuizPassPercent ?? 0)} onChange={(value) => handleConfigChange("premiumQuizPassPercent", value)} />
                <NumberField label="Point Reward" value={String(config?.premiumQuizPointReward ?? 0)} onChange={(value) => handleConfigChange("premiumQuizPointReward", value)} step="0.01" />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void handleSaveConfig()} disabled={savingConfig}>
              {savingConfig ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SaveIcon className="mr-2 size-4" />}
              Save Quiz Rules
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingTopicId ? "Edit Topic" : "Add Topic"}</CardTitle>
            <CardDescription>Add field and search aliases so students can search by nearby stream, subject, or level terms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField label="Subject" value={topicForm.subject} onChange={(value) => setTopicForm((current) => ({ ...current, subject: value }))} />
            <TextField label="Topic" value={topicForm.topic} onChange={(value) => setTopicForm((current) => ({ ...current, topic: value }))} />
            <TextField label="Level" value={topicForm.level} onChange={(value) => setTopicForm((current) => ({ ...current, level: value }))} placeholder="Class 9, Plus 2 - Science, Bachelor - BCA" />
            <TextField label="Field / Stream" value={topicForm.field} onChange={(value) => setTopicForm((current) => ({ ...current, field: value }))} placeholder="Science, Management, Law, BBS, BCA" />
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Search Aliases</span>
              <Textarea value={topicForm.searchAliases} onChange={(event) => setTopicForm((current) => ({ ...current, searchAliases: event.target.value }))} placeholder="Comma-separated nearby search terms" className="min-h-20" />
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
              <Checkbox id="topic-active" checked={topicForm.isActive} onCheckedChange={(checked) => setTopicForm((current) => ({ ...current, isActive: checked === true }))} />
              <label htmlFor="topic-active" className="text-sm font-medium text-foreground">Topic is active for students</label>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleSaveTopic()} disabled={savingTopic}>
                {savingTopic ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : editingTopicId ? <SaveIcon className="mr-2 size-4" /> : <PlusIcon className="mr-2 size-4" />}
                {editingTopicId ? "Update Topic" : "Create Topic"}
              </Button>
              {editingTopicId ? <Button variant="outline" onClick={resetTopicForm}>Cancel Edit</Button> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Topic Catalogue</CardTitle>
              <CardDescription>{sortedTopics.length} topic combinations in the quiz bank.</CardDescription>
            </div>
            <NumberField label="Per-topic Seed Count" value={perTopicSeedCount} onChange={setPerTopicSeedCount} />
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedTopics.length === 0 ? (
              <EmptyPanel message="No quiz topics yet. Add the first one from the form on the left." />
            ) : (
              sortedTopics.map((topic) => (
                <div key={topic.id} className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill>{topic.subject}</Pill>
                        <Pill>{topic.topic}</Pill>
                        <Pill>{topic.level}</Pill>
                        {topic.field ? <Pill>{topic.field}</Pill> : null}
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${topic.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-muted text-muted-foreground"}`}>
                          {topic.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {topic.questionCount} questions · {topic.sessionCount} sessions
                        {topic.levelCategory ? ` · ${topic.levelCategory}` : ""}
                      </div>
                      {topic.searchAliases?.length ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {topic.searchAliases.map((alias) => <Pill key={`${topic.id}-${alias}`}>{alias}</Pill>)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => void handleGenerateTopic(topic)} disabled={isGenerationBusy}>
                        {generatingTopicId === topic.id ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SparklesIcon className="mr-2 size-4" />}
                        Generate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingTopicId(topic.id);
                        setTopicForm({
                          subject: topic.subject,
                          topic: topic.topic,
                          level: topic.level,
                          field: topic.field ?? "",
                          searchAliases: (topic.searchAliases ?? []).join(", "),
                          isActive: topic.isActive,
                        });
                      }}>
                        <PencilIcon className="mr-2 size-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleToggleTopic(topic)}>
                        {topic.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="destructive" size="sm" disabled={deletingTopicId === topic.id} onClick={() => void handleDeleteTopic(topic.id)}>
                        {deletingTopicId === topic.id ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <Trash2Icon className="mr-2 size-4" />}
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Totals</CardTitle>
            <CardDescription>Track which admin created how many questions overall.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats?.adminTotals.length ? <EmptyPanel message="No generation activity has been tracked yet." /> : stats.adminTotals.map((entry) => (
              <div key={entry.adminId} className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">{entry.adminName}</div>
                  <div className="text-xs text-muted-foreground">{entry.totalRuns} runs · last {new Date(entry.lastGeneratedAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">{entry.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">questions</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Breakdown</CardTitle>
            <CardDescription>See what each admin generated on which day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats?.dailyAdminBreakdown.length ? <EmptyPanel message="Daily activity will appear here after question generation starts." /> : stats.dailyAdminBreakdown.map((entry) => (
              <div key={`${entry.day}-${entry.adminId}`} className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                <div>
                  <div className="font-medium text-foreground">{entry.adminName}</div>
                  <div className="text-xs text-muted-foreground">{entry.day} · {entry.totalRuns} runs</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">{entry.totalQuestions}</div>
                  <div className="text-xs text-muted-foreground">questions</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Each seed run logs the admin, target topic, count, and date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!stats?.recentActivity.length ? <EmptyPanel message="Recent generation activity will show up here once an admin runs a seed." /> : stats.recentActivity.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{modeLabel(entry.mode)}</Pill>
                    <Pill>{entry.subject}</Pill>
                    <Pill>{entry.topic}</Pill>
                    <Pill>{entry.level}</Pill>
                  </div>
                  <div className="text-sm text-muted-foreground">{entry.adminName} · {new Date(entry.createdAt).toLocaleString()}</div>
                  {entry.searchQuery ? <div className="text-xs text-muted-foreground">Prompt: {entry.searchQuery}</div> : null}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[220px]">
                  <MiniStat label="Created" value={`${entry.createdCount}`} />
                  <MiniStat label="Requested" value={`${entry.requestedCount}`} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">{message}</div>;
}

function GenerationProgressPanel({
  percent,
  title,
  detail,
}: {
  percent: number;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
        </div>
        <div className="shrink-0 text-sm font-semibold text-primary">{percent}%</div>
      </div>
      <Progress value={percent} className="mt-4 h-2 rounded-full bg-primary/10" />
    </div>
  );
}

function MetricCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-2 pt-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, value, onChange, step = "1" }: { label: string; value: string; onChange: (value: string) => void; step?: string }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input type="number" step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold ring-1 ring-border/60">{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}
