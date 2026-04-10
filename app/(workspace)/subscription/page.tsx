import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { SubscriptionClient } from "./subscription-client";
import { getPlatformConfig, getHydratedPlans } from "@/models/PlatformConfig";

export default async function SubscriptionPage() {
  const session = await getSafeServerSession();
  
  if (session?.user?.role === "TEACHER") {
    redirect("/wallet");
  }

  const config = await getPlatformConfig();
  const hydratedPlans = getHydratedPlans(config);

  return <SubscriptionClient hydratedPlans={JSON.parse(JSON.stringify(hydratedPlans))} trialDays={config.trialDays} />;
}
