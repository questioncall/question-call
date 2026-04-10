import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SubscriptionClient } from "./subscription-client";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";

export default async function SubscriptionPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "TEACHER") {
    redirect("/wallet");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin/pricing");
  }

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);

  return <SubscriptionClient hydratedPlans={JSON.parse(JSON.stringify(hydratedPlans))} trialDays={config.trialDays} />;
}
