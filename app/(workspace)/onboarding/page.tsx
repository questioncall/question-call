import { PwaOnboardingScreen } from "@/components/shared/pwa-menu-detail-screens";
import { createNoIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Onboarding Videos",
  description: "Watch your Question Call onboarding video.",
});

export default function OnboardingPage() {
  return <PwaOnboardingScreen />;
}
