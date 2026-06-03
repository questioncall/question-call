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

  const subscriptionValue =
    plan.originalPrice && plan.price < plan.originalPrice
      ? plan.originalPrice
      : plan.price;
  const hasDiscount = Boolean(
    plan.originalPrice && plan.price < plan.originalPrice,
  );

  return (
    <CheckoutShell
      checkoutMode={isCheckout}
      backHref="/subscription"
      backLabel="Configure your plan"
      manualPayment={manualPayment}
      instruction="Scan the QR code or transfer the total due amount to the eSewa number above, then confirm your transaction below."
      confirmation="We'll email you the moment your plan is activated."
    >
      {/* Plan summary */}
      <div className="qc-sec-label">Plan summary</div>
      <div className="qc-card qc-summary">
        <div className="qc-course">
          <div>
            <div className="qc-course-title">{plan.name}</div>
            <div className="qc-course-sub">Question Call membership</div>
          </div>
        </div>

        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            margin: "15px 0 4px",
          }}
        >
          {plan.features.map((feature, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 10,
                fontSize: 13.5,
                color: "var(--text-2)",
                lineHeight: 1.4,
              }}
            >
              <CheckCircle2
                size={17}
                style={{
                  color: "var(--accent)",
                  flex: "0 0 auto",
                  marginTop: 1,
                }}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="qc-line" style={{ marginTop: 8 }}>
          <span>Subscription value</span>
          <span>NPR {subscriptionValue.toFixed(2)}</span>
        </div>
        {hasDiscount ? (
          <div className="qc-line qc-line-disc">
            <span>Discount applied</span>
            <span>- NPR {(plan.originalPrice! - plan.price).toFixed(2)}</span>
          </div>
        ) : null}
        <div className="qc-line">
          <span>Estimated tax</span>
          <span>NPR {plan.tax.toFixed(2)}</span>
        </div>
        <div className="qc-due">
          <span>Due today</span>
          <strong>NPR {(plan.price + plan.tax).toFixed(2)}</strong>
        </div>
      </div>

      {/* Confirm payment */}
      <div className="qc-sec-label">Confirm your payment</div>
      <div className="qc-card">
        <TransactionModal
          planSlug={plan.slug}
          triggerClassName="qc-submit"
          triggerLabel="I have paid — submit details"
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "16px 0",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-3)",
          }}
        >
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          or auto payment
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <EsewaPayButton planSlug={plan.slug} amount={plan.price + plan.tax} />
        <p
          style={{
            fontSize: 11,
            textAlign: "center",
            color: "var(--text-3)",
            marginTop: 8,
          }}
        >
          eSewa auto-pay is currently in sandbox mode — not for real use yet.
        </p>
      </div>
    </CheckoutShell>
  );
}
