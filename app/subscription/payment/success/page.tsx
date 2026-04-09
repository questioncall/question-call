"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      router.push("/");
    }
  }, [countdown, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] text-neutral-900 dark:text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-10 max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col items-center">
        
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-[#1B7258] dark:text-emerald-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-neutral-900 dark:text-white">
          Payment Submitted!
        </h1>
        
        <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-8">
          Your transaction has been securely captured. We are manually reviewing your payment now and will send you an email confirmation as soon as your account is activated.
        </p>
        
        <div className="text-xs font-semibold text-neutral-400 mb-6 bg-neutral-50 dark:bg-neutral-800/50 py-2 px-4 rounded-full">
          Redirecting to your dashboard in <span className="text-[#1B7258] dark:text-emerald-400">{countdown}s</span>...
        </div>

        <Link href="/" className="w-full">
          <Button className="w-full h-12 rounded-full font-semibold shadow-md bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 gap-2">
            Go to home <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
