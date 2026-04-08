"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  Loader2Icon,
  LightbulbIcon,
  MessageSquareIcon,
  ThumbsUpIcon,
  HelpCircleIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedQuestion, QuestionTier, AnswerVisibility, ReactionType } from "@/types/question";
import {
  QUESTION_CREATED_EVENT,
  QUESTION_FEED_CHANNEL,
  QUESTION_UPDATED_EVENT,
} from "@/lib/pusher/events";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { getChannelPath } from "@/lib/user-paths";
import {
  hydrateFeed,
  prependFeedQuestion,
  setFeedConnectionStatus,
  setFeedQuestions,
  upsertFeedQuestion,
} from "@/store/features/feed/feed-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type WorkspaceRole = "STUDENT" | "TEACHER";

type WorkspaceHomeProps = {
  role: WorkspaceRole;
  name?: string | null;
  userId?: string;
};

type FeedEventPayload = {
  question?: FeedQuestion;
};

const tierLabelMap: Record<QuestionTier, string> = {
  UNSET: "Any answer type",
  ONE: "Text answer",
  TWO: "Photo answer",
  THREE: "Video based answer",
};

const tierColorMap: Record<QuestionTier, string> = {
  UNSET: "bg-muted text-muted-foreground",
  ONE: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  TWO: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  THREE: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

const visibilityLabelMap: Record<AnswerVisibility, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private",
};

const REACTION_CONFIG: { type: ReactionType; icon: typeof ThumbsUpIcon; label: string }[] = [
  { type: "like", icon: ThumbsUpIcon, label: "Like" },
  { type: "insightful", icon: LightbulbIcon, label: "Insightful" },
  { type: "same_doubt", icon: HelpCircleIcon, label: "Same doubt" },
];

function formatTimeAgo(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "just now";
  }

  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getQuestionChips(question: FeedQuestion) {
  return [question.level, question.stream, question.subject].filter(Boolean) as string[];
}

