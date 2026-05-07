"use client";

import { useEffect, useState, useCallback } from "react";
import { HelpCircle, Loader2Icon, Trash2Icon, SearchIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getQuestionsAction, deleteQuestionAction } from "./actions";

type QuestionRecord = {
  _id: string;
  title: string;
  body: string;
  status: string;
  askerId: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
};

export function QuestionsClient() {
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuestionRecord | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [usernameQuery, setUsernameQuery] = useState("");

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuestionsAction(searchQuery, usernameQuery);
      setQuestions(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, usernameQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions();
    }, 500); // debounce

    return () => clearTimeout(timer);
  }, [fetchQuestions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget._id);
    try {
      await deleteQuestionAction(deleteTarget._id);
      toast.success("Question deleted successfully");
      setQuestions(prev => prev.filter(q => q._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete question");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-fit max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          <HelpCircle className="mr-2 inline-block size-6 text-primary" />
          Questions Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage all questions posted by users. Use the search bars to easily find specific questions or filter by user.
        </p>
      </div>

      <Card className="mx-auto w-full">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>All Questions</CardTitle>
              <CardDescription>
                Total: {questions.length} questions found
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="relative w-full sm:w-64">
                <UserIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by username..."
                  value={usernameQuery}
                  onChange={(e) => setUsernameQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[30vh] items-center justify-center">
              <Loader2Icon className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Question</th>
                    <th className="px-4 py-3">Asker</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Posted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {questions.map((question) => (
                    <tr key={question._id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 max-w-[300px]">
                        <div>
                          <p className="font-medium text-foreground truncate">{question.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{question.body}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{question.askerId?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">@{question.askerId?.username || "unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          question.status === "OPEN" 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                            : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        }`}>
                          {question.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingId === question._id}
                              onClick={() => setDeleteTarget(question)}
                            >
                              {deletingId === question._id ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2Icon className="mr-1.5 size-4" />
                                  Delete
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Question?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this question? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Yes, Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No questions found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
