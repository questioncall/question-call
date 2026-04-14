"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  FlameIcon,
  Loader2Icon,
  LightbulbIcon,
  MessageSquareIcon,
  StarIcon,
  ThumbsUpIcon,
  HelpCircleIcon,
  SendIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedQuestion, AnswerFormat, AnswerVisibility, ReactionType } from "@/types/question";
import {
  QUESTION_CREATED_EVENT,
  QUESTION_FEED_CHANNEL,
  QUESTION_UPDATED_EVENT,
} from "@/lib/pusher/events";
import { getPusherClient } from "@/lib/pusher/pusherClient";
import { getChannelPath, getProfilePath } from "@/lib/user-paths";
import { cn } from "@/lib/utils";
import {
  prependFeedQuestion,
  setFeedConnectionStatus,
  setFeedQuestions,
  upsertFeedQuestion,
} from "@/store/features/feed/feed-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type WorkspaceRole = "STUDENT" | "TEACHER";
type FeedView = "all" | "waiting" | "solved" | "media" | "discussion";
type FeedSort = "hot" | "new" | "discussed";

type WorkspaceHomeProps = {
  role: WorkspaceRole;
  userId?: string;
};

type FeedEventPayload = {
  question?: FeedQuestion;
};

type PeerCommentItem = {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  studentId?: {
    _id?: string;
    name?: string;
    userImage?: string | null;
    username?: string;
  } | null;
};

type FeaturedCourse = {
  id: string;
  title: string;
  subject: string;
  level: string;
  description: string;
  thumbnailClassName: string;
};

type TopTeacherItem = {
  id: string;
  name: string;
  username: string;
  userImage?: string;
  overallScore: number;
  totalAnswered: number;
  teacherModeVerified: boolean;
};

const formatLabelMap: Record<AnswerFormat, string> = {
  ANY: "Any",
  TEXT: "Text",
  PHOTO: "Photo",
  VIDEO: "Video",
};

const formatColorMap: Record<AnswerFormat, string> = {
  ANY: "bg-muted text-muted-foreground",
  TEXT: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  PHOTO: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  VIDEO: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const visibilityLabelMap: Record<AnswerVisibility, string> = {
  PUBLIC: "Public",
  PRIVATE: "Private inbox",
};

const visibilityColorMap: Record<AnswerVisibility, string> = {
  PUBLIC: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  PRIVATE: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
};

const statusLabelMap = {
  OPEN: "Open",
  ACCEPTED: "In progress",
  SOLVED: "Solved",
  RESET: "Bumped",
} as const;

const statusColorMap = {
  OPEN: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  ACCEPTED: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  SOLVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  RESET: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
} as const;

const REACTION_CONFIG: { type: ReactionType; icon: typeof ThumbsUpIcon; label: string }[] = [
  { type: "like", icon: ThumbsUpIcon, label: "Like" },
  { type: "insightful", icon: LightbulbIcon, label: "Insightful" },
  { type: "same_doubt", icon: HelpCircleIcon, label: "Same doubt" },
];

const FEED_VIEW_OPTIONS: { value: FeedView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "solved", label: "Solved" },
  { value: "media", label: "Media" },
  { value: "discussion", label: "Discussion" },
];

const FEED_SORT_OPTIONS: {
  value: FeedSort;
  label: string;
  icon: typeof FlameIcon;
}[] = [
  { value: "hot", label: "Hot", icon: FlameIcon },
  { value: "new", label: "New", icon: Clock3Icon },
  { value: "discussed", label: "Discussed", icon: MessageSquareIcon },
];

