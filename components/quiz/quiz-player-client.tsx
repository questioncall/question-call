"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MonitorStopIcon,
  ShieldAlertIcon,
  TimerIcon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { QuizResultsView } from "@/components/quiz/quiz-results-view";
import { formatPoints } from "@/lib/points";
import type { QuizSessionResponse, QuizViolationType } from "@/types/quiz";

const VIOLATION_MESSAGES: Record<QuizViolationType, string> = {
  FULLSCREEN_EXIT: "Fullscreen mode was exited.",
  TAB_HIDDEN: "The quiz tab was hidden or switched away from.",
  WINDOW_BLUR: "The quiz window lost focus.",
  PAGE_HIDE: "The quiz page tried to move out of view.",
  BEFORE_UNLOAD: "A browser leave action was triggered.",
  BACK_NAVIGATION: "Back navigation was attempted during the quiz.",
  DUPLICATE_TAB: "This quiz session was opened in another browser tab.",
};

function toTimerLabel(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function QuizPlayerClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<QuizSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(true);
  const [stopOpen, setStopOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const sessionRef = useRef<QuizSessionResponse | null>(null);
  const lastViolationAtRef = useRef(0);
  const duplicateTabHandledRef = useRef(false);
  const submittingRef = useRef(false);

  const persistProgress = useCallback(async (
    payload: {
      answers?: Array<{ questionId: string; selectedOptionIndex: number | null }>;
      heartbeat?: boolean;
      violation?: { type: QuizViolationType; details?: string };
    },
    keepalive = false,
  ) => {
    try {
      const response = await fetch(`/api/quiz/${sessionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        submitted?: boolean;
        session?: QuizSessionResponse;
        autoSubmitReason?: string;
      };

      if (data.session) {
        setSession(data.session);
        if (data.session.status !== "IN_PROGRESS") {
          setPreflightOpen(false);
          setWarningOpen(false);
        }
      }

      if (data.submitted && data.autoSubmitReason === "ANTI_CHEAT") {
        setWarningOpen(false);
      }
    } catch {
      // Keep the quiz running even if a background sync attempt fails.
    }
  }, [sessionId]);

  const registerViolation = useCallback(async (type: QuizViolationType) => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "IN_PROGRESS" || submittingRef.current) {
      return;
    }

    const now = Date.now();
    if (now - lastViolationAtRef.current < 1200) {
      return;
    }

    lastViolationAtRef.current = now;
    setWarningMessage(VIOLATION_MESSAGES[type]);

    try {
      const response = await fetch(`/api/quiz/${sessionId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heartbeat: true,
          violation: {
            type,
            details: VIOLATION_MESSAGES[type],
          },
        }),
      });

      const data = (await response.json()) as {
        submitted?: boolean;
        session?: QuizSessionResponse;
      };

      if (!response.ok) {
        return;
      }

      if (data.session) {
        setSession(data.session);
      }

      if (data.submitted || data.session?.status === "SUBMITTED") {
        setPreflightOpen(false);
        setWarningOpen(false);
        return;
      }

      setWarningOpen(true);
    } catch {
      setWarningOpen(true);
    }
  }, [sessionId]);

  const handleAutoSubmit = useCallback(async (reason: "TIME_EXPIRED" | "ANTI_CHEAT") => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "IN_PROGRESS" || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/quiz/${sessionId}/auto-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          answers: currentSession.questions.map((question) => ({
            questionId: question.id,
            selectedOptionIndex:
              question.selectedOptionIndex === undefined ? null : question.selectedOptionIndex,
          })),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        session?: QuizSessionResponse;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.error || "Failed to auto-submit quiz.");
      }

      setSession(data.session);
      setPreflightOpen(false);
      setWarningOpen(false);
      setStopOpen(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to auto-submit quiz.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [sessionId]);

  useEffect(() => {
    sessionRef.current = session;
  }, [handleAutoSubmit, session]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/quiz/${sessionId}`, { cache: "no-store" });
        const data = (await response.json()) as {
          error?: string;
          session?: QuizSessionResponse;
        };

        if (!response.ok || !data.session) {
          throw new Error(data.error || "Failed to load quiz session.");
        }

        if (!active) {
          return;
        }

        setSession(data.session);
        setRemainingMs(
          Math.max(0, new Date(data.session.timerDeadline).getTime() - Date.now()),
        );
        setPreflightOpen(data.session.status === "IN_PROGRESS");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load quiz session.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [sessionId]);

  const currentQuestion = useMemo(() => {
    if (!session) {
      return null;
    }

    return session.questions[currentIndex] ?? null;
  }, [currentIndex, session]);

  const answeredCount = useMemo(() => {
    if (!session) {
      return 0;
    }

    return session.questions.filter((question) => question.selectedOptionIndex !== null).length;
  }, [session]);

  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") {
      return;
    }

    setRemainingMs(Math.max(0, new Date(session.timerDeadline).getTime() - Date.now()));

    const interval = window.setInterval(() => {
      const nextRemaining = Math.max(
        0,
        new Date(session.timerDeadline).getTime() - Date.now(),
      );

      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        void handleAutoSubmit("TIME_EXPIRED");
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [handleAutoSubmit, session]);

  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") {
      return;
    }

    const interval = window.setInterval(() => {
      void persistProgress({ heartbeat: true });
    }, 15000);

    return () => {
      window.clearInterval(interval);
    };
  }, [persistProgress, session]);

  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") {
      return;
    }

    duplicateTabHandledRef.current = false;
    let channel: BroadcastChannel | null = null;
    const tabId = `${session.id}-${Math.random().toString(36).slice(2)}`;

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(`quiz-session-${session.id}`);
      channel.onmessage = (event) => {
        const data = event.data as { type?: string; tabId?: string } | null;
        if (
          data?.type === "QUIZ_PRESENCE" &&
          data.tabId &&
          data.tabId !== tabId &&
          !duplicateTabHandledRef.current
        ) {
          duplicateTabHandledRef.current = true;
          void registerViolation("DUPLICATE_TAB");
        }
      };

      const announcePresence = () => {
        channel?.postMessage({ type: "QUIZ_PRESENCE", tabId });
      };

      announcePresence();
      const interval = window.setInterval(announcePresence, 8000);

      return () => {
        window.clearInterval(interval);
        channel?.close();
      };
    }

    return;
  }, [registerViolation, session]);

  useEffect(() => {
    if (!session || session.status !== "IN_PROGRESS") {
      return;
    }

    const historyState = { quizSessionId: session.id };
    window.history.pushState(historyState, "", window.location.href);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void registerViolation("TAB_HIDDEN");
      }
    };

    const onBlur = () => {
      void registerViolation("WINDOW_BLUR");
    };

    const onFullscreenChange = () => {
      if (!preflightOpen && !document.fullscreenElement) {
        void registerViolation("FULLSCREEN_EXIT");
      }
    };

    const onPopState = () => {
      window.history.pushState(historyState, "", window.location.href);
      void registerViolation("BACK_NAVIGATION");
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      void persistProgress({ heartbeat: true }, true);
    };

    const onPageHide = () => {
      void persistProgress({ heartbeat: true }, true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [persistProgress, preflightOpen, registerViolation, session]);

  async function requestFullscreen() {
    if (!document.documentElement.requestFullscreen) {
      throw new Error("Fullscreen mode is not supported in this browser.");
    }

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  }

  async function beginQuiz() {
    try {
      await requestFullscreen();
      setPreflightOpen(false);
      setWarningOpen(false);
    } catch (fullscreenError) {
      setError(
        fullscreenError instanceof Error
          ? fullscreenError.message
          : "Fullscreen mode is required to start this quiz.",
      );
    }
  }

  async function handleOptionSelect(optionIndex: number) {
    if (!session || session.status !== "IN_PROGRESS" || !currentQuestion) {
      return;
    }

    setSession((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        questions: current.questions.map((question) =>
          question.id === currentQuestion.id
            ? { ...question, selectedOptionIndex: optionIndex }
            : question,
        ),
      };
    });

    await persistProgress({
      answers: [{ questionId: currentQuestion.id, selectedOptionIndex: optionIndex }],
    });
  }

  async function handleSubmit() {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.status !== "IN_PROGRESS" || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/quiz/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: currentSession.questions.map((question) => ({
            questionId: question.id,
            selectedOptionIndex:
              question.selectedOptionIndex === undefined ? null : question.selectedOptionIndex,
          })),
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        session?: QuizSessionResponse;
      };

      if (!response.ok || !data.session) {
        throw new Error(data.error || "Failed to submit quiz.");
      }

      setSession(data.session);
      setPreflightOpen(false);
      setWarningOpen(false);
      setStopOpen(false);
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit quiz.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (session.status !== "IN_PROGRESS") {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,#09090b_0%,#111827_100%)]">
        <div className="mx-auto max-w-5xl">
          <QuizResultsView session={session} />
        </div>
      </div>
    );
  }

  const progressValue =
    session.questionCount > 0 ? (answeredCount / session.questionCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#050816_0%,#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 lg:px-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/90">
                <span>{session.quizType === "FREE" ? "Free quiz" : "Premium quiz"}</span>
                <span className="text-slate-500">•</span>
                <span>{session.subject}</span>
                <span className="text-slate-500">•</span>
                <span>{session.topic}</span>
                <span className="text-slate-500">•</span>
                <span>{session.level}</span>
              </div>
              <div className="text-2xl font-semibold text-white">
                Full-screen quiz in progress
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100">
                <TimerIcon className="mr-2 inline-block size-4" />
                {toTimerLabel(remainingMs)}
              </div>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                Reward on pass: {formatPoints(session.pointReward)} pts
              </div>
              <Button
                variant="destructive"
                className="rounded-full"
                disabled={isSubmitting}
                onClick={() => setStopOpen(true)}
              >
                <MonitorStopIcon className="mr-2 size-4" />
                Stop quiz
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>
                Answered {answeredCount}/{session.questionCount}
              </span>
              <span>
                Warnings {session.violationCount}/{session.warningLimit + 1}
              </span>
            </div>
            <Progress className="h-2 bg-white/10" value={progressValue} />
          </div>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Questions
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-4">
              {session.questions.map((question, index) => {
                const answered = question.selectedOptionIndex !== null;
                const active = index === currentIndex;

                return (
                  <button
                    key={question.id}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : answered
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20"
                    }`}
                    onClick={() => setCurrentIndex(index)}
                    type="button"
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            {currentQuestion ? (
              <div className="flex h-full flex-col gap-6">
                <div className="space-y-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Question {currentIndex + 1}
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight text-white">
                    {currentQuestion.questionText}
                  </h2>
                </div>

                <div className="grid gap-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = currentQuestion.selectedOptionIndex === optionIndex;

                    return (
                      <button
                        key={`${currentQuestion.id}-${optionIndex}`}
                        type="button"
                        onClick={() => void handleOptionSelect(optionIndex)}
                        disabled={isSubmitting}
                        className={`rounded-2xl border px-4 py-4 text-left text-base transition ${
                          selected
                            ? "border-primary bg-primary/20 text-white ring-2 ring-primary/30"
                            : "border-white/10 bg-slate-950/40 text-slate-100 hover:border-white/20 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-current/20 bg-white/5 text-sm font-semibold">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-slate-100 hover:bg-white/10"
                    disabled={currentIndex === 0 || isSubmitting}
                    onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                  >
                    <ChevronLeftIcon className="mr-2 size-4" />
                    Previous
                  </Button>
                  <Button
                    className="sm:ml-auto"
                    onClick={() =>
                      setCurrentIndex((current) =>
                        Math.min(session.questions.length - 1, current + 1),
                      )
                    }
                    disabled={currentIndex === session.questions.length - 1 || isSubmitting}
                  >
                    Next question
                    <ChevronRightIcon className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      <Dialog open={preflightOpen} onOpenChange={() => undefined}>
        <DialogContent className="max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Ready to enter quiz mode?</DialogTitle>
            <DialogDescription>
              This session runs outside the workspace shell, requires fullscreen, and syncs your
              answers as you go. Leaving fullscreen or switching away will count as a warning.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <LockKeyholeIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Fullscreen is required before the quiz begins.</span>
            </div>
            <div className="flex items-start gap-3">
              <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                First two violations warn you. The next violation auto-submits the quiz.
              </span>
            </div>
            <div className="flex items-start gap-3">
              <TimerIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>The timer is already running, so enter quiz mode as soon as possible.</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void beginQuiz()} className="w-full">
              {isSubmitting ? "Submitting..." : "Enter fullscreen and begin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warningOpen} onOpenChange={() => undefined}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Stay inside the quiz</DialogTitle>
            <DialogDescription>
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" />
              <div>
                Warning {session.violationCount}/{session.warningLimit + 1}. The next violation after your allowed warnings will auto-submit this session.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void beginQuiz()} className="w-full">
              {isSubmitting ? "Submitting..." : "Return to fullscreen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={stopOpen} onOpenChange={setStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your quiz now?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {session.questionCount} questions. Unanswered
              questions will be submitted as incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={() => void handleSubmit()}>
              Submit now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
