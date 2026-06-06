import { PwaChangePasswordScreen } from "@/components/shared/pwa-menu-detail-screens";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Change Password",
  description: "Change your Question Call password.",
});

export default function ChangePasswordPage() {
  return <PwaChangePasswordScreen />;
}
