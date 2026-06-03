/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info } from "lucide-react";

import { LegalDialog } from "@/components/shared/legal-dialog";
import { LogoMark } from "@/components/shared/logo";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ManualPayment = {
  recipientName: string;
  esewaNumber: string;
  qrCodeUrl: string;
};

type CheckoutShellProps = {
  /** True when served from the checkout subdomain (mobile hand-off). Hides the
   *  in-app "back" nav and shows a brand-only header so it reads as a focused
   *  payment gateway. */
  checkoutMode?: boolean;
  /** In-app back target, shown only when NOT in checkoutMode. */
  backHref?: string;
  backLabel?: string;
  manualPayment: ManualPayment;
  /** Blue info line under the QR. */
  instruction?: string;
  /** Green confirmation line below the legal note. */
  confirmation?: string;
  /** Right-hand column — the dynamic product/payment content. */
  children: ReactNode;
};

const DEFAULT_INSTRUCTION =
  "Scan the QR code or manually transfer the total due amount to the eSewa number above. Save your transaction screenshot and ID to submit on the right.";
const DEFAULT_CONFIRMATION =
  "Check your inbox! We will notify you via email as soon as your access is activated.";

function Brand({ withLogo = false }: { withLogo?: boolean }) {
  if (withLogo) {
    return (
      <div className="flex items-center gap-2">
        <LogoMark size={30} className="rounded-lg" />
        <span className="font-bold text-xl tracking-tight text-[#1B7258] dark:text-[#27A883]">
          {APP_NAME}
        </span>
      </div>
    );
  }

  return (
    <div className="font-bold text-xl tracking-tight hidden md:block text-[#1B7258] dark:text-[#27A883]">
      {APP_NAME}
    </div>
  );
}

/**
 * Shared checkout chrome for every paid surface (course, chapter, subscription).
 * The frame — header, two-column grid, and eSewa payment-method panel — is
 * static and identical everywhere; only the QR/recipient data and the right
 * column are injected per purchase type, so checkouts stay consistent.
 */
export function CheckoutShell({
  checkoutMode = false,
  backHref,
  backLabel,
  manualPayment,
  instruction = DEFAULT_INSTRUCTION,
  confirmation = DEFAULT_CONFIRMATION,
  children,
}: CheckoutShellProps) {
  const showBack = !checkoutMode && Boolean(backHref) && Boolean(backLabel);

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] text-neutral-900 dark:text-white flex flex-col p-6 md:p-12">
      {/* Header */}
      <header
        className={cn(
          "w-full max-w-5xl mx-auto flex items-center mb-8 md:mb-12",
          showBack ? "justify-between md:mb-16" : "justify-center",
        )}
      >
        {showBack ? (
          <>
            <Link
              href={backHref!}
              className="flex items-center gap-2 text-sm font-medium hover:text-[#1B7258] transition-colors rounded-full px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel}
            </Link>
            <Brand />
          </>
        ) : (
          <Brand withLogo />
        )}
      </header>

      {/* Main */}
      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
        {/* ── Left: Payment method (static frame, dynamic QR/recipient) ── */}
        <section className="flex flex-col">
          <h2 className="text-xl font-semibold mb-6">Payment method</h2>

          <div className="bg-white dark:bg-[#2A2A2A] rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-48 h-48 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm mb-6 flex items-center justify-center">
              {manualPayment.qrCodeUrl ? (
                <img
                  src={manualPayment.qrCodeUrl}
                  alt="eSewa payment QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-neutral-400">QR unavailable</span>
              )}
            </div>
            <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-100 mb-1">
              {manualPayment.recipientName}
            </h3>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-6">
              eSewa: {manualPayment.esewaNumber || "—"}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs text-left p-4 rounded-xl flex items-start gap-3 w-full">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{instruction}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <p className="text-xs leading-relaxed text-muted-foreground opacity-80">
              By paying, you agree to our{" "}
              <LegalDialog
                triggerClassName="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                triggerLabel="Terms and Policies"
              />
              . Payments are manually verified.
            </p>
            <div className="bg-emerald-50 dark:bg-[#1B7258]/10 border border-emerald-100 dark:border-[#1B7258]/20 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1B7258] dark:text-[#27A883] shrink-0 mt-0.5" />
              <p className="text-[13px] font-medium text-[#114A39] dark:text-emerald-50/90 leading-snug">
                {confirmation}
              </p>
            </div>
          </div>
        </section>

        {/* ── Right: dynamic ── */}
        {children}
      </main>
    </div>
  );
}
