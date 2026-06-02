"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpenIcon, FileTextIcon, PlayCircleIcon, Users2Icon } from "lucide-react";
import { toast } from "sonner";

import type { ChapterDetailData } from "@/lib/chapter-page-data";
import { ChapterContentList } from "@/components/chapter/ChapterContentList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  chapter: ChapterDetailData | null;
  isAuthenticated: boolean;
  userRole: string | null;
};

function priceLabel(chapter: ChapterDetailData) {
  if (chapter.pricingModel === "FREE") return "Free";
  if (chapter.pricingModel === "SUBSCRIPTION_INCLUDED") return "Included in subscription";
  return `NPR ${(chapter.price ?? 0).toLocaleString()}`;
}

export function ChapterDetailClient({ chapter, isAuthenticated, userRole }: Props) {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);

  if (!chapter) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-dashed border-border bg-background p-16">
          <BookOpenIcon className="mx-auto size-12 text-muted-foreground/40" />
          <h1 className="mt-4 text-2xl font-bold">Chapter not found</h1>
          <Button asChild className="mt-6">
            <Link href="/courses">Browse catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const firstContent = chapter.contents.find((content) => content.status === "READY");

  const enroll = async () => {
    setIsEnrolling(true);
    try {
      const response = await fetch(`/api/chapters/${chapter._id}/enroll`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.reason === "SUBSCRIPTION_REQUIRED") {
          router.push("/subscription");
          return;
        }
        throw new Error(data.error || "Failed to unlock chapter.");
      }
      toast.success("Chapter unlocked.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unlock chapter.");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-svh bg-[#f6f8fb] dark:bg-background">
      <div className="border-b border-border bg-background/70">
        <div className="mx-auto max-w-7xl px-4 py-3 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href="/courses" className="font-semibold text-emerald-600 hover:underline">
            CATALOG
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium uppercase text-foreground">{chapter.title}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Chapter</Badge>
            <Badge variant="outline">{chapter.subject}</Badge>
            <Badge variant="outline">{chapter.level}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground lg:text-4xl">
            {chapter.title}
          </h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground sm:text-base">
            {chapter.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users2Icon className="size-4" />
              {chapter.enrollmentCount} learners
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <FileTextIcon className="size-4" />
              {chapter.contentsCount} items
            </span>
          </div>

          <div className="mt-10">
            <h2 className="text-xl font-bold text-foreground">Chapter Content</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Videos and documents in a single ordered flow.
            </p>
            <div className="mt-5">
              <ChapterContentList
                slug={chapter.slug}
                contents={chapter.contents}
                hasAccess={chapter.hasAccess}
                previewCount={chapter.freePreviewCount}
              />
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0">
          <div className="sticky top-20 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
            <div className="relative aspect-[16/10] bg-emerald-950 text-white">
              {chapter.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={chapter.thumbnailUrl} alt={chapter.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <BookOpenIcon className="size-14 text-white/60" />
                </div>
              )}
            </div>

            <div className="space-y-5 p-5">
              <div className="text-2xl font-bold text-foreground">{priceLabel(chapter)}</div>

              {chapter.canManage ? (
                <Button asChild className="w-full">
                  <Link href={`/studio/chapter/${chapter._id}`}>Manage chapter</Link>
                </Button>
              ) : chapter.hasAccess ? (
                <Button asChild className="h-12 w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href={firstContent ? `/chapters/${chapter.slug}/watch/${firstContent._id}` : `/chapters/${chapter.slug}`}>
                    <PlayCircleIcon className="mr-2 size-4" />
                    Start chapter
                  </Link>
                </Button>
              ) : !isAuthenticated ? (
                <Button asChild className="w-full">
                  <Link href="/auth/signin">Sign in to unlock</Link>
                </Button>
              ) : chapter.pricingModel === "PAID" ? (
                <Button asChild className="h-12 w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href={`/chapters/${chapter.slug}/buy`}>Buy chapter</Link>
                </Button>
              ) : userRole === "STUDENT" ? (
                <Button onClick={enroll} disabled={isEnrolling} className="h-12 w-full bg-emerald-600 hover:bg-emerald-700">
                  {isEnrolling ? "Unlocking..." : "Unlock chapter"}
                </Button>
              ) : null}

              {chapter.pendingPurchase ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  Your payment proof is pending admin verification.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
