"use client";

import { TicketPercent, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubscriptionCouponState } from "./use-subscription-coupon";

/**
 * The "Apply a coupon" bar that sits at the TOP of the subscription page.
 * Purely presentational — all coupon state lives in `useSubscriptionCoupon`
 * so the plan cards below can reprice off the same applied code.
 */
export function CouponApplyBar({ coupon }: { coupon: SubscriptionCouponState }) {
  const { code, setCode, applied, isWorking, apply, clear } = coupon;

  if (applied) {
    const summary =
      applied.kind === "FREE_ACCESS"
        ? `unlocks the ${applied.planSlug?.toUpperCase()} plan${
            applied.durationDays ? ` for ${applied.durationDays} days` : ""
          } for free`
        : `takes ${applied.discountPercentage}% off ${
            applied.planSlug ? `the ${applied.planSlug.toUpperCase()} plan` : "any paid plan"
          }`;

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1B7258]/40 bg-emerald-50/60 px-5 py-4 dark:border-[#27A883]/30 dark:bg-emerald-900/15 sm:flex-row sm:items-center">
        <TicketPercent className="h-5 w-5 shrink-0 text-[#1B7258] dark:text-[#27A883]" />
        <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px] font-bold text-[#1B7258] dark:bg-black/30 dark:text-[#27A883]">
            {applied.code}
          </code>{" "}
          applied — {summary}. Your plans below are updated.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={isWorking}
          className="shrink-0 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-[#1B7258]/40 bg-emerald-50/40 px-5 py-4 dark:border-[#27A883]/30 dark:bg-emerald-900/10 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <TicketPercent className="h-5 w-5 shrink-0 text-[#1B7258] dark:text-[#27A883]" />
        <span className="text-sm font-bold whitespace-nowrap text-neutral-900 dark:text-white">
          Apply a coupon
        </span>
      </div>
      <div className="flex flex-1 gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") void apply();
          }}
          placeholder="Enter your code"
          className="bg-white font-mono uppercase dark:bg-neutral-900"
        />
        <Button
          onClick={() => void apply()}
          disabled={isWorking || !code.trim()}
          className="shrink-0 rounded-xl bg-[#1B7258] text-white hover:bg-[#145C46]"
        >
          {isWorking ? "Checking…" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
