"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAppDispatch } from "@/store/hooks";
import { updateProfile } from "@/store/features/user/user-slice";

type VerifyStatus = "verifying" | "success" | "failed";

function EsewaSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<VerifyStatus>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const encodedData = searchParams.get("data");
    const flow = searchParams.get("flow");
    const preferredVerifyUrls =
      flow === "course"
        ? ["/api/payments/esewa/course-verify"]
        : ["/api/payments/esewa/verify", "/api/payments/esewa/course-verify"];

    if (!encodedData) {
      setStatus("failed");
      setMessage("No payment data received from eSewa.");
      return;
    }

    async function verifyPayment() {
      let lastError = "Verification failed. Please contact support.";

      for (const verifyUrl of preferredVerifyUrls) {
        const res = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encodedData }),
        });

        const data = await res.json();
        if (data.success) {
          setStatus("success");
          if (verifyUrl.includes("course-verify")) {
            setMessage("Your course purchase has been verified securely via eSewa.");
            setTimeout(() => router.push(data.redirectTo || "/courses/my"), 3000);
          } else {
            setMessage("Your subscription has been activated securely via eSewa.");

            dispatch(updateProfile({ 
              subscriptionStatus: "ACTIVE",
              planSlug: data.planSlug || "1month",
              pendingManualPayment: false
            }));

            setTimeout(() => router.push("/subscription"), 3000);
          }
          return;
        }

        lastError = data.error || lastError;
      }

      setStatus("failed");
      setMessage(lastError);
    }

    verifyPayment().catch(() => {
      setStatus("failed");
      setMessage("Network error during verification.");
    });
  }, [searchParams, router, dispatch]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] gap-4 text-center px-4">
      {status === "verifying" && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#27A883] border-t-transparent rounded-full animate-spin" />
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">Verifying eSewa payment...</h1>
          <p className="text-gray-500 max-w-sm">Please wait while we confirm your transaction securely with eSewa servers.</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-2">
             <div className="text-green-600 dark:text-green-400 text-4xl">✓</div>
          </div>
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">Payment Successful!</h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-md">{message}</p>
          <p className="text-sm text-neutral-400 mt-2">Redirecting to your plan details...</p>
        </div>
      )}

      {status === "failed" && (
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-2">
             <div className="text-red-600 dark:text-red-400 text-4xl">✗</div>
          </div>
          <h1 className="text-2xl font-bold text-red-600">Verification Failed</h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-sm">{message}</p>
          <a href="/subscription" className="mt-4 px-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-medium rounded-full hover:opacity-90 transition-opacity">
            Return to Subscription
          </a>
        </div>
      )}
    </div>
  );
}

// Suspense boundary required because useSearchParams() is used
export default function EsewaSuccessPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen text-neutral-500 font-medium">Loading eSewa verification...</div>}>
      <EsewaSuccessContent />
    </Suspense>
  );
}
