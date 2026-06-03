import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getSafeServerSession } from "@/lib/auth";
import { CheckoutShell } from "@/components/checkout/checkout-shell";
import { TransactionModal } from "@/components/payment/transaction-modal";
import {
  getHydratedPlans,
  getManualPaymentDetails,
  getPlatformConfig,
} from "@/models/PlatformConfig";
import EsewaPayButton from "@/components/payment/esewa-pay-button";
import { isCheckoutRequest } from "@/lib/checkout-host.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const [session, isCheckout] = await Promise.all([
    getSafeServerSession(),
    isCheckoutRequest(),
  ]);

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
  const plan =
    hydratedPlans.find((p) => p.slug === planSlug) || hydratedPlans[1];

  return (
    <CheckoutShell
      checkoutMode={isCheckout}
      backHref="/subscription"
      backLabel="Configure your plan"
      manualPayment={manualPayment}
      instruction="Please scan the QR code above or manually transfer the total due amount to the eSewa number provided. Save your transaction screenshot and ID to submit on the right."
      confirmation="Check your inbox! We will notify you via email as soon as your plan is activated."
    >
      {/* Right Side: Plan Summary */}
      <section className="bg-white dark:bg-[#2A2A2A] rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-lg relative overflow-hidden">
        {/* subtle accent glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B7258] opacity-[0.03] dark:opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>

        <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-white">
          {plan.name}
        </h1>

        <h4 className="text-sm font-semibold text-neutral-500 mb-4 uppercase tracking-wider">
          Top features
        </h4>
        <ul className="space-y-4 mb-10">
          {plan.features.map((feature, i) => (
            <li
              key={i}
              className="flex gap-3 text-[14px] text-neutral-700 dark:text-neutral-300"
            >
              <CheckCircle2 className="w-5 h-5 text-[#1B7258] dark:text-[#27A883] shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4 border-t border-neutral-100 dark:border-neutral-700/50 pt-6 mb-8 text-[14px]">
          <div className="flex justify-between items-center text-neutral-600 dark:text-neutral-400">
            <span>Subscription value</span>
            <span>
              NPR{" "}
              {(plan.originalPrice && plan.price < plan.originalPrice
                ? plan.originalPrice
                : plan.price
              ).toFixed(2)}
            </span>
          </div>
          {plan.originalPrice && plan.price < plan.originalPrice && (
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
            <span className="flex-shrink-0 mx-4 text-neutral-400 dark:text-neutral-500 text-xs font-medium uppercase tracking-wider">
              or auto payment
            </span>
            <div className="flex-grow border-t border-neutral-200 dark:border-neutral-700"></div>
          </div>

          <div className="flex flex-col gap-2">
            <EsewaPayButton
              planSlug={plan.slug}
              amount={plan.price + plan.tax}
            />
            <p className="text-[11px] text-center text-neutral-500 font-medium">
              Note: eSewa is currently in{" "}
              <span className="text-[#1B7258] dark:text-[#27A883]">
                sandbox mode
              </span>
              . Not for real use right now.
            </p>
          </div>
        </div>
      </section>
    </CheckoutShell>
  );
}
