"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface EsewaPayButtonProps {
  planSlug: string;
  amount: number;
  className?: string;
  disabled?: boolean;
}

export default function EsewaPayButton({ planSlug, amount, className, disabled }: EsewaPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1 — Get signed params from your server
      const res = await fetch("/api/payments/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate payment");
      }

      const params = await res.json();

      // Step 2 — Build a hidden form with all the signed params
      const form = document.createElement("form");
      form.method = "POST";
      const paymentUrl = process.env.NEXT_PUBLIC_ESEWA_PAYMENT_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
      form.action = paymentUrl;

      // Attach each param as a hidden input
      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      // Step 3 — Submit the form (user is redirected to eSewa's payment page)
      document.body.appendChild(form);
      form.submit();
      // Page navigates away here — no code runs after this line

    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={handlePay}
        disabled={loading || disabled}
        className={`flex items-center justify-center gap-2 bg-[#61b832] hover:bg-[#4d9727] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors w-full ${className ?? ""}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting to eSewa...
          </>
        ) : (
          <>Pay NPR {amount} with eSewa</>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center bg-red-50 dark:bg-red-900/10 p-2 rounded-lg">{error}</p>
      )}
    </div>
  );
}
