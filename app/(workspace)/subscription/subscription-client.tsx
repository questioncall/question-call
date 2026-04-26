"use client";

import { useEffect, useState } from "react";
import { Leaf, Clock, CalendarDays, HelpCircle, Play, BookOpen, UserCheck, Zap, Star, Info, CheckCircle2 } from "lucide-react";
import { LegalDialog } from "@/components/shared/legal-dialog";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import Link from "next/link";
import { PlanDef } from "@/lib/plans";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/features/user/user-slice";
import { APP_NAME } from "@/lib/constants";

type FeatureTooltip = {
  label: string;
  description: string;
};

const FEATURE_TOOLTIPS: Record<string, FeatureTooltip> = {
  "ask": {
    label: "Ask Questions",
    description: "Submit academic questions to get answered by verified teachers",
  },
  "play": {
    label: "Play Quiz",
    description: "Answer quiz questions and earn bonus questions for correct answers",
  },
  "premium quiz": {
    label: "Premium Quiz",
    description: "Access exclusive quizzes with higher point multipliers",
  },
  "attend": {
    label: "Attend Courses",
    description: "Watch video courses included with your plan",
  },
  "subscription courses": {
    label: "Subscription Courses",
    description: "Unlock premium courses available only to paid members",
  },
  "top 10%": {
    label: "Priority Teachers",
    description: "Get answers from the top 10% highest-rated teachers",
  },
  "priority teacher": {
    label: "Priority Matching",
    description: "Your questions get matched with teachers first",
  },
  "days": {
    label: "Duration",
    description: "How long your plan remains active",
  },
  "months": {
    label: "Duration",
    description: "Plan validity in months",
  },
};

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
    questionsRemaining: number | null;
    maxQuestions: number;
    baseMaxQuestions: number;
    bonusQuestions: number;
    referralCode: string | null;
    planSlug: string | null;
  };
}) {
  const dispatch = useAppDispatch();
  const {
    subscriptionStatus,
    subscriptionEnd,
    pendingManualPayment,
    questionsAsked,
    questionsRemaining,
    maxQuestions,
    bonusQuestions,
    referralCode,
    planSlug,
  } = useAppSelector((state) => state.user);
  
  const [referralStats, setReferralStats] = useState<{ totalReferred: number; totalBonusEarned: number } | null>(null);

  const [isHydrated, setIsHydrated] = useState(!!initialSubscriptionData);
  const [showPricing, setShowPricing] = useState(false);
  const isTrialPlan = planSlug === "free" && subscriptionStatus === "TRIAL";
  const isPaidPlanActive = subscriptionStatus === "ACTIVE";
  const shouldShowUsageDashboard =
    (isTrialPlan || isPaidPlanActive) && !showPricing;

  useEffect(() => {
    if (initialSubscriptionData) {
      dispatch(updateProfile({
        subscriptionStatus: initialSubscriptionData.subscriptionStatus as "ACTIVE" | "EXPIRED" | "TRIAL" | "NONE" | null,
        subscriptionEnd: initialSubscriptionData.subscriptionEnd,
        pendingManualPayment: initialSubscriptionData.pendingManualPayment,
        questionsAsked: initialSubscriptionData.questionsAsked,
        questionsRemaining: initialSubscriptionData.questionsRemaining,
        maxQuestions: initialSubscriptionData.maxQuestions,
        baseMaxQuestions: initialSubscriptionData.baseMaxQuestions,
        bonusQuestions: initialSubscriptionData.bonusQuestions,
        referralCode: initialSubscriptionData.referralCode,
        planSlug: initialSubscriptionData.planSlug,
      }));
      setIsHydrated(true);
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
            questionsRemaining: data.questionsRemaining,
            maxQuestions: data.maxQuestions,
            baseMaxQuestions: data.baseMaxQuestions,
            bonusQuestions: data.bonusQuestions,
            referralCode: data.referralCode,
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

const fetchReferralStats = async () => {
      try {
        const res = await fetch("/api/user/referral");
        if (res.ok) {
          const data = await res.json();
          setReferralStats({
            totalReferred: data.totalReferred || 0,
            totalBonusEarned: data.totalBonusEarned || 0,
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    if (!initialSubscriptionData) {
      void fetchSub();
    }
    void fetchReferralStats();

    return () => {
      active = false;
    };
  }, [initialSubscriptionData, dispatch]);

  function findFeatureTooltip(featureText: string): FeatureTooltip | null {
    const lower = featureText.toLowerCase();
    for (const key in FEATURE_TOOLTIPS) {
      if (lower.includes(key)) {
        return FEATURE_TOOLTIPS[key];
      }
    }
    return null;
  }

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
  if (shouldShowUsageDashboard) {
    const daysDiff = subscriptionEnd 
      ? Math.ceil((new Date(subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
      : 0;
    
    // Highlight UI if less than 3 days left
    const isEndingSoon = daysDiff <= 3;
    
    return (
      <div className="flex h-full w-full flex-col py-8 px-4 md:px-8 bg-transparent">
        <div className="w-full max-w-4xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-2">
                {isTrialPlan ? "Trial Usage" : "Subscription Usage"}
              </h1>
              <p className="text-sm text-neutral-500">
                {isTrialPlan
                  ? "Your free trial is active right now. Track what is left and upgrade whenever you are ready."
                  : "Monitor your current limits and renewal deadlines."}
              </p>
            </div>
            <Button
              onClick={() => setShowPricing(true)}
              variant="outline"
              className="border-[#1B7258] text-[#1B7258] hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl"
            >
              See More Packages
            </Button>
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
                {isTrialPlan && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-sm border border-purple-200 dark:border-purple-800">
                    Free Trial
                  </span>
                )}
              </div>
              <h3 className={`text-5xl font-bold mb-1 ${isEndingSoon ? "text-red-600 dark:text-red-400" : "text-neutral-900 dark:text-white"}`}>
                {Math.max(0, daysDiff)} <span className="text-2xl font-medium text-neutral-400">days</span>
              </h3>
              <p className="text-[13px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-2">
                {isTrialPlan ? "Remaining in Trial" : "Remaining in Billing Cycle"}
              </p>
              
              {isEndingSoon && (
                <div className="mt-8 border-t border-red-100 dark:border-red-900/30 pt-6">
                  <p className="text-[13px] font-semibold text-red-600 dark:text-red-400 mb-4">
                    {isTrialPlan
                      ? "Your free trial ends soon. Pick a paid plan now to continue without interruption."
                      : "Your plan expires soon. Renew now to keep access to premium features."}
                  </p>
                  <Button 
                    onClick={() => setShowPricing(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-[14px] shadow-md h-12 font-bold transition-all"
                  >
                    View Plans
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
               {questionsRemaining !== null && maxQuestions > 0 && (
                 <div className="mt-4 flex flex-col gap-2">
                   <div className="flex flex-col gap-1 items-end justify-between">
                     <span className="text-sm font-semibold text-[#1B7258] dark:text-[#27A883]">
                       {questionsRemaining} left total
                     </span>
                     {bonusQuestions > 0 && (
                       <span className="text-xs font-medium text-[#1B7258]/80 dark:text-[#27A883]/80">
                         (Includes {bonusQuestions} bonus)
                       </span>
                     )}
                   </div>
                   <div className="flex-1 h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-[#1B7258] dark:bg-[#27A883] rounded-full transition-all"
                       style={{ width: `${Math.round((questionsAsked / maxQuestions) * 100)}%` }}
                     />
                   </div>
                 </div>
               )}
               <div className="mt-auto pt-8 border-t border-neutral-100 dark:border-neutral-800">
                  <p className="text-sm font-medium text-neutral-500">
                    <span className="text-[#1B7258] dark:text-[#27A883] font-semibold">Tip:</span> Solve peer questions in the feed to earn massive discounts toward your next renewal!
                  </p>
               </div>
            </div>
          </div>

          {/* Referral Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
             <div className="flex-1 space-y-4 text-center md:text-left">
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">
                  Refer & Earn Questions! 🎉
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-lg">
                  Share your unique link with friends. When they register, <strong>both of you</strong> get +10 bonus questions added permanently to your active limit. 
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2 justify-center md:justify-start">
                  <div className="bg-white dark:bg-black/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-3 flex items-center gap-3 w-full md:w-auto">
                    <span className="font-mono text-sm text-neutral-500 truncate max-w-[150px] md:max-w-xs select-all">
                      {typeof window !== "undefined" ? `${window.location.origin}/auth/signup?ref=${referralCode}` : `.../auth/signup?ref=${referralCode}`}
                    </span>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText(`${window.location.origin}/auth/signup?ref=${referralCode}`);
                          alert("Link copied to clipboard!");
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                    >
                      Copy Link
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800/50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-xl px-4"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const subject = encodeURIComponent(`Join me on ${APP_NAME}!`);
                        const body = encodeURIComponent(`Hey! I'm using ${APP_NAME} to ask academic questions. Sign up with my link and we both get 10 free bonus questions to ask:\n\n${window.location.origin}/auth/signup?ref=${referralCode}`);
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      }
                    }}
                  >
                    Share via Email
                  </Button>
                </div>
             </div>
             
             {referralStats && (
               <div className="bg-white/80 dark:bg-black/20 backdrop-blur-md rounded-2xl p-5 border border-white/50 dark:border-white/5 min-w-[200px] text-center">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col items-center">
                     <span className="text-3xl font-black text-blue-600 dark:text-blue-400">{referralStats.totalReferred}</span>
                     <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mt-1">Referred</span>
                   </div>
                   <div className="flex flex-col items-center">
                     <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">+{referralStats.totalBonusEarned}</span>
                     <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mt-1">Bonus Qs</span>
                   </div>
                 </div>
               </div>
             )}
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
          
          {(subscriptionStatus === "ACTIVE" || subscriptionStatus === "TRIAL") && (
            <Button
              onClick={() => setShowPricing(false)}
              variant="outline"
              className="border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
            >
              Back to Dashboard
            </Button>
          )}
        </div>

        {/* Pricing Section */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pt-4">
          {(hydratedPlans || []).map((plan, index) => {
            const isCurrentTrialCard = isTrialPlan && plan.slug === "free";
            const isCurrentPaidCard = isPaidPlanActive && plan.slug === planSlug;
            const planHref =
              plan.slug === "free" || isCurrentTrialCard || isCurrentPaidCard
                ? null
                : `/subscription/payment?plan=${plan.slug}`;
            const ctaLabel = isCurrentTrialCard
              ? "Current Trial"
              : isCurrentPaidCard
                ? "Current Plan"
                : plan.slug === "free"
                  ? "Included Trial"
                  : subscriptionStatus === "EXPIRED" && plan.slug === planSlug
                    ? "Renew Plan"
                    : isTrialPlan
                      ? "Upgrade Plan"
                      : isPaidPlanActive
                        ? "Change Plan"
                        : "Get Plan";

            return (
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

                            <ul className="mb-10 flex-1 space-y-5 text-[14px] font-medium text-neutral-700 dark:text-neutral-300">
                {plan.features.map((feature, fIndex) => {
                  const tooltip = findFeatureTooltip(feature);
                  
                  const highlightText = (text: string) => {
                    const parts = text.split(/(\+\s*\d+\s*[Ff]ree|\d+x?)/g);
                    return parts.map((part, i) => {
                      if (part.match(/(\+\s*\d+\s*[Ff]ree|\d+x?)/)) {
                        return <span key={i} className="font-bold text-[#FF9E2A] dark:text-[#FFA03A]">{part}</span>;
                      }
                      return <span key={i}>{part}</span>;
                    });
                  };

                  return (
                    <li key={fIndex} className="flex items-start gap-3">
                      <div className="mt-0.5 min-w-5 flex items-center justify-center">
                        <CheckCircle2 className="w-[18px] h-[18px] text-[#1B7258] dark:text-[#27A883]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-neutral-900 dark:text-white leading-tight">
                          {highlightText(feature)}
                        </span>
                        {tooltip && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-snug">
                            {tooltip.description}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {planHref ? (
                <Link href={planHref} className="mt-auto w-full flex">
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className={`h-12 w-full rounded-[14px] font-semibold transition-colors ${
                      plan.highlight
                        ? "bg-[#1B7258] hover:bg-[#145C46] text-white shadow-md"
                        : "border-[#1B7258]/40 hover:border-[#1B7258] text-[#1B7258] hover:bg-emerald-50/50"
                    }`}
                  >
                    {ctaLabel}
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="mt-auto h-12 w-full rounded-[14px] border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-semibold"
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
            );
          })}
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
