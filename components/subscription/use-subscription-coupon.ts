"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/features/user/user-slice";

export type ValidatedCoupon = {
  code: string;
  kind: "FREE_ACCESS" | "PERCENTAGE";
  planSlug: string | null;
  durationDays: number | null;
  discountPercentage: number | null;
};

export type CouponPricing = {
  planSlug: string;
  planName: string;
  originalPrice: number;
  discountedPrice: number;
  tax: number;
};

/** What an applied coupon does to one specific plan card. */
export type PlanCouponEffect =
  | { type: "none" }
  | { type: "free"; durationDays: number | null }
  | { type: "discount"; percentage: number; originalPrice: number; price: number }
  | { type: "not-applicable" };

/**
 * Single source of truth for the coupon a student is trying on the
 * subscription page: validation, the per-plan effect the cards render, and
 * free-access redemption.
 */
export function useSubscriptionCoupon() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [code, setCode] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [applied, setApplied] = useState<ValidatedCoupon | null>(null);
  const [pricing, setPricing] = useState<CouponPricing[]>([]);

  const clear = useCallback(() => {
    setApplied(null);
    setPricing([]);
    setCode("");
  }, []);

  /** Validate a code. Pass one explicitly to apply it without typing (e.g. a
   *  `?coupon=` link from the invite banner). */
  const apply = useCallback(async (explicitCode?: string) => {
    const trimmed = (explicitCode ?? code).trim();
    if (!trimmed) return;
    if (explicitCode) setCode(explicitCode.toUpperCase());

    setIsWorking(true);
    try {
      const res = await fetch("/api/subscription/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not check that code.");

      if (!data.valid) {
        toast.error(data.message || "That code isn't valid.");
        setApplied(null);
        setPricing([]);
        return;
      }

      setApplied(data.coupon as ValidatedCoupon);
      setPricing((data.pricing as CouponPricing[]) || []);
      toast.success("Coupon applied — your plans have been updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check that code.");
    } finally {
      setIsWorking(false);
    }
  }, [code]);

  /** Pull fresh entitlements so the page flips state without a reload. */
  const refreshEntitlements = useCallback(async () => {
    const res = await fetch("/api/user/subscription");
    if (!res.ok) return;
    const sub = await res.json();
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
  }, [dispatch]);

  const redeemFreeAccess = useCallback(async () => {
    if (!applied || applied.kind !== "FREE_ACCESS") return;

    setIsWorking(true);
    try {
      const res = await fetch("/api/subscription/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: applied.code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not redeem the code.");

      toast.success(
        `${data.planName} activated until ${new Date(data.subscriptionEnd).toLocaleDateString()} 🎉`,
      );

      await refreshEntitlements();
      clear();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not redeem the code.");
    } finally {
      setIsWorking(false);
    }
  }, [applied, clear, refreshEntitlements, router]);

  const pricingBySlug = useMemo(() => {
    const map = new Map<string, CouponPricing>();
    for (const entry of pricing) map.set(entry.planSlug, entry);
    return map;
  }, [pricing]);

  /**
   * How the applied coupon changes a given plan card. Free plans are never
   * affected — there is nothing to discount or grant.
   */
  const effectForPlan = useCallback(
    (planSlug: string, planPrice: number): PlanCouponEffect => {
      if (!applied) return { type: "none" };
      if (planPrice <= 0 || planSlug === "free") return { type: "none" };

      if (applied.kind === "FREE_ACCESS") {
        return applied.planSlug === planSlug
          ? { type: "free", durationDays: applied.durationDays }
          : { type: "not-applicable" };
      }

      if (applied.planSlug && applied.planSlug !== planSlug) {
        return { type: "not-applicable" };
      }

      const priced = pricingBySlug.get(planSlug);
      if (!priced || typeof applied.discountPercentage !== "number") {
        return { type: "not-applicable" };
      }

      return {
        type: "discount",
        percentage: applied.discountPercentage,
        originalPrice: priced.originalPrice,
        price: priced.discountedPrice,
      };
    },
    [applied, pricingBySlug],
  );

  return {
    code,
    setCode,
    applied,
    pricing,
    isWorking,
    apply,
    clear,
    redeemFreeAccess,
    effectForPlan,
  };
}

export type SubscriptionCouponState = ReturnType<typeof useSubscriptionCoupon>;
