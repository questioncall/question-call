"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Trash2, Loader2 } from "lucide-react";

interface AnswerData {
  content?: string;
  mediaUrls?: string[];
}

interface QuestionData {
  _id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  answerId: AnswerData | null;
}

interface ProfileQuestionsTabProps {
  questions: QuestionData[];
  currentUserId?: string;
  username?: string;
  totalCount?: number;
}

export function ProfileQuestionsTab({
  questions,
  currentUserId,
  username,
  totalCount = 0,
}: ProfileQuestionsTabProps) {
  const [localQuestions, setLocalQuestions] = useState(questions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(
    questions.length < totalCount,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!username || isLoadingMore || !hasMoreQuestions) return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(
        `/api/profile-questions?username=${encodeURIComponent(username)}&offset=${localQuestions.length}&limit=10`,
      );

      if (response.ok) {
        const data = await response.json();
        setLocalQuestions((prev) => [...prev, ...data.questions]);
        setHasMoreQuestions(data.hasMore);
      } else {
        console.error("Failed to load more questions");
      }
    } catch (error) {
      console.error("Error loading more questions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return localQuestions;
    const query = searchQuery.toLowerCase();
    return localQuestions.filter(
      (q) =>
        q.title.toLowerCase().includes(query) ||
        q.body.toLowerCase().includes(query),
    );
  }, [localQuestions, searchQuery]);

  const handleDelete = async (questionId: string) => {
    setDeletingId(questionId);
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLocalQuestions((prev) => prev.filter((q) => q._id !== questionId));
      } else {
        console.error("Delete failed:", await response.text());
      }
    } catch (error) {
      console.error("Failed to delete question:", error);
    } finally {
      setDeletingId(null);
      setOpenDialogId(null);
    }
  };

  const handleOpenChange = (open: boolean, questionId: string) => {
    if (open) {
      setOpenDialogId(questionId);
    } else {
      // Prevent closing while deletion is in progress
      if (deletingId !== questionId) {
        setOpenDialogId(null);
      }
    }
  };

  if (localQuestions.length === 0) {
    return (
      <div className="rounded-lg border border-border border-dashed p-8 text-center text-muted-foreground shadow-sm">
        <p>No questions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed p-8 text-center text-muted-foreground shadow-sm">
          <p>No questions match your search.</p>
        </div>
      ) : (
        filteredQuestions.map((q) => (
          <details
            key={q._id}
            className="group rounded-lg border border-border bg-card shadow-sm transition hover:border-muted-foreground/50 overflow-hidden"
          >
            <summary className="flex cursor-pointer items-start justify-between p-5 list-none [&::-webkit-details-marker]:hidden focus:outline-none">
              <div className="min-w-0 pr-4 flex-1">
                <Link
                  href={`/question/${q._id}`}
                  className="font-semibold text-primary hover:underline line-clamp-1 block mb-1"
                >
                  {q.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {q.body}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      q.status === "SOLVED"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted/60"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 mt-1">
                {currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-muted"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialog
                        open={openDialogId === q._id}
                        onOpenChange={(open) => handleOpenChange(open, q._id)}
                      >
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Post
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Are you sure you want to delete this?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will
                              permanently delete your question and all
                              associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === q._id}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(q._id);
                              }}
                              disabled={deletingId === q._id}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingId === q._id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Yes, Delete"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <span className="rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors group-hover:bg-muted group-open:bg-primary group-open:text-primary-foreground group-open:border-primary">
                  <span className="group-open:hidden">Show Answer</span>
                  <span className="hidden group-open:inline">Hide Answer</span>
                </span>
              </div>
            </summary>

            <div className="border-t border-border bg-muted/20 p-5 text-sm text-foreground">
              {q.answerId ? (
                <div>
                  {q.answerId.content && (
                    <div className="whitespace-pre-wrap">
                      {q.answerId.content}
                    </div>
                  )}
                  {q.answerId.mediaUrls && q.answerId.mediaUrls.length > 0 && (
                    <div className="mt-4 flex flex-col gap-3">
                      {q.answerId.mediaUrls.map((url, i) => {
                        const isVideo =
                          url.match(/\.(mp4|webm|ogg)$/i) ||
                          url.includes("video/upload");
                        return (
                          <div key={i} className="flex flex-col gap-2">
                            {isVideo ? (
                              <video
                                src={url}
                                controls
                                className="rounded-md max-w-full h-auto border border-border shadow-sm object-contain max-h-[300px]"
                              />
                            ) : (
                              <Image
                                src={url}
                                alt="Answer Media"
                                className="rounded-md max-w-full h-auto border border-border shadow-sm object-contain max-h-[300px]"
                                width={400}
                                height={300}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!q.answerId.content &&
                    (!q.answerId.mediaUrls ||
                      q.answerId.mediaUrls.length === 0) && (
                      <p className="text-muted-foreground italic">
                        Answer content is empty.
                      </p>
                    )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  No public answer available for this question.
                </p>
              )}
              <div className="mt-4">
                <Link
                  href={`/question/${q._id}`}
                  className="text-primary hover:underline text-xs font-medium"
                >
                  View full thread →
                </Link>
              </div>
            </div>
          </details>
        ))
      )}

      {hasMoreQuestions && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
