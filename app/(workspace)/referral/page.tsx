import { PwaReferralScreen } from "@/components/shared/pwa-menu-detail-screens";
import { createNoIndexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createNoIndexMetadata({
  title: "Referrals",
  description: "Invite friends to Question Call.",
});

export default function ReferralPage() {
  return <PwaReferralScreen />;
}
