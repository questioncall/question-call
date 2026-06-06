import { PwaThemeScreen } from "@/components/shared/pwa-menu-detail-screens";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
  title: "Theme",
  description: "Change your Question Call theme.",
});

export default function ThemePage() {
  return <PwaThemeScreen />;
}
