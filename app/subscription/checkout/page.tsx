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
  searchParams: Promise<{ plan?: string; theme?: string }>;
}) {
  const [session, isCheckout, { plan: planQuery, theme }] = await Promise.all([
    getSafeServerSession(),
    isCheckoutRequest(),
    searchParams,
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);
  const manualPayment = getManualPaymentDetails(config);

  const planSlug = planQuery || "1month";
  const plan = hydratedPlans.find((p) => p.slug === planSlug) || hydratedPlans[1];

  return (
    <PlanCheckoutClient
      plan={{
        slug: plan.slug,
        name: plan.name,
        price: plan.price,
        tax: plan.tax,
        originalPrice: plan.originalPrice ?? null,
        features: plan.features ?? [],
      }}
      manualPayment={manualPayment}
      checkoutMode={isCheckout}
      forcedTheme={parseCheckoutTheme(theme)}
    />
  );
}
