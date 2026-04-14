"use client";

import { useEffect, useState } from "react";
import { Leaf, Clock, CalendarDays, HelpCircle } from "lucide-react";
import { LegalDialog } from "@/components/shared/legal-dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlanDef } from "@/lib/plans";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/features/user/user-slice";

export function SubscriptionClient({
  hydratedPlans,
  trialDays,
  initialSubscriptionData,
}: {
  hydratedPlans?: PlanDef[];
  trialDays?: number;
  initialSubscriptionData?: {
    subscriptionStatus: string | null;
    subscriptionEnd: string | null;
    pendingManualPayment: boolean;
    questionsAsked: number;
    planSlug: string | null;
  };
}) {
  const dispatch = useAppDispatch();
  const {
    subscriptionStatus,
    subscriptionEnd,
    pendingManualPayment,
    questionsAsked,
    planSlug,
  } = useAppSelector((state) => state.user);

  const [isHydrated, setIsHydrated] = useState(!!initialSubscriptionData);

  useEffect(() => {
    if (initialSubscriptionData) {
      dispatch(updateProfile({
        subscriptionStatus: initialSubscriptionData.subscriptionStatus as "ACTIVE" | "EXPIRED" | "TRIAL" | "NONE" | null,
        subscriptionEnd: initialSubscriptionData.subscriptionEnd,
        pendingManualPayment: initialSubscriptionData.pendingManualPayment,
        questionsAsked: initialSubscriptionData.questionsAsked,
        planSlug: initialSubscriptionData.planSlug,
      }));
      setIsHydrated(true);
      return;
    }

    let active = true;

    const fetchSub = async () => {
      try {
        const res = await fetch("/api/user/subscription");
        if (res.ok) {
          const data = await res.json();
          dispatch(updateProfile({
            subscriptionStatus: data.subscriptionStatus,
            subscriptionEnd: data.subscriptionEnd,
            pendingManualPayment: data.pendingManualPayment,
            questionsAsked: data.questionsAsked,
            planSlug: data.planSlug,
          }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    void fetchSub();

    return () => {
      active = false;
    };
  }, [initialSubscriptionData, dispatch]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-200 dark:border-neutral-800 border-t-[#1B7258] rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-neutral-500">Syncing plan details...</span>
        </div>
      </div>
    );
  }

  // ==============================
  // UI 3: Under Review
  // ==============================
  if (pendingManualPayment) {
    return (
      <div className="flex h-full w-full flex-col py-16 px-4 items-center justify-center">
        <div className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-10 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 w-full h-2 bg-blue-500"></div>
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-6 mt-4">
            <Clock className="w-10 h-10 text-blue-500 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-neutral-900 dark:text-white">Plan Under Review</h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-8">
            We are currently verifying your manual transaction. Once approved by our team, your new plan limits will actively unlock. We&apos;ll notify you via email immediately!
          </p>
          <Link href="/" className="w-full">
            <Button className="w-full rounded-full h-12 shadow-sm font-semibold">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ==============================
  // UI 2: Active / Trial Dashboard Usage
  // ==============================
  if (subscriptionStatus === "ACTIVE") {
    const daysDiff = subscriptionEnd 
      ? Math.ceil((new Date(subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      : 0;
    
    // Highlight UI if less than 3 days left
    const isEndingSoon = daysDiff <= 3;
    
    return (
      <div className="flex h-full w-full flex-col py-8 px-4 md:px-8 bg-transparent">
        <div className="w-full max-w-4xl mx-auto space-y-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-2">
              Subscription Usage
            </h1>
            <p className="text-sm text-neutral-500">Monitor your current limits and renewal deadlines.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Days Remaining Widget */}
            <div className={`p-8 rounded-3xl border shadow-sm relative overflow-hidden ${
              isEndingSoon 
              ? "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30" 
              : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  isEndingSoon ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <CalendarDays className="w-7 h-7" />
                </div>
                {planSlug === "free" && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-sm border border-purple-200 dark:border-purple-800">
                    Free Trial
                  </span>
                )}
              </div>
              <h3 className={`text-5xl font-bold mb-1 ${isEndingSoon ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}>
                {Math.max(0, daysDiff)} <span className="text-2xl font-medium text-neutral-400">days</span>
              </h3>
              <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-2">
                Remaining in Billing Cycle
              </p>
              
              {isEndingSoon && (
                <div className="mt-8 border-t border-red-100 dark:border-red-900/30 pt-6">
                  <p className="text-[13px] font-semibold text-red-600 dark:text-red-400 mb-4">
                    Wait! Your plan expires soon. Upgrade now to keep access to premium features.
                  </p>
                  <Button 
                    onClick={() => dispatch(updateProfile({ subscriptionStatus: "NONE" }))} 
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-[14px] shadow-md h-12 font-bold transition-all"
                  >
                    View Renewal Plans
                  </Button>
                </div>
              )}
            </div>

            {/* Questions Asked Widget */}
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden flex flex-col">
               <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                  <HelpCircle className="w-7 h-7" />
               </div>
               <h3 className="text-5xl font-bold text-neutral-900 dark:text-white mb-1">
                 {questionsAsked} <span className="text-2xl font-medium text-neutral-400">Total</span>
               </h3>
               <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-2">
                 Questions Asked 
               </p>
               <div className="mt-auto pt-8 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-medium text-neutral-500">
                    <span className="text-[#1B7258] dark:text-[#27A883] font-semibold">Tip:</span> Solve peer questions in the feed to earn massive discounts toward your next renewal!
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================
  // UI 1: Default Pricing / Needs Renewal
  // ==============================
  return (
    <div className="flex h-full w-full flex-col py-8 px-4 md:px-8 bg-transparent">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header portion */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-[2.5rem] font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Choose your plan
            </h1>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1B7258] dark:text-[#27A883]">
              <Leaf className="h-3.5 w-3.5" />
              <span>{trialDays || 3} days free trial</span>
            </div>
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 max-w-sm mt-3 leading-relaxed">
              Get the right plan for yourself. Plans can be upgraded in the future.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8 pt-4">
          {(hydratedPlans || []).map((plan, index) => (
            <div
              key={index}
              className={`flex flex-col bg-white dark:bg-white/5 dark:backdrop-blur-xl p-8 rounded-3xl border ${
                plan.highlight
                  ? "border-neutral-200 dark:border-white/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] relative z-10 lg:-mt-2 lg:-mb-2 lg:scale-[1.03]"
                  : "border-neutral-200 dark:border-white/5 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-5 w-5 items-center justify-center">
                    <div
                      className="absolute h-full w-full rounded-full opacity-20 blur-[4px]"
                      style={{ backgroundColor: plan.color }}
                    ></div>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: plan.color }}
                    ></div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${plan.titleClass}`}
                  >
                    {plan.name}
                  </span>
                </div>
                {plan.badge && (
                  <span
                    className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full shadow-sm bg-neutral-100 dark:bg-white/10"
                    style={{ color: plan.color }}
                  >
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mb-8 flex flex-col">
                {plan.originalPrice && (
                  <div className="text-[15px] font-semibold text-neutral-400 dark:text-neutral-500 line-through mb-1">
                    NPR {plan.originalPrice}
                  </div>
                )}
                <div className="flex items-end gap-2 text-[2.5rem] font-bold tracking-tight text-neutral-900 dark:text-white leading-none">
                  <span className="text-[1.2rem] font-semibold text-neutral-500 mb-1 mr-1">NPR</span>
                  <span>{plan.price}</span>
                  {plan.suffix && (
                    <span className="text-[13px] font-medium text-neutral-400 dark:text-neutral-500 mb-2">
                      {" "}
                      {plan.suffix}
                    </span>
                  )}
                </div>
              </div>

              <ul className="mb-10 flex-1 space-y-4 text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-4">
                    <span className="text-base font-medium text-[#FF9E2A]">
                      +
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.slug === "free" ? "#" : `/subscription/payment?plan=${plan.slug}`}
                className="mt-auto w-full flex"
              >
                <Button
                  variant={plan.highlight ? "default" : "outline"}
                  className={`h-12 w-full rounded-[14px] font-semibold transition-colors ${
                    plan.highlight
                      ? "bg-[#1B7258] hover:bg-[#145C46] text-white shadow-md"
                      : "border-[#1B7258]/40 hover:border-[#1B7258] text-[#1B7258] hover:bg-emerald-50/50"
                  }`}
                >
                  {subscriptionStatus === "EXPIRED" ? "Renew Plan" : "Get Plan"}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Policy Section */}
        <div className="mt-12 text-center pb-8">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            By choosing a plan, you agree to our{" "}
            <LegalDialog
              triggerClassName="font-semibold text-[#1B7258] dark:text-[#27A883] hover:underline underline-offset-4 focus:outline-none"
              triggerLabel="Terms and Policies"
            />
            .
          </p>
        </div>
      </div>
    </div>
  );
}