const FEATURED_COURSES: FeaturedCourse[] = [
  {
    id: "algebra-foundations",
    title: "Algebra Foundations",
    subject: "Mathematics",
    level: "Grade 10",
    description: "Worked examples, chapter notes, and quick practice sets for daily revision.",
    thumbnailClassName: "from-sky-500 via-indigo-500 to-violet-500",
  },
  {
    id: "organic-chemistry-starter",
    title: "Organic Chemistry Starter",
    subject: "Chemistry",
    level: "Plus 2",
    description: "Reaction maps, summary sheets, and structure walkthroughs for core concepts.",
    thumbnailClassName: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    id: "physics-motion-lab",
    title: "Physics Motion Lab",
    subject: "Physics",
    level: "School level",
    description: "Clean diagrams and practical question sets around force, motion, and energy.",
    thumbnailClassName: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    id: "english-writing-essentials",
    title: "English Writing Essentials",
    subject: "English",
    level: "Bachelor",
    description: "Essay structure, grammar refreshers, and model responses for stronger writing.",
    thumbnailClassName: "from-slate-500 via-slate-700 to-slate-900",
  },
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

function dedupeComments(comments: PeerCommentItem[]) {
  const unique = new Map<string, PeerCommentItem>();

  for (const comment of comments) {
    if (comment?._id) {
      unique.set(comment._id, comment);
    }
  }

  return Array.from(unique.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function WorkspaceHome({ role, userId }: WorkspaceHomeProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: feedItems, isHydrated } = useAppSelector((state) => state.feed);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentsMap, setCommentsMap] = useState<Record<string, PeerCommentItem[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<FeedView>("all");
  const [activeSort, setActiveSort] = useState<FeedSort>("hot");
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const [topTeachers, setTopTeachers] = useState<TopTeacherItem[]>([]);
  const [isTopTeachersLoading, setIsTopTeachersLoading] = useState(false);

  const toggleAnswer = (questionId: string) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const fetchComments = async (questionId: string) => {
    try {
      const res = await fetch(`/api/questions/${questionId}/comments`);
      if (res.ok) {
        const data = (await res.json()) as PeerCommentItem[];
        setCommentsMap(prev => ({ ...prev, [questionId]: dedupeComments(data) }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = (questionId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
        if (!commentsMap[questionId]) {
          fetchComments(questionId);
        }
      }
      return next;
    });
  };

  const submitComment = async (questionId: string) => {
    const text = commentInput[questionId]?.trim();
    if (!text) return;

    setIsSubmittingComment(questionId);
    try {
      const res = await fetch(`/api/questions/${questionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      
      if (res.ok) {
        const incomingComment = data.comment as PeerCommentItem;
        const alreadyExists = (commentsMap[questionId] || []).some(
          (comment) => comment._id === incomingComment._id,
        );

        setCommentsMap(prev => {
          const existing = prev[questionId] || [];
          const nextComments = dedupeComments([incomingComment, ...existing]);
          return { ...prev, [questionId]: nextComments };
        });
        setCommentInput(prev => ({ ...prev, [questionId]: "" }));
        
        // Optimistically update the comment count on the question feed item
        const qIndex = feedItems.findIndex(q => q.id === questionId);
        if (!alreadyExists && qIndex >= 0) {
          const updatedQ = { ...feedItems[qIndex], commentCount: (feedItems[qIndex].commentCount || 0) + 1 };
          dispatch(upsertFeedQuestion(updatedQ));
        }

        if (data.milestoneReached) {
          toast.success(data.milestoneMessage || `Milestone! You earned ${data.pointsAwarded} points.`);
        }
      } else {
        toast.error(data.error || "Failed to post comment");
      }
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmittingComment(null);
    }
  };

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCourseIndex((current) => (current + 1) % FEATURED_COURSES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchTopTeachers = async () => {
      setIsTopTeachersLoading(true);
      try {
        const res = await fetch("/api/teachers/top-rated");
        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as TopTeacherItem[];
        if (isMounted) {
          setTopTeachers(data);
        }
      } catch {
        // Keep the rail resilient even if this optional data fails.
      } finally {
        if (isMounted) {
          setIsTopTeachersLoading(false);
        }
      }
    };

    fetchTopTeachers();

    return () => {
      isMounted = false;
    };
  }, []);

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
    const newReactions = [...targetQuestion.reactions];

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
      newReactions.push({ userId, type });
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

  const activeHeaderFilters = [
    ...(searchParams.get("subjects")?.split(",").map((value) => value.trim()).filter(Boolean) ?? []),
    ...(searchParams.get("streams")?.split(",").map((value) => value.trim()).filter(Boolean) ?? []),
    ...(searchParams.get("levels")?.split(",").map((value) => value.trim()).filter(Boolean) ?? []),
  ];

  const visibleFeedItems = [...feedItems]
    .filter((item) => {
      switch (activeView) {
        case "waiting":
          return item.status !== "SOLVED";
        case "solved":
          return item.status === "SOLVED";
        case "media":
          return (
            (item.images?.length ?? 0) > 0 ||
            item.answerFormat === "PHOTO" ||
            item.answerFormat === "VIDEO" ||
            (item.answer?.mediaUrls?.length ?? 0) > 0
          );
        case "discussion":
          return item.commentCount > 0;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

      if (activeSort === "new") {
        return createdAtDiff;
      }

      if (activeSort === "discussed") {
        return b.commentCount - a.commentCount || b.reactions.length - a.reactions.length || createdAtDiff;
      }

      const getHotScore = (item: FeedQuestion) =>
        item.reactions.length * 2 +
        item.commentCount * 3 +
        item.answerCount * 4 +
        (item.status === "RESET" ? 2 : 0) +
        (item.status === "ACCEPTED" ? 1 : 0);

      return getHotScore(b) - getHotScore(a) || createdAtDiff;
    });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Card className="overflow-hidden border border-border/70 bg-background shadow-sm">
          <CardContent className="overflow-x-auto py-3">
            <div className="flex min-w-max items-center gap-2">
              {FEED_VIEW_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveView(option.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeView === option.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}

              <span className="ml-2 text-xs font-medium text-muted-foreground">Sort</span>

              {FEED_SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveSort(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activeSort === value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}

              <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <SlidersHorizontalIcon className="size-3.5" />
                Header filters
              </span>

              {activeHeaderFilters.length > 0 ? (
                activeHeaderFilters.map((filterValue) => (
                  <span
                    key={filterValue}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    {filterValue}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-dashed border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                  None
                </span>
              )}
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
        {isHydrated && visibleFeedItems.length === 0 && (
          <Card className="border border-dashed border-border/70 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquareIcon className="size-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-foreground">
                {feedItems.length === 0 ? "No questions yet" : "No posts match this view"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                {feedItems.length === 0
                  ? "Be the first to post a question! Click \"Post Question\" in the header to get started."
                  : "Try a different filter or sort to bring more questions back into the stream."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Feed cards */}
        {visibleFeedItems.map((item) => {
          const isAccepted = item.status === "ACCEPTED";
          const isSolved = item.status === "SOLVED";
          const isOwnQuestion = userId === item.askerId;
          const canAccept = !isOwnQuestion && (item.status === "OPEN" || item.status === "RESET") && role === "TEACHER";
          const canOpenThread = isOwnQuestion && Boolean(item.channelId);
          const canComment = !isOwnQuestion;
          const isExpandedComments = expandedComments.has(item.id);
          const comments = dedupeComments(commentsMap[item.id] || []);
          const isAcceptLoading = acceptingId === item.id;
          const totalReactions = item.reactions.length;
          const askerProfileHref = getProfilePath({
            id: item.askerId,
            name: item.askerName,
            username: item.askerUsername,
          });

          // Determine which reaction the current user has (if any)
          const userReaction = userId
            ? item.reactions.find((r) => r.userId === userId)
            : undefined;

          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm transition-all hover:border-border hover:shadow-md"
            >
              <div className="grid md:grid-cols-[64px_minmax(0,1fr)]">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/25 px-4 py-3 md:min-h-full md:flex-col md:justify-start md:gap-3 md:border-b-0 md:border-r md:px-2 md:py-4">
                  {REACTION_CONFIG.map(({ type, icon: Icon, label }) => {
                    const count = item.reactions.filter((reaction) => reaction.type === type).length;
                    const isActive = userReaction?.type === type;

                    return (
                      <button
                        key={type}
                        type="button"
                        title={label}
                        onClick={() => handleReact(item.id, type)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors md:min-w-[44px] md:flex-col md:rounded-2xl md:px-2 md:py-2",
                          isActive
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{count}</span>
                      </button>
                    );
                  })}

                  <div className="hidden text-center text-[10px] text-muted-foreground md:block">
                    <div className="font-semibold text-foreground">{totalReactions}</div>
                    <div>reacts</div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="space-y-4 px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {item.subject || item.stream || item.level || "General"}
                          </span>
                          <span>Asked by</span>
                          <Link
                            href={askerProfileHref}
                            className="inline-flex items-center gap-2 font-medium text-foreground transition-colors hover:text-primary"
                          >
                            {item.askerImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={item.askerImage}
                                alt={item.askerName}
                                className="size-5 rounded-full border border-border/60 object-cover"
                              />
                            ) : (
                              <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {item.askerName.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span>{item.askerName}</span>
                          </Link>
                          {item.askerUsername && (
                            <span className="text-muted-foreground/80">@{item.askerUsername}</span>
                          )}
                          <span>•</span>
                          <span>{formatTimeAgo(item.createdAt)}</span>
                        </div>

                        <div className="space-y-2">
                          <h2 className="text-lg font-semibold leading-7 text-foreground sm:text-xl">
                            {item.title}
                          </h2>
                          <p className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                            {item.body}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            statusColorMap[item.status],
                          )}
                        >
                          {statusLabelMap[item.status]}
                        </span>
                        {item.resetCount > 0 && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            Reset {item.resetCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          formatColorMap[item.answerFormat],
                        )}
                      >
                        {formatLabelMap[item.answerFormat]}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          visibilityColorMap[item.answerVisibility],
                        )}
                      >
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

                    {item.images && item.images.length > 0 && (
                      <div
                        className={cn(
                          "grid gap-2 overflow-hidden rounded-2xl",
                          item.images.length === 1 ? "grid-cols-1" : "grid-cols-2",
                        )}
                      >
                        {item.images.map((imgUrl, index) => (
                          <a
                            key={index}
                            href={imgUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group block overflow-hidden rounded-xl border border-border/70 bg-muted/10"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`Question media ${index + 1}`}
                              className="h-44 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02] sm:h-56"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {isAccepted && (
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3">
                        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
                          {item.acceptedByName
                            ? `${item.acceptedByName} is already working on this question.`
                            : "This question is currently being answered."}
                        </p>
                        {item.acceptedAt && (
                          <p className="mt-1 text-xs text-sky-700/70 dark:text-sky-300/70">
                            Accepted {formatTimeAgo(item.acceptedAt)}
                          </p>
                        )}
                      </div>
                    )}

                    {isSolved && (
                      <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05]">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-500/[0.08]"
                          onClick={() => item.answer && toggleAnswer(item.id)}
                        >
                          <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                              Accepted answer
                            </p>
                            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                              {item.answer?.acceptorName || item.acceptedByName || "Teacher"} solved this question.
                            </p>
                          </div>
                          {item.answer ? (
                            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              <span>{expandedAnswers.has(item.id) ? "Hide" : "View"}</span>
                              <ChevronDownIcon
                                className={cn(
                                  "size-4 transition-transform duration-200",
                                  expandedAnswers.has(item.id) && "rotate-180",
                                )}
                              />
                            </div>
                          ) : null}
                        </button>

                        {item.answer && expandedAnswers.has(item.id) && (
                          (() => {
                            const answer = item.answer;

                            return (
                              <div className="space-y-4 border-t border-emerald-500/15 bg-background/95 px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {answer.acceptorName || "Teacher"}
                                </p>
                                {answer.submittedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Posted {formatTimeAgo(answer.submittedAt)}
                                  </p>
                                )}
                              </div>

                              {answer.rating != null && (
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <StarIcon
                                      key={star}
                                      className={cn(
                                        "size-3.5",
                                        star <= Math.round(answer.rating ?? 0)
                                          ? "fill-amber-400 text-amber-400"
                                          : "text-muted-foreground/30",
                                      )}
                                    />
                                  ))}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    {Number(answer.rating).toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {answer.content && (
                              <p className="text-sm leading-7 text-foreground whitespace-pre-wrap">
                                {answer.content}
                              </p>
                            )}

                            {answer.mediaUrls && answer.mediaUrls.length > 0 && (
                              <div
                                className={cn(
                                  "grid gap-2 overflow-hidden rounded-2xl",
                                  answer.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2",
                                )}
                              >
                                {answer.mediaUrls.map((url, index) => {
                                  const isVideo =
                                    url.includes("/video/") ||
                                    url.endsWith(".mp4") ||
                                    url.endsWith(".webm");

                                  return isVideo ? (
                                    <video
                                      key={index}
                                      src={url}
                                      controls
                                      className="h-full max-h-80 w-full rounded-xl border border-border bg-muted/30"
                                    />
                                  ) : (
                                    <a
                                      key={index}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="group block overflow-hidden rounded-xl border border-border/70 bg-muted/10"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={`Answer media ${index + 1}`}
                                        className="h-48 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                                      />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {!isAccepted && !isSolved && (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Answer lane
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {item.previewAuthor || "No public answer yet"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {item.previewText || "Accept this question and be the first to help with a clear answer."}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/[0.18] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleComments(item.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          isExpandedComments
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <MessageSquareIcon className="size-3.5" />
                        {item.commentCount} comments
                      </button>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                        <CheckCircle2Icon className="size-3.5" />
                        {item.answerCount} answers
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                        <ThumbsUpIcon className="size-3.5" />
                        {totalReactions} reacts
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {canComment && (
                        <Button
                          onClick={() => toggleComments(item.id)}
                          size="sm"
                          variant={isExpandedComments ? "secondary" : "outline"}
                        >
                          <MessageSquareIcon className="mr-1 size-3.5" />
                          Comment
                        </Button>
                      )}

                      {canAccept && (
                        <Button disabled={isAcceptLoading} onClick={() => handleAccept(item.id)} size="sm">
                          {isAcceptLoading ? (
                            <Loader2Icon className="mr-1 size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2Icon className="mr-1 size-3.5" />
                          )}
                          Accept
                        </Button>
                      )}

                      {canOpenThread && (
                        <Button asChild size="sm" variant="ghost">
                          <Link href={getChannelPath(item.channelId)}>
                            Open thread
                            <ArrowUpRightIcon />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                  {isExpandedComments && (
                    <div className="border-t border-border/60 bg-background px-4 py-4">
                      <div className="space-y-4">
                        <div className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
                          {comments.length === 0 ? (
                            <p className="py-2 text-sm text-muted-foreground">
                              No comments yet. The first reply will appear here.
                            </p>
                          ) : (
                            comments.map((comment) => (
                              <div key={comment._id} className="flex gap-3">
                                {comment.studentId?.userImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={comment.studentId.userImage}
                                    alt={comment.studentId.name || "User"}
                                    className="size-8 rounded-full border border-border/60 object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {(comment.studentId?.name || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 border-l-2 border-border/60 pl-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      {comment.studentId?.name || "Anonymous"}
                                    </span>
                                    {comment.studentId?.username && (
                                      <span>@{comment.studentId.username}</span>
                                    )}
                                    <span>•</span>
                                    <span>{formatTimeAgo(comment.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 text-sm leading-6 text-foreground/90 whitespace-pre-wrap">
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {canComment && (
                          <div className="rounded-2xl border border-border/70 bg-muted/10 p-3">
                            <div className="relative">
                              <textarea
                                placeholder="Add a comment to this question..."
                                className="min-h-[48px] w-full resize-none rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                rows={1}
                                value={commentInput[item.id] || ""}
                                onChange={(e) => {
                                  setCommentInput((prev) => ({ ...prev, [item.id]: e.target.value }));
                                  e.target.style.height = "auto";
                                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    submitComment(item.id);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="absolute right-3 top-3 p-1 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
                                disabled={isSubmittingComment === item.id || !commentInput[item.id]?.trim()}
                                onClick={() => submitComment(item.id)}
                              >
                                {isSubmittingComment === item.id ? (
                                  <Loader2Icon className="size-4 animate-spin" />
                                ) : (
                                  <SendIcon className="size-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden border border-border/70 bg-background shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-base">Course highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeCourseIndex * 100}%)` }}
              >
                {FEATURED_COURSES.map((course) => (
                  <div key={course.id} className="min-w-full">
                    <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                      <div className={cn("relative h-40 bg-gradient-to-br", course.thumbnailClassName)}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_45%)]" />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                          <BookOpenIcon className="size-3" />
                          {course.subject}
                        </div>
                        <div className="absolute inset-x-4 bottom-4">
                          <p className="text-lg font-semibold text-white">{course.title}</p>
                          <p className="mt-1 text-sm text-white/85">{course.level}</p>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Thumbnail preview</span>
                          <span>Course ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {FEATURED_COURSES.map((course, index) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setActiveCourseIndex(index)}
                    className={cn(
                      "size-2.5 rounded-full transition-colors",
                      index === activeCourseIndex ? "bg-primary" : "bg-border",
                    )}
                    aria-label={`Show course ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setActiveCourseIndex((current) =>
                      current === 0 ? FEATURED_COURSES.length - 1 : current - 1,
                    )
                  }
                  className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Previous course"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCourseIndex((current) => (current + 1) % FEATURED_COURSES.length)
                  }
                  className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Next course"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-border/70 bg-background shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardDescription>Top rated teachers</CardDescription>
            <CardTitle className="text-base">Trusted answerers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {isTopTeachersLoading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="rounded-xl border border-border/70 bg-muted/15 p-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-3 h-3 w-20" />
                  <Skeleton className="mt-3 h-9 w-full" />
                </div>
              ))
            ) : topTeachers.length > 0 ? (
              topTeachers.map((teacher, index) => (
                <Link
                  key={teacher.id}
                  href={getProfilePath({
                    id: teacher.id,
                    name: teacher.name,
                    username: teacher.username,
                  })}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/15 p-4 transition-colors hover:border-primary/30 hover:bg-muted/25"
                >
                  <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </div>

                  {teacher.userImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={teacher.userImage}
                      alt={teacher.name}
                      className="size-10 rounded-full border border-border/60 object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{teacher.name}</p>
                        <p className="text-xs text-muted-foreground">@{teacher.username}</p>
                      </div>
                      {teacher.teacherModeVerified && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={cn(
                              "size-3.5",
                              star <= Math.round(teacher.overallScore)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {teacher.overallScore.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {teacher.totalAnswered} answers
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
                Top rated teachers will appear here as soon as ratings start coming in.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
