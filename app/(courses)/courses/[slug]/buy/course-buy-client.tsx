"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  ShieldCheckIcon,
  TicketIcon,
} from "lucide-react";

import { PricingGate } from "@/components/course/PricingGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseDetailData } from "@/lib/course-page-data";

type Props = {
  course: CourseDetailData | null;
  isAuthenticated: boolean;
};

export function CourseBuyClient({ course, isAuthenticated }: Props) {
  if (!course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-dashed border-border bg-background p-16">
          <BookOpenIcon className="mx-auto size-12 text-muted-foreground/40" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Course not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The course you are trying to access is not available.
          </p>
          <Button asChild className="mt-6">
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const continueHref = course.nextVideoId
    ? `/courses/${course.slug}/watch/${course.nextVideoId}`
    : `/courses/${course.slug}`;

  return (
    <div className="min-h-svh bg-background">
      <div className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/courses/${course.slug}`}>
              <ArrowLeftIcon className="size-5" />
            </Link>
          </Button>
          <span className="line-clamp-1 text-sm font-medium text-muted-foreground">
            Back to course
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{course.subject}</Badge>
              <Badge variant="outline">{course.level}</Badge>
              <Badge variant="outline">{course.pricingModel}</Badge>
            </div>

            <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
              {course.title}
            </h1>

            <div className="mt-6 relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-emerald-900">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <BookOpenIcon className="size-20 text-emerald-500/30" />
                </div>
              )}
            </div>

            {/* Show static price only when PricingGate is NOT rendered */}
            {(course.hasAccess || !isAuthenticated) ? (
              <div className="mt-6 text-2xl font-bold text-foreground">
                {course.pricingModel === "FREE"
                  ? "Free"
                  : course.pricingModel === "SUBSCRIPTION_INCLUDED"
                    ? "Included in subscription"
                    : `NPR ${(course.price ?? 0).toLocaleString()}`}
              </div>
            ) : null}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {course.description}
            </p>

            {course.tags.length > 0 ? (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-foreground">Highlights</h2>
                <ul className="mt-3 space-y-2">
                  {course.tags.map((tag) => (
                    <li
                      key={tag}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="w-full shrink-0 lg:w-[420px]">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-6 shadow-xl">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <CreditCardIcon className="size-5 text-emerald-600" />
                Course Access
              </h2>

              <div className="mt-5 space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <TicketIcon className="mt-0.5 size-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-foreground">
                      Coupon discounts
                    </div>
                    <div className="text-muted-foreground">
                      Valid course coupons can be applied to get a discount on the course price, or unlock it entirely if it is a 100% discount.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="mt-0.5 size-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-foreground">
                      Manual payment review
                    </div>
                    <div className="text-muted-foreground">
                      Paid course purchases are verified by admin after you submit
                      your eSewa proof.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                {course.hasAccess ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
                      This course is already unlocked for your account.
                    </div>
                    <Button asChild className="w-full">
                      <Link href={continueHref}>Continue course</Link>
                    </Button>
                  </div>
                ) : !isAuthenticated ? (
                  <div className="space-y-3">
                    <Button asChild className="w-full">
                      <Link href="/auth/signin">Sign in to continue</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/signup/student">Create account</Link>
                    </Button>
                  </div>
                ) : (
                  <PricingGate
                    courseId={course._id}
                    courseSlug={course.slug}
                    pricingModel={course.pricingModel}
                    price={course.price}
                    hasActiveSubscription={course.hasActiveSubscription}
                    redirectToAfterAccess={continueHref}
                    initialCoupon={course.appliedCoupon}
                    manualPayment={course.manualPayment}
                  />
                )}
              </div>

              {course.pendingPurchase ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  A payment proof for this course is already pending review.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
