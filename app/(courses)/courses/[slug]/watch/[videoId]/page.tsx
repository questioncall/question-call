import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";

import { SectionAccordion } from "@/components/course/SectionAccordion";
import { VideoPlayer } from "@/components/course/VideoPlayer";
import { Button } from "@/components/ui/button";
import { getSafeServerSession } from "@/lib/auth";
import { getCourseWatchPageData } from "@/lib/course-page-data";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Watch Lesson",
  description: "Private lesson playback and progress tracking.",
});

export default async function CourseWatchPage({
  params,
}: {
  params: Promise<{ slug: string; videoId: string }>;
}) {
  const session = await getSafeServerSession();

  if (!session?.user?.id || !session.user.role) {
    redirect("/auth/signin");
  }

  const { slug, videoId } = await params;
  const data = await getCourseWatchPageData({
    slug,
    videoId,
    userId: session.user.id,
    role: session.user.role,
  });

  if (!data) {
    redirect(`/courses/${slug}`);
  }

  const previewVideoIds = data.sections
    .flatMap((section) => section.videos)
    .slice(0, data.course.freePreviewCount)
    .map((video) => video._id);

  return (
    <div className="min-h-svh bg-[#f6f8fb] dark:bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/courses/${data.course.slug}`}>
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="line-clamp-1 text-sm font-semibold text-foreground">
              {data.course.title}
            </div>
            <div className="line-clamp-1 text-xs text-muted-foreground">
              Watching lesson
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-4">
          <VideoPlayer
            videoUrl={data.currentVideo.videoUrl}
            muxPlaybackId={data.currentVideo.muxPlaybackId}
            title={data.currentVideo.title}
            courseId={data.course._id}
            videoId={data.currentVideo._id}
            initialWatchedPercent={data.initialWatchedPercent}
            isPreview={data.isPreview}
          />

          {data.isPreview ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/70 p-5 dark:bg-emerald-950/20">
              <h2 className="text-lg font-semibold text-foreground">
                You&apos;re watching a free preview
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enroll or buy the course to unlock every lesson and save your
                progress.
              </p>
              <Button asChild className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Link href={`/courses/${data.course.slug}`}>Unlock full course</Link>
              </Button>
            </div>
          ) : null}

          {data.currentVideo.description ? (
            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="text-lg font-semibold text-foreground">
                About This Lesson
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {data.currentVideo.description}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BookOpenIcon className="size-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-foreground">
                Course Content
              </h2>
            </div>
            <SectionAccordion
              sections={data.sections}
              currentVideoId={data.currentVideo._id}
              completedVideoIds={data.completedVideoIds}
              courseSlug={data.course.slug}
              allowLinks={!data.isPreview}
              previewVideoIds={previewVideoIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
