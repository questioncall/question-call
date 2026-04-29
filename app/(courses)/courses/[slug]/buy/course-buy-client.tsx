/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Info,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";

import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { LegalDialog } from "@/components/shared/legal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postMultipartWithProgress } from "@/lib/client-upload";
import type { CourseDetailData } from "@/lib/course-page-data";
import { APP_NAME } from "@/lib/constants";

type Props = {
  course: CourseDetailData | null;
  isAuthenticated: boolean;
};

export function CourseBuyClient({ course, isAuthenticated }: Props) {
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercentage: number;
  } | null>(course?.appliedCoupon ?? null);

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#2A2A2A] p-16 text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Course not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            This course may have been removed or is not available.
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

  const basePrice = course.price ?? 0;
  const discountedPrice = appliedCoupon
    ? basePrice * (1 - appliedCoupon.discountPercentage / 100)
    : basePrice;

  async function handleCouponApply() {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code first.");
      return;
    }
    setIsValidatingCoupon(true);
    try {
      const res = await fetch("/api/courses/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), courseId: course!._id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.valid === false) {
        throw new Error(data.reason || data.error || "Coupon is not valid.");
      }

      if (data.coupon?.discountPercentage === 100) {
        // 100% coupon → enroll directly
        setIsSubmitting(true);
        const enrollRes = await fetch(`/api/courses/${course!._id}/enroll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ couponCode: couponCode.trim() }),
        });
        const enrollData = await enrollRes.json().catch(() => ({}));
        if (!enrollRes.ok) throw new Error(enrollData.error || "Unable to enroll.");
        toast.success("Access unlocked!");
        router.push(continueHref);
        router.refresh();
      } else {
        setAppliedCoupon({
          code: couponCode.trim(),
          discountPercentage: data.coupon?.discountPercentage ?? 0,
        });
        toast.success(`Coupon applied! ${data.coupon?.discountPercentage ?? 0}% off.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Coupon could not be applied.");
    } finally {
      setIsValidatingCoupon(false);
      setIsSubmitting(false);
    }
  }

  async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      if (appliedCoupon) formData.append("couponCode", appliedCoupon.code);

      const screenshot = formData.get("screenshot");
      const hasScreenshot = screenshot instanceof File && screenshot.size > 0;
      setUploadProgress(hasScreenshot ? 0 : null);

      const data = await postMultipartWithProgress<{ message?: string }>(
        `/api/courses/${course!._id}/purchase/initiate`,
        formData,
        hasScreenshot ? { onProgress: ({ percent }) => setUploadProgress(percent) } : {},
      );

      toast.success(data.message || "Payment proof submitted for review.");
      router.push(`/courses/${course!.slug}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Payment proof could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }

  // If already has access
  if (course.hasAccess) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-10 border border-neutral-200 dark:border-neutral-800 shadow-lg text-center max-w-md">
          <CheckCircle2 className="mx-auto w-12 h-12 text-[#1B7258] dark:text-[#27A883] mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            You already have access!
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            This course is already unlocked for your account.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href={continueHref}>Continue course</Link>
          </Button>
        </div>
      </div>
    );
  }

  // If not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-10 border border-neutral-200 dark:border-neutral-800 shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Sign in to purchase
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            You need an account to buy this course.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button asChild><Link href="/auth/signin">Sign in</Link></Button>
            <Button asChild variant="outline"><Link href="/auth/signup/student">Create account</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] text-neutral-900 dark:text-white flex flex-col p-6 md:p-12">

      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between mb-8 md:mb-16">
        <Link
          href={`/courses/${course.slug}`}
          className="flex items-center gap-2 text-sm font-medium hover:text-[#1B7258] transition-colors rounded-full px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to course
        </Link>
        <div className="font-bold text-xl tracking-tight hidden md:block text-[#1B7258] dark:text-[#27A883]">
          {APP_NAME}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

        {/* ── Left: Payment Method ── */}
        <section className="flex flex-col">
          <h2 className="text-xl font-semibold mb-6">Payment method</h2>

          <div className="bg-white dark:bg-[#2A2A2A] rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-48 h-48 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm mb-6 flex items-center justify-center">
              <img
                src={course.manualPayment.qrCodeUrl}
                alt="eSewa payment QR"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-100 mb-1">
              {course.manualPayment.recipientName}
            </h3>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-6">
              eSewa: {course.manualPayment.esewaNumber}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs text-left p-4 rounded-xl flex items-start gap-3 w-full">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Scan the QR code or manually transfer the amount to the eSewa number above.
                Save your transaction screenshot and ID to submit on the right.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground opacity-80">
              By paying, you agree to our{" "}
              <LegalDialog
                triggerClassName="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                triggerLabel="Terms and Policies"
              />
              . Payments are manually verified.
            </p>
            <div className="bg-emerald-50 dark:bg-[#1B7258]/10 border border-emerald-100 dark:border-[#1B7258]/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1B7258] dark:text-[#27A883] shrink-0 mt-0.5" />
              <p className="text-[13px] font-medium text-[#114A39] dark:text-emerald-50/90 leading-snug">
                We will notify you via email as soon as your access is activated.
              </p>
            </div>
          </div>
        </section>

        {/* ── Right: Course Summary + Payment Form ── */}
        <section className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-lg relative overflow-hidden">
          {/* Accent glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B7258] opacity-[0.03] dark:opacity-10 rounded-full blur-3xl -mr-20 -mt-20" />

          <h1 className="text-2xl font-bold mb-1 text-neutral-900 dark:text-white">
            {course.title}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            {course.subject} · {course.level}
          </p>

          {/* Price summary */}
          <div className="flex flex-col gap-3 border-t border-neutral-100 dark:border-neutral-700/50 pt-6 mb-6 text-[14px]">
            <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
              <span>Course price</span>
              <span>NPR {basePrice.toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-[#1B7258] dark:text-[#27A883] font-medium">
                <span>Coupon discount ({appliedCoupon.discountPercentage}% off)</span>
                <span>- NPR {(basePrice - discountedPrice).toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-neutral-100 dark:border-neutral-700/50 pt-4 mt-2 flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-white">
              <span>Due today</span>
              <span>NPR {discountedPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Pending purchase notice */}
          {course.pendingPurchase && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">
              A payment proof for this course is already pending admin review.
            </div>
          )}

          {/* Coupon section */}
          <div className="mb-6 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
              <TicketPercent className="w-4 h-4 text-[#1B7258] dark:text-[#27A883]" />
              Have a coupon?
            </div>
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1"
                  disabled={isValidatingCoupon || isSubmitting}
                />
                <Button
                  variant="outline"
                  onClick={() => void handleCouponApply()}
                  disabled={isValidatingCoupon || isSubmitting}
                >
                  {isValidatingCoupon ? "Checking…" : "Apply"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-sm">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">{appliedCoupon.code}</span>
                  <span>— {appliedCoupon.discountPercentage}% off applied</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-emerald-700 dark:text-emerald-400"
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          {/* Payment submission form */}
          <form onSubmit={(e) => void handlePaymentSubmit(e)} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="course-transaction-id" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                eSewa Transaction ID
              </label>
              <Input
                id="course-transaction-id"
                name="transactionId"
                required
                placeholder="e.g. 1AK39BXX"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="course-transactor-name" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Transactor Full Name
              </label>
              <Input
                id="course-transactor-name"
                name="transactorName"
                required
                placeholder="Full name used in eSewa"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="course-screenshot" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Payment screenshot{" "}
                <span className="font-normal text-neutral-400">(optional but recommended)</span>
              </label>
              <Input
                id="course-screenshot"
                name="screenshot"
                type="file"
                accept="image/*"
                disabled={isSubmitting}
              />
            </div>

            {isSubmitting && uploadProgress !== null && (
              <UploadProgressBar label="Uploading screenshot…" value={uploadProgress} />
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#1B7258] hover:bg-[#155f48] dark:bg-[#27A883] dark:hover:bg-[#1B7258] text-white font-semibold shadow-md"
              disabled={isSubmitting || course.pendingPurchase}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isSubmitting ? "Submitting…" : "Submit payment proof"}
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
