import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import {
  getHydratedPlans,
  getManualPaymentDetails,
  getPlatformConfig,
} from "@/models/PlatformConfig";
import { createNoIndexMetadata } from "@/lib/seo";
import { isCheckoutRequest } from "@/lib/checkout-host.server";
import { parseCheckoutTheme } from "@/lib/checkout-host";
import {
  applySubscriptionCouponDiscount,
  validateSubscriptionCoupon,
} from "@/lib/subscription-coupons";
import { PlanCheckoutClient } from "./plan-checkout-client";

export const metadata = createNoIndexMetadata({
  title: "Membership Checkout",
  description: "Private membership purchase flow.",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Dedicated plan checkout for the buy subdomain (mobile hand-off). Unlike the
 * main-website `/subscription/payment` page, the manual eSewa form is inlined
 * here (no modal) and the sandbox auto-pay button is omitted. The web flow is
 * intentionally left untouched.
 */
export default async function PlanCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; theme?: string; coupon?: string }>;
}) {
  const [session, isCheckout, { plan: planQuery, theme, coupon: couponQuery }] =
    await Promise.all([getSafeServerSession(), isCheckoutRequest(), searchParams]);

  if (!session?.user) {
    redirect("/login");
  }

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);
  const manualPayment = getManualPaymentDetails(config);

  const planSlug = planQuery || "1month";
  const plan = hydratedPlans.find((p) => p.slug === planSlug) || hydratedPlans[1];

  // Optional subscription coupon (percentage). Validated again + re-priced
  // server-side inside /api/payments/manual — this only shapes the summary.
  let couponCode: string | null = null;
  let effectivePrice = plan.price;
  if (couponQuery?.trim()) {
    const validation = await validateSubscriptionCoupon({
      code: couponQuery,
      userId: session.user.id,
      userEmail: session.user.email,
      planSlug: plan.slug,
    });
    if (
      validation.valid &&
      validation.coupon.kind === "PERCENTAGE" &&
      typeof validation.coupon.discountPercentage === "number"
    ) {
      couponCode = validation.coupon.code;
      effectivePrice = applySubscriptionCouponDiscount(
        plan.price,
        validation.coupon.discountPercentage,
      );
    }
  }

  return (
    <PlanCheckoutClient
      plan={{
        slug: plan.slug,
        name: plan.name,
        price: effectivePrice,
        tax: plan.tax,
        // When a coupon applies, show the undiscounted price struck through.
        originalPrice: couponCode ? plan.price : (plan.originalPrice ?? null),
        features: plan.features ?? [],
      }}
      couponCode={couponCode}
      manualPayment={manualPayment}
      checkoutMode={isCheckout}
      forcedTheme={parseCheckoutTheme(theme)}
    />
  );
}
