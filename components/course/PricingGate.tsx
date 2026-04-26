"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon, TicketPercentIcon } from "lucide-react";
import { toast } from "sonner";

import { UploadProgressBar } from "@/components/shared/upload-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { postMultipartWithProgress } from "@/lib/client-upload";

type PricingGateProps = {
  courseId: string;
  courseSlug: string;
  pricingModel: "FREE" | "SUBSCRIPTION_INCLUDED" | "PAID";
  price?: number | null;
  hasActiveSubscription: boolean;
  redirectToAfterAccess?: string | null;
  initialCoupon?: { code: string; discountPercentage: number } | null;
  manualPayment: {
    recipientName: string;
    esewaNumber: string;
    qrCodeUrl: string;
  };
};

export function PricingGate({
  courseId,
  courseSlug,
  pricingModel,
  price,
  hasActiveSubscription,
  redirectToAfterAccess,
  initialCoupon,
  manualPayment,
}: PricingGateProps) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPercentage: number } | null>(initialCoupon ?? null);

  const redirectTo = redirectToAfterAccess || `/courses/${courseSlug}`;

  const currentPrice = price || 0;
  const discountedPrice = appliedCoupon
    ? currentPrice * (1 - appliedCoupon.discountPercentage / 100)
    : currentPrice;

  async function enroll(coupon?: string) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(coupon ? { couponCode: coupon } : {}),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.reason || "Unable to enroll.");
      }

      toast.success("Access unlocked.");
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to enroll.");
    } finally {
      setIsWorking(false);
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code first.");
      return;
    }

    setIsWorking(true);
    try {
      const validationResponse = await fetch("/api/courses/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          courseId,
        }),
      });

      const validationData = await validationResponse.json().catch(() => ({}));
      if (!validationResponse.ok || validationData.valid === false) {
        throw new Error(
          validationData.reason || validationData.error || "Coupon is not valid.",
        );
      }

      if (validationData.coupon?.discountPercentage === 100) {
        await enroll(couponCode.trim());
      } else {
        setAppliedCoupon({
          code: couponCode.trim(),
          discountPercentage: validationData.coupon?.discountPercentage ?? 0,
        });
        toast.success(`Coupon applied! ${validationData.coupon?.discountPercentage ?? 0}% off.`);
        setIsWorking(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Coupon could not be applied.",
      );
      setIsWorking(false);
    }
  }

  async function handleManualPaymentSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setIsWorking(true);

    try {
      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      const screenshot = formData.get("screenshot");
      const hasScreenshot = screenshot instanceof File && screenshot.size > 0;

      if (appliedCoupon) {
        formData.append("couponCode", appliedCoupon.code);
      }

      setUploadProgress(hasScreenshot ? 0 : null);

      const data = await postMultipartWithProgress<{ message?: string }>(
        `/api/courses/${courseId}/purchase/initiate`,
        formData,
        hasScreenshot
          ? {
              onProgress: ({ percent }) => setUploadProgress(percent),
            }
          : {},
      );

      toast.success(data.message || "Payment proof submitted for review.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Payment proof could not be submitted.",
      );
    } finally {
      setIsWorking(false);
      setUploadProgress(null);
    }
  }

  const canInstantlyEnroll =
    pricingModel === "FREE" ||
    (pricingModel === "SUBSCRIPTION_INCLUDED" && hasActiveSubscription);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Access this course</div>
        {pricingModel === "PAID" ? (
          <p className="text-sm text-muted-foreground">
            Pay manually with eSewa, then submit your transaction proof for admin approval.
          </p>
        ) : pricingModel === "SUBSCRIPTION_INCLUDED" && !hasActiveSubscription ? (
          <p className="text-sm text-muted-foreground">
            An active subscription or a valid coupon is required.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            You can start learning immediately.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Course Price
        </div>
        {pricingModel === "PAID" ? (
          <>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-foreground">
                NPR {Number(discountedPrice).toFixed(0)}
              </span>
              {appliedCoupon ? (
                <span className="text-sm text-muted-foreground line-through">
                  NPR {Number(currentPrice).toFixed(0)}
                </span>
              ) : null}
            </div>
            {appliedCoupon ? (
              <div className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                {appliedCoupon.discountPercentage}% discount applied
              </div>
            ) : null}
          </>
        ) : pricingModel === "FREE" ? (
          <div className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
            Free
          </div>
        ) : (
          <div className="mt-2 text-2xl font-semibold text-foreground">
            Included in subscription
          </div>
        )}
      </div>

      {canInstantlyEnroll ? (
        <Button
          size="lg"
          className="w-full"
          disabled={isWorking}
          onClick={() => {
            void enroll();
          }}
        >
          Start learning
        </Button>
      ) : null}

      {pricingModel === "SUBSCRIPTION_INCLUDED" && !hasActiveSubscription ? (
        <Button asChild size="lg" className="w-full">
          <a href="/subscription">View subscription plans</a>
        </Button>
      ) : null}

      {pricingModel === "PAID" ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full">
              <CreditCardIcon className="size-4" />
              Submit manual eSewa payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Manual eSewa Payment</DialogTitle>
              <DialogDescription>
                Complete the transfer, then submit the exact transaction ID and payer name for review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="rounded-2xl border border-border bg-muted/20 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={manualPayment.qrCodeUrl}
                  alt="eSewa payment QR"
                  className="w-full rounded-xl object-cover"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Recipient
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {manualPayment.recipientName}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    eSewa Number
                  </div>
                  <div className="mt-1 font-medium text-foreground">
                    {manualPayment.esewaNumber}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Amount
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-medium text-foreground">
                      NPR {Number(discountedPrice).toFixed(0)}
                    </span>
                    {appliedCoupon ? (
                      <span className="text-xs text-muted-foreground line-through">
                        NPR {Number(currentPrice).toFixed(0)}
                      </span>
                    ) : null}
                  </div>
                  {appliedCoupon ? (
                    <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {appliedCoupon.discountPercentage}% discount applied ({appliedCoupon.code})
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="course-transaction-id" className="text-sm font-medium">
                  eSewa Transaction ID
                </label>
                <Input
                  id="course-transaction-id"
                  name="transactionId"
                  required
                  placeholder="e.g. 1AK39BXX"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="course-transactor-name" className="text-sm font-medium">
                  Transactor Full Name
                </label>
                <Input
                  id="course-transactor-name"
                  name="transactorName"
                  required
                  placeholder="Full name used in eSewa"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="course-screenshot" className="text-sm font-medium">
                  Screenshot (optional but recommended)
                </label>
                <Input
                  id="course-screenshot"
                  name="screenshot"
                  type="file"
                  accept="image/*"
                />
              </div>

              {isWorking && uploadProgress !== null ? (
                <UploadProgressBar
                  label="Uploading payment screenshot"
                  value={uploadProgress}
                />
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={isWorking}>
                {isWorking ? "Submitting..." : "Submit for approval"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TicketPercentIcon className="size-4 text-primary" />
          Have a coupon?
        </div>
        {!appliedCoupon ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Enter coupon code"
            />
            <Button
              variant="outline"
              disabled={isWorking}
              onClick={() => {
                void applyCoupon();
              }}
            >
              Apply
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">{appliedCoupon.code}</span>
              <span>applied ({appliedCoupon.discountPercentage}% off)</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
              onClick={() => {
                setAppliedCoupon(null);
                setCouponCode("");
              }}
            >
              Remove
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
