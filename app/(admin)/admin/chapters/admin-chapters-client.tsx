"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CurrencyIcon,
  Layers3Icon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  Users2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { CreateChapterModal } from "@/components/chapter/CreateChapterModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ChapterData = {
  _id: string;
  title: string;
  slug: string;
  subject: string;
  level: string;
  pricingModel: string;
  price: number | null;
  status: string;
  isFeatured: boolean;
  instructorName: string;
  instructorRole: string;
  enrollmentCount: number;
  createdAt: string;
};

type AdminChaptersClientProps = {
  chapters: ChapterData[];
  analytics: {
    totalActiveChapters: number;
    activeBreakdown: { free: number; subscription: number; paid: number };
    totalEnrolled: number;
    totalRevenue: number;
    totalCommission: number;
  };
};

export function AdminChaptersClient({
  chapters: initialChapters,
  analytics,
}: AdminChaptersClientProps) {
  const [chapters, setChapters] = useState(initialChapters);
  const [isWorking, setIsWorking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    setChapters(initialChapters);
  }, [initialChapters]);

  const filteredChapters = chapters.filter((chapter) => {
    if (filter === "all") return true;
    return chapter.status === filter;
  });

  async function toggleFeatured(chapterId: string, current: boolean) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !current }),
      });
      if (!response.ok) throw new Error("Failed to update");
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter._id === chapterId
            ? { ...chapter, isFeatured: !current }
            : chapter,
        ),
      );
      toast.success(!current ? "Chapter featured." : "Chapter unfeatured.");
    } catch {
      toast.error("Failed to update chapter.");
    } finally {
      setIsWorking(false);
    }
  }

  async function updateStatus(chapterId: string, status: string) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update");
      setChapters((prev) =>
        prev.map((chapter) =>
          chapter._id === chapterId ? { ...chapter, status } : chapter,
        ),
      );
      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteChapter(chapterId: string) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      setChapters((prev) => prev.filter((chapter) => chapter._id !== chapterId));
      toast.success("Chapter deleted.");
    } catch {
      toast.error("Failed to delete chapter.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <CreateChapterModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Chapters</h1>
          <p className="text-sm text-muted-foreground">
            Manage all standalone chapters and view analytics.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="mr-1 size-4" />
          Create chapter
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active chapters
            </CardTitle>
            <Layers3Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {analytics.totalActiveChapters}
            </div>
            <p className="text-xs text-muted-foreground">
              Free: {analytics.activeBreakdown.free} · Sub:{" "}
              {analytics.activeBreakdown.subscription} · Paid:{" "}
              {analytics.activeBreakdown.paid}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total enrolled
            </CardTitle>
            <Users2Icon className="size-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {analytics.totalEnrolled}
            </div>
            <p className="text-xs text-muted-foreground">Student enrollments</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chapter revenue
            </CardTitle>
            <CurrencyIcon className="size-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              NPR {analytics.totalRevenue.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">From paid enrollments</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform commission
            </CardTitle>
            <CurrencyIcon className="size-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              NPR {analytics.totalCommission.toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">From paid enrollments</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="h-10 w-[180px] rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                <th className="px-5 py-4 font-medium">Chapter</th>
                <th className="px-5 py-4 font-medium">Pricing</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Instructor</th>
                <th className="px-5 py-4 font-medium">Enrolled</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChapters.map((chapter) => (
                <tr
                  key={chapter._id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {chapter.isFeatured && (
                        <StarIcon className="size-4 text-yellow-500" />
                      )}
                      <div>
                        <div className="line-clamp-1 font-medium text-foreground">
                          {chapter.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {chapter.subject} · {chapter.level}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {chapter.pricingModel === "FREE" ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                        Free
                      </Badge>
                    ) : chapter.pricingModel === "SUBSCRIPTION_INCLUDED" ? (
                      <Badge className="border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                        Subscription
                      </Badge>
                    ) : (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        NPR {(chapter.price ?? 0).toLocaleString()}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={chapter.status}
                      onChange={(event) =>
                        updateStatus(chapter._id, event.target.value)
                      }
                      className="w-[120px] rounded-xl border border-input bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">
                    {chapter.instructorName}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-foreground">
                    {chapter.enrollmentCount}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleFeatured(chapter._id, chapter.isFeatured)
                        }
                        disabled={isWorking}
                        className={
                          chapter.isFeatured
                            ? "text-yellow-500"
                            : "text-muted-foreground"
                        }
                      >
                        <StarIcon
                          className={`size-4 ${
                            chapter.isFeatured ? "fill-yellow-500" : ""
                          }`}
                        />
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/studio/chapter/${chapter._id}`}>
                          <PencilIcon className="size-4" />
                        </Link>
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600"
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete chapter?</DialogTitle>
                            <DialogDescription>
                              This will permanently delete the chapter and all its
                              content. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1">
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteChapter(chapter._id)}
                              disabled={isWorking}
                              className="flex-1"
                            >
                              Delete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredChapters.length === 0 && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No chapters found.
          </div>
        )}
      </div>
    </div>
  );
}