export function WorkspaceHome({ role, name, userId }: WorkspaceHomeProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items: feedItems, isHydrated, connectionStatus } = useAppSelector((state) => state.feed);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [reactingId, setReactingId] = useState<string | null>(null);

  // Fetch feed from API on mount
  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/questions/feed");
      if (res.ok) {
        const data: FeedQuestion[] = await res.json();
        dispatch(setFeedQuestions(data));
      }
    } catch {
      // Silently fall back — Pusher will keep it updated
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!isHydrated) {
      fetchFeed();
    }
  }, [fetchFeed, isHydrated]);

  // Pusher real-time subscription
  useEffect(() => {
    const client = getPusherClient();

    if (!client) {
      return;
    }

    dispatch(setFeedConnectionStatus("connecting"));

    const channel = client.subscribe(QUESTION_FEED_CHANNEL);

    const handleCreated = (payload: FeedEventPayload) => {
      if (!payload.question) {
        return;
      }

      dispatch(prependFeedQuestion(payload.question));
    };

    const handleUpdated = (payload: FeedEventPayload) => {
      if (!payload.question) {
        return;
      }

      dispatch(upsertFeedQuestion(payload.question));
    };

    const handleConnected = () => {
      dispatch(setFeedConnectionStatus("connected"));
    };

    const handleError = () => {
      dispatch(setFeedConnectionStatus("failed"));
    };

    channel.bind(QUESTION_CREATED_EVENT, handleCreated);
    channel.bind(QUESTION_UPDATED_EVENT, handleUpdated);
    client.connection.bind("connected", handleConnected);
    client.connection.bind("error", handleError);

    return () => {
      channel.unbind(QUESTION_CREATED_EVENT, handleCreated);
      channel.unbind(QUESTION_UPDATED_EVENT, handleUpdated);
      client.connection.unbind("connected", handleConnected);
      client.connection.unbind("error", handleError);
      client.unsubscribe(QUESTION_FEED_CHANNEL);
    };
  }, [dispatch]);

  // Handle accept question
  const handleAccept = async (questionId: string) => {
    setAcceptingId(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        // Update feed state
        dispatch(upsertFeedQuestion(data as FeedQuestion));
        // Auto-redirect to the channel
        if (data.channelId) {
          router.push(`/channel/${data.channelId}`);
        }
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setAcceptingId(null);
    }
  };

  // Handle reaction toggle
  const handleReact = async (questionId: string, type: ReactionType) => {
    if (!userId) return;
    
    const targetQuestion = feedItems.find(item => item.id === questionId);
    if (!targetQuestion) return;

    // Optimistically calculate new reactions
    const userReactionIndex = targetQuestion.reactions.findIndex(r => r.userId === userId);
    let newReactions = [...targetQuestion.reactions];

    if (userReactionIndex >= 0) {
      if (newReactions[userReactionIndex].type === type) {
        // Same reaction clicked, toggle it off
        newReactions.splice(userReactionIndex, 1);
      } else {
        // Different reaction clicked, switch to the new one
        newReactions[userReactionIndex] = { ...newReactions[userReactionIndex], type };
      }
    } else {
      // No prior reaction, add it
      newReactions.push({ userId, type } as any);
    }

    const optimisticQuestion = { ...targetQuestion, reactions: newReactions };
    dispatch(upsertFeedQuestion(optimisticQuestion));

    try {
      const res = await fetch(`/api/questions/${questionId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        const updated: FeedQuestion = await res.json();
        dispatch(upsertFeedQuestion(updated));
      } else {
        // Revert on fail
        dispatch(upsertFeedQuestion(targetQuestion));
      }
    } catch {
      // Revert on fail
      dispatch(upsertFeedQuestion(targetQuestion));
    }
  };

  const openQuestionCount = feedItems.filter((item) => item.status === "OPEN" || item.status === "RESET").length;
  const tierOneCount = feedItems.filter((item) => item.tier === "ONE").length;
  const newestQuestion = feedItems[0];

  const rightRailItems = [
    {
      title: "Today's queue",
      value: `${openQuestionCount} open questions`,
      text: "Questions waiting for someone to accept and solve them.",
    },
    {
      title: "Fastest replies",
      value: `${tierOneCount} Text requests`,
      text: "Text-only questions that can be answered quickly.",
    },
    {
      title: "Latest arrival",
      value: newestQuestion?.askerName || "No questions yet",
      text: newestQuestion?.title || "Once questions start flowing in, the newest will appear here.",
    },
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Home feed</CardTitle>
            <CardDescription>
              Welcome back{typeof name === "string" && name ? `, ${name}` : ""}. Browse questions, react, or accept one to start helping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {[
                "All questions",
                "Recent answers",
                "Text answers",
                "Photo answers",
                "Video requests",
              ].map((filter) => (
                <Button key={filter} size="sm" variant="outline">
                  {filter}
                </Button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                Feed sync: {connectionStatus}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Loading skeleton */}
        {isLoading && !isHydrated && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border/70 shadow-sm">
                <CardHeader>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-5 w-72 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isHydrated && feedItems.length === 0 && (
          <Card className="border border-dashed border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquareIcon className="size-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-foreground">No questions yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Be the first to post a question! Click &quot;Post Question&quot; in the header to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Feed cards */}
        {feedItems.map((item) => {
          const isAccepted = item.status === "ACCEPTED";
          const isSolved = item.status === "SOLVED";
          const isOwnQuestion = userId === item.askerId;
          const canAccept = !isOwnQuestion && (item.status === "OPEN" || item.status === "RESET");
          const isAcceptLoading = acceptingId === item.id;

          // Determine which reaction the current user has (if any)
          const userReaction = userId
            ? item.reactions.find((r) => r.userId === userId)
            : undefined;

          return (
            <Card key={item.id} className="border border-border/70 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardDescription className="flex items-center gap-2 flex-wrap text-sm">
                  <Link href={`/profile/${item.askerId}`} className="group flex items-center gap-2 font-medium text-foreground/80 transition-colors">
                    {item.askerImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.askerImage} alt={item.askerName} className="size-6 rounded-full object-cover shadow-sm border border-border/50" />
                    ) : (
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shadow-sm border border-primary/20">
                        {item.askerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="group-hover:text-primary group-hover:underline decoration-primary/50 underline-offset-2">{item.askerName}</span>
                  </Link>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-muted-foreground">{formatTimeAgo(item.createdAt)}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-muted-foreground">{item.subject || "General"}</span>
                </CardDescription>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tierColorMap[item.tier]}`}>
                    {tierLabelMap[item.tier]}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                    {visibilityLabelMap[item.answerVisibility]}
                  </span>
                  {getQuestionChips(item).map((chip) => (
                    <span
                      key={`${item.id}-${chip}`}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {/* Body */}
                <p className="text-sm leading-7 text-muted-foreground">{item.body}</p>

                {/* Attached Images */}
                {item.images && item.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    {item.images.map((imgUrl, i) => (
                      <a 
                        key={i} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="block overflow-hidden rounded-md border border-border/70 hover:opacity-90 transition-opacity"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt="Attached question media" className="h-28 w-28 object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Accepted state banner */}
                {isAccepted && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-start gap-3">
                    <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Question accepted — waiting for answer
                      </p>
                      {item.acceptedByName && (
                        <p className="mt-0.5 text-xs text-green-600/70 dark:text-green-400/70">
                          Accepted by {item.acceptedByName}
                          {item.acceptedAt && ` • ${formatTimeAgo(item.acceptedAt)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Solved state banner */}
                {isSolved && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                    <CheckCircle2Icon className="size-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        This question has been solved
                      </p>
                    </div>
                  </div>
                )}

                {/* Top answer preview — only for open questions */}
                {!isAccepted && !isSolved && (
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Top answer preview
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {item.previewAuthor || "Waiting for a reply"}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      {item.previewText || "Accept this question and be the first to help!"}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                {/* Reaction buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {REACTION_CONFIG.map(({ type, icon: Icon, label }) => {
                    const count = item.reactions.filter((r) => r.type === type).length;
                    const isActive = userReaction?.type === type;

                    return (
                      <button
                        key={type}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                        }`}
                        onClick={() => handleReact(item.id, type)}
                        title={label}
                        type="button"
                      >
                        <Icon className="size-3.5" />
                        {count > 0 && <span>{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  {/* Answer count */}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquareIcon className="size-3.5" />
                    {item.answerCount} answers
                  </span>

                  {/* Accept button */}
                  {canAccept && (
                    <Button
                      disabled={isAcceptLoading}
                      onClick={() => handleAccept(item.id)}
                      size="sm"
                    >
                      {isAcceptLoading ? (
                        <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2Icon className="mr-1 size-3.5" />
                      )}
                      Accept
                    </Button>
                  )}

                  {/* Open thread link */}
                  <Button asChild size="sm" variant="ghost">
                    <Link href={getChannelPath(item.id)}>
                      Open thread
                      <ArrowUpRightIcon />
                    </Link>
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>What this layout is for</CardTitle>
            <CardDescription>
              Sidebar for navigation, GitHub-style header for control, and a central feed for questions and answers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm leading-7 text-muted-foreground">
              The feed cards now come from MongoDB via the API. Real-time updates arrive through Pusher.
            </div>
            <Separator />
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                Home acts as the shared question-and-answer feed.
              </div>
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                New questions appear instantly via Pusher broadcast.
              </div>
              <div className="flex items-center gap-2">
                <BookOpenIcon className="size-4 text-primary" />
                React to questions or accept them to start solving.
              </div>
            </div>
          </CardContent>
        </Card>

        {rightRailItems.map((item) => (
          <Card key={item.title} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle>{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
