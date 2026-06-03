"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import type { ChapterDetailData } from "@/lib/chapter-page-data";
import { consumeMobileReturn } from "@/components/payment/mobile-return-redirect";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { postMultipartWithProgress } from "@/lib/client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  chapter: ChapterDetailData;
  /** True when served from the checkout subdomain (mobile hand-off). */
  checkoutMode?: boolean;
};

export function ChapterBuyClient({ chapter, checkoutMode = false }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const price = chapter.price ?? 0;

  async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const screenshot = formData.get("screenshot");
      const hasScreenshot = screenshot instanceof File && screenshot.size > 0;
      setUploadProgress(hasScreenshot ? 0 : null);

      const data = await postMultipartWithProgress<{ message?: string }>(
        `/api/chapters/${chapter._id}/purchase/initiate`,
        formData,
        hasScreenshot
          ? { onProgress: ({ percent }) => setUploadProgress(percent) }
          : {},
      );

      toast.success(data.message || "Payment proof submitted for review.");
      // Manual proof awaits admin review → return as "submitted", not "success".
      if (consumeMobileReturn("submitted", "manual")) return;
      router.push(`/chapters/${chapter.slug}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Payment proof could not be submitted.",
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <CheckoutShell
      checkoutMode={checkoutMode}
      backHref={`/chapters/${chapter.slug}`}
      backLabel="Back to chapter"
      manualPayment={chapter.manualPayment}
      instruction="Scan the QR code or manually transfer the amount to the eSewa number above. Save your transaction screenshot and ID to submit on the right."
      confirmation="We will notify you via email as soon as your access is activated."
    >
      {/* ── Right: Chapter Summary + Payment Form ── */}
      <section className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B7258] opacity-[0.03] dark:opacity-10 rounded-full blur-3xl -mr-20 -mt-20" />

        <h1 className="text-2xl font-bold mb-1 text-neutral-900 dark:text-white">
          {chapter.title}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
          {chapter.subject} · {chapter.level}
        </p>

        {/* Price summary */}
        <div className="flex flex-col gap-3 border-t border-neutral-100 dark:border-neutral-700/50 pt-6 mb-6 text-[14px]">
          <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
            <span>Chapter price</span>
            <span>NPR {price.toFixed(2)}</span>
          </div>
          <div className="border-t border-neutral-100 dark:border-neutral-700/50 pt-4 mt-2 flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-white">
            <span>Due today</span>
            <span>NPR {price.toFixed(2)}</span>
          </div>
        </div>

        {/* Pending purchase notice */}
        {chapter.pendingPurchase && (
          <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-800 dark:text-amber-300">
            A payment proof for this chapter is already pending admin review.
          </div>
        )}

        {/* Payment submission form */}
        <form
          onSubmit={(e) => void handlePaymentSubmit(e)}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label
              htmlFor="chapter-transaction-id"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              eSewa Transaction ID
            </label>
            <Input
              id="chapter-transaction-id"
              name="transactionId"
              required
              placeholder="e.g. 1AK39BXX"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="chapter-transactor-name"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Transactor Full Name
            </label>
            <Input
              id="chapter-transactor-name"
              name="transactorName"
              required
              placeholder="Full name used in eSewa"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="chapter-screenshot"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Payment screenshot{" "}
              <span className="font-normal text-neutral-400">
                (optional but recommended)
              </span>
            </label>
            <Input
              id="chapter-screenshot"
              name="screenshot"
              type="file"
              accept="image/*"
              disabled={isSubmitting}
            />
          </div>

          {isSubmitting && uploadProgress !== null && (
            <UploadProgressBar
              label="Uploading screenshot…"
              value={uploadProgress}
            />
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full bg-[#1B7258] hover:bg-[#155f48] dark:bg-[#27A883] dark:hover:bg-[#1B7258] text-white font-semibold shadow-md"
            disabled={isSubmitting || chapter.pendingPurchase}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting…" : "Submit payment proof"}
          </Button>
        </form>
      </section>
    </CheckoutShell>
  );
}
