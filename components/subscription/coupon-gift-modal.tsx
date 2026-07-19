"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/features/user/user-slice";

type EligibleCoupon = {
  code: string;
  kind: "FREE_ACCESS" | "PERCENTAGE";
  planSlug: string | null;
  planName: string | null;
  durationDays: number | null;
  discountPercentage: number | null;
  campaign: string | null;
  expiryDate: string | null;
};

const DISMISSED_KEY = "qc:coupon-invite-dismissed";
/** Keep the activation state up long enough to read, but never fake-wait once
 *  the server has already answered. */
const MIN_OVERLAY_MS = 1200;
const MAX_PADDING_MS = 3000;

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberDismissed(code: string) {
  try {
    const next = [...new Set([...readDismissed(), code])].slice(-50);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    /* private mode — the gift just reappears next session */
  }
}

/**
 * Gift modal for coupons the student was personally invited to (their email is
 * on the coupon's allow-list) and has not redeemed yet. Opens over the
 * workspace on login; free access activates in place behind a "setting this up"
 * state, discounts go straight to the repriced checkout.
 */
export function CouponGiftModal({ firstName }: { firstName?: string | null }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [coupon, setCoupon] = useState<EligibleCoupon | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/subscription/coupons/eligible");
        if (!res.ok) return;
        const data = (await res.json()) as { coupons?: EligibleCoupon[] };
        if (cancelled) return;

        const dismissed = readDismissed();
        const next = (data.coupons ?? []).find(
          (entry) => !dismissed.includes(entry.code),
        );
        if (next) setCoupon(next);
      } catch {
        /* non-critical surface — stay silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const close = useCallback(() => {
    if (isActivating) return;
    if (coupon) rememberDismissed(coupon.code);
    setCoupon(null);
  }, [coupon, isActivating]);

  const activate = useCallback(async () => {
    if (!coupon) return;

    // Discounts still have to be paid for — send them to the priced checkout.
    if (coupon.kind === "PERCENTAGE") {
      const href = coupon.planSlug
        ? `/subscription/payment?plan=${coupon.planSlug}&coupon=${encodeURIComponent(coupon.code)}`
        : `/subscription?coupon=${encodeURIComponent(coupon.code)}`;
      rememberDismissed(coupon.code);
      setCoupon(null);
      router.push(href);
      return;
    }

    setIsActivating(true);
    const startedAt = Date.now();

    try {
      const res = await fetch("/api/subscription/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not activate your plan.");

      const subRes = await fetch("/api/user/subscription");
      if (subRes.ok) {
        const sub = await subRes.json();
        dispatch(
          updateProfile({
            subscriptionStatus: sub.subscriptionStatus,
            subscriptionEnd: sub.subscriptionEnd,
            pendingManualPayment: sub.pendingManualPayment,
            questionsAsked: sub.questionsAsked,
            questionsRemaining: sub.questionsRemaining,
            maxQuestions: sub.maxQuestions,
            baseMaxQuestions: sub.baseMaxQuestions,
            bonusQuestions: sub.bonusQuestions,
            referralCode: sub.referralCode,
            planSlug: sub.planSlug,
          }),
        );
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_OVERLAY_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(MIN_OVERLAY_MS - elapsed, MAX_PADDING_MS)),
        );
      }

      rememberDismissed(coupon.code);
      setCoupon(null);
      toast.success(
        `${data.planName} is active until ${new Date(data.subscriptionEnd).toLocaleDateString()} 🎉`,
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not activate your plan.",
      );
    } finally {
      setIsActivating(false);
    }
  }, [coupon, dispatch, router]);

  if (!coupon) return null;

  const planLabel = coupon.planName ?? coupon.planSlug?.toUpperCase() ?? "premium";
  const isFree = coupon.kind === "FREE_ACCESS";

  return (
    <Dialog open onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={!isActivating}
        className="max-w-md overflow-hidden border-[#1B7258]/30 p-0 dark:border-[#27A883]/25"
      >
        {/* Gift header */}
        <div className="relative bg-gradient-to-br from-[#1B7258] to-[#27A883] px-8 pb-8 pt-10 text-center">
          <Sparkles className="absolute left-6 top-6 h-4 w-4 text-white/50" />
          <Sparkles className="absolute right-8 top-10 h-3 w-3 text-white/40" />
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10">
            <Gift className="h-8 w-8 text-white" />
          </span>
          <DialogTitle className="mt-5 text-center text-xl font-extrabold text-white">
            {firstName ? `${firstName}, you've got a gift!` : "You've got a gift!"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-center text-sm text-white/85">
            {isFree
              ? `You've been selected for the ${planLabel} plan${
                  coupon.durationDays ? ` for ${coupon.durationDays} days` : ""
                } — completely free.`
              : `You've been selected for ${coupon.discountPercentage}% off${
                  coupon.planName ? ` the ${coupon.planName} plan` : " your membership"
                }.`}
          </DialogDescription>
        </div>

        <div className="space-y-5 px-8 pb-8 pt-6">
          <div className="rounded-2xl border border-dashed border-[#1B7258]/40 bg-emerald-50/60 px-4 py-3 text-center dark:border-[#27A883]/30 dark:bg-emerald-900/15">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400">
              Your code
            </p>
            <p className="font-mono text-lg font-extrabold tracking-widest text-[#1B7258] dark:text-[#27A883]">
              {coupon.code}
            </p>
            {coupon.campaign && (
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {coupon.campaign}
              </p>
            )}
          </div>

          {isActivating ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#1B7258] dark:text-[#27A883]" />
              <p className="text-base font-bold text-neutral-900 dark:text-white">
                Hold on{firstName ? `, ${firstName}` : ""}…
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                We&apos;re activating your {planLabel} subscription and setting up your
                benefits.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => void activate()}
                className="h-12 w-full rounded-2xl bg-[#1B7258] text-sm font-bold text-white transition-colors hover:bg-[#145C46]"
              >
                {isFree ? "Activate my free plan" : "Claim my discount"}
              </button>
              <button
                onClick={close}
                className="h-10 w-full rounded-2xl text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:hover:text-white"
              >
                Maybe later
              </button>
              {coupon.expiryDate && (
                <p className="pt-1 text-center text-xs text-neutral-400">
                  Expires {new Date(coupon.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
