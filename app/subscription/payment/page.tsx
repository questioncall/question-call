/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, Info } from "lucide-react";
import { LegalDialog } from "@/components/shared/legal-dialog";
import { TransactionModal } from "@/components/payment/transaction-modal";
import {
  getHydratedPlans,
  getManualPaymentDetails,
  getPlatformConfig,
} from "@/models/PlatformConfig";
import EsewaPayButton from "@/components/payment/esewa-pay-button";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getSafeServerSession();

  // Route security
  if (!session?.user) {
    redirect("/login");
  }
  // Unwrap search params asynchronously properly for Next.js latest dynamic constraints
  const { plan: planQuery } = await searchParams;

  // Retrieve plan safely, defaulting to the 1 Month Plan if not found
  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);
  const manualPayment = getManualPaymentDetails(config);
  
  const planSlug = planQuery || "1month";
  const plan = hydratedPlans.find((p) => p.slug === planSlug) || hydratedPlans[1];

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] text-neutral-900 dark:text-white flex flex-col p-6 md:p-12">
      
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between mb-8 md:mb-16">
        <Link href="/subscription" className="flex items-center gap-2 text-sm font-medium hover:text-[#1B7258] transition-colors rounded-full px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-800">
          <ChevronLeft className="w-4 h-4" />
          Configure your plan
        </Link>
        <div className="font-bold text-xl tracking-tight hidden md:block text-[#1B7258] dark:text-[#27A883]">
          EduAsk
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">
        
        {/* Left Side: Payment Method (QR) */}
        <section className="flex flex-col">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            Payment method
          </h2>
          
          <div className="bg-white dark:bg-[#2A2A2A] rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center text-center">
             <div className="w-48 h-48 bg-white p-2 rounded-xl border border-neutral-100 shadow-sm mb-6 flex items-center justify-center">
                 <img 
                    src={manualPayment.qrCodeUrl} 
                    alt="Payment QR Code" 
                    className="w-full h-full object-contain"
                 />
             </div>
             
             <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-100 mb-1">
               {manualPayment.recipientName}
             </h3>
             <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-6">
               eSewa: {manualPayment.esewaNumber}
             </p>

             <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs text-left p-4 rounded-xl flex items-start gap-3 w-full">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Please scan the QR code above or manually transfer the total due amount to the number provided. Save you transaction screenshot and ID to submit below.
                </p>
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
                Check your inbox! We will notify you via email as soon as your plan is activated.
              </p>
            </div>
          </div>
        </section>

        {/* Right Side: Plan Summary */}
        <section className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-lg relative overflow-hidden">
          {/* subtle accent glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B7258] opacity-[0.03] dark:opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>

          <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">
            {plan.name}
          </h1>
          
          <h4 className="text-sm font-semibold text-neutral-500 mb-4 uppercase tracking-wider">Top features</h4>
          <ul className="space-y-4 mb-10">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-neutral-700 dark:text-neutral-300">
                <CheckCircle2 className="w-5 h-5 text-[#1B7258] dark:text-[#27A883] shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-700/50 pt-6 mb-8 text-[14px]">
            <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
              <span>Subscription value</span>
              <span>NPR {((plan.originalPrice && plan.price < plan.originalPrice) ? plan.originalPrice : plan.price).toFixed(2)}</span>
            </div>
            {(plan.originalPrice && plan.price < plan.originalPrice) && (
              <div className="flex justify-between items-center text-[#1B7258] dark:text-[#27A883] font-medium">
                <span>Discount applied</span>
                <span>- NPR {(plan.originalPrice - plan.price).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
              <span>Estimated tax</span>
              <span>NPR {plan.tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-neutral-100 dark:border-neutral-700/50 pt-4 mt-2 flex justify-between items-center font-bold text-lg text-neutral-900 dark:text-white">
              <span>Due today</span>
              <span>NPR {(plan.price + plan.tax).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-6">
            <TransactionModal planSlug={plan.slug} />

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
              <span className="flex-shrink-0 mx-4 text-neutral-400 dark:text-neutral-500 text-xs font-medium uppercase tracking-wider">or auto payment</span>
              <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
            </div>

            <div className="flex flex-col gap-2">
              <EsewaPayButton planSlug={plan.slug} amount={plan.price + plan.tax} />
              <p className="text-[11px] text-center text-neutral-500 font-medium">Note: eSewa is currently in <span className="text-[#1B7258] dark:text-[#27A883]">sandbox mode</span>. Not for real use right now.</p>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}
