import { PwaWithdrawScreen } from "@/components/shared/pwa-menu-detail-screens";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Withdraw",
  description: "Open your Question Call wallet withdrawal screen.",
});

export default function WithdrawPage() {
  return <PwaWithdrawScreen />;
}
