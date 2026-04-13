"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  PlayCircleIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MyCourse = {
  _id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  subject: string;
  instructorName: string;
  pricingModel: "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";
  price: number | null;
  totalDurationMinutes: number;
  totalVideos: number;
  watchedVideos: number;
  progressPercent: number;
  lastWatchedVideoId: string | null;
  accessType: string;
};

type Props = {
  userName: string;
  courses: MyCourse[];
};

export function MyCoursesClient({ userName, courses }: Props) {
  const inProgress = courses.filter((course) => course.progressPercent < 100);
  const completed = courses.filter((course) => course.progressPercent >= 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          My Courses
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back, {userName}. Continue where you left off.
        </p>
      </div>

      {inProgress.length > 0 ? (
        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <PlayCircleIcon className="size-5 text-emerald-600" />
              Continue Watching
            </h2>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-2">
            {inProgress.map((course) => (
              <Link
                key={course._id}
                href={`/courses/${course.slug}`}
                className="group flex w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md sm:w-[340px]"
              >
                <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-slate-800 to-emerald-900">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <BookOpenIcon className="size-12 text-emerald-500/40" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <Badge
                    variant="secondary"
                    className="mb-2 w-fit text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  >
                    {course.subject}
                  </Badge>
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    {course.title}
                  </h3>

                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {course.watchedVideos}/{course.totalVideos} watched ·{" "}
                      {Math.round(course.progressPercent)}%
                    </p>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-muted-foreground">
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      <GraduationCapIcon className="size-3" />
                    </div>
                    {course.instructorName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-foreground">
            <GraduationCapIcon className="size-5 text-emerald-600" />
            Completed
          </h2>
          <div className="space-y-3">
            {completed.map((course) => (
              <Link
                key={course._id}
                href={`/courses/${course.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-all hover:border-emerald-500/30"
              >
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-emerald-900">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <BookOpenIcon className="size-7 text-emerald-500/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {course.instructorName} · {course.totalVideos} lessons
                  </p>
                  <Badge className="mt-2 bg-emerald-100 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    Completed
                  </Badge>
                </div>
                <ChevronRightIcon className="size-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {courses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-background p-16 text-center">
          <BookOpenIcon className="mx-auto size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No courses yet
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse our catalog and start learning.
          </p>
          <Button asChild className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
            <Link href="/courses">Browse Courses</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
