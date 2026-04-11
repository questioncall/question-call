"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { CheckCircle2Icon, Clock3Icon, ShieldAlertIcon, TrophyIcon, XCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoints } from "@/lib/points";
import type { QuizSessionResponse } from "@/types/quiz";

function getSubmitReasonLabel(reason: QuizSessionResponse["submitReason"]) {
  if (reason === "TIME_EXPIRED") {
    return "Auto-submitted when the timer expired";
  }

  if (reason === "ANTI_CHEAT") {
    return "Auto-submitted after repeated quiz-rule violations";
  }

  return "Submitted manually";
}

export function QuizResultsView({
  session,
  showBackLink = true,
}: {
  session: QuizSessionResponse;
  showBackLink?: boolean;
}) {
  const passed = session.score >= session.passPercent;
  const correctCount = session.questions.filter((question) => question.isCorrect).length;
  const incorrectCount = session.questionCount - correctCount;

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-background/95">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              {session.quizType === "FREE" ? "Free Quiz" : "Premium Quiz"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {session.subject} · {session.topic} · {session.level}
            </span>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">
                {passed ? "Quiz passed" : "Quiz finished"}
              </CardTitle>
              <CardDescription>
                {getSubmitReasonLabel(session.submitReason)}
              </CardDescription>
            </div>
            {showBackLink ? (
              <Button asChild variant="outline">
                <Link href="/quiz">Back to quiz hub</Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <ResultMetric
            icon={<TrophyIcon className="size-5 text-amber-500" />}
            label="Score"
            value={`${session.score.toFixed(2)}%`}
          />
          <ResultMetric
            icon={<CheckCircle2Icon className="size-5 text-emerald-500" />}
            label="Correct"
            value={`${correctCount}/${session.questionCount}`}
          />
          <ResultMetric
            icon={<XCircleIcon className="size-5 text-rose-500" />}
            label="Incorrect"
            value={`${incorrectCount}`}
          />
          <ResultMetric
            icon={<Clock3Icon className="size-5 text-primary" />}
            label="Reward"
            value={`${formatPoints(session.pointsAwarded)} pts`}
          />
        </CardContent>
      </Card>

      {session.submitReason === "ANTI_CHEAT" ? (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="mt-0.5 size-5 shrink-0" />
            <div>
              The session was auto-submitted after exceeding the allowed warning count. Your latest saved answers were used for scoring.
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {session.questions.map((question, index) => {
          const selectedOptionIndex =
            question.selectedOptionIndex === undefined ? null : question.selectedOptionIndex;

          return (
            <Card key={question.id} className="border-border/70">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Question {index + 1}
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm text-foreground">
                      {question.questionText}
                    </CardDescription>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      question.isCorrect
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                    }`}
                  >
                    {question.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {question.options.map((option, optionIndex) => {
                  const isCorrectOption = question.correctOptionIndex === optionIndex;
                  const isSelected = selectedOptionIndex === optionIndex;

                  return (
                    <div
                      key={`${question.id}-${optionIndex}`}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        isCorrectOption
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                          : isSelected
                            ? "border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-950/30"
                            : "border-border/70 bg-muted/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span>{option}</span>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {isCorrectOption ? "Correct answer" : isSelected ? "Your answer" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {question.explanation ? (
                  <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {question.explanation}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ResultMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-full bg-background p-2 ring-1 ring-border/60">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
