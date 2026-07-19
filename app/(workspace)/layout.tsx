import type { Metadata } from "next";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { GlobalNoticeModal } from "@/components/shared/global-notice-modal";
import { CouponGiftModal } from "@/components/subscription/coupon-gift-modal";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getSignInPath } from "@/lib/user-paths";
import { getPlatformConfig, getPlatformSocialLinks } from "@/models/PlatformConfig";
import { recordDailyActiveUser } from "@/lib/daily-active";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 0,
    },
  },
};

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect(getSignInPath());
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  // Fire-and-forget — must not block the page render
  void recordDailyActiveUser(session.user.id, "web");

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const workspaceUser = await getWorkspaceUser(session.user);
  const config = await getPlatformConfig();
  const socialLinks = getPlatformSocialLinks(config);
  const dailyTargets: { target: number; bonus: number }[] = JSON.parse(
    JSON.stringify((config as any).dailyTargets ?? []),
  );

  return (
    <>
      <GlobalNoticeModal />
      {session.user.role === "STUDENT" && (
        <CouponGiftModal firstName={session.user.name?.split(" ")[0] ?? null} />
      )}
      <WorkspaceShell user={workspaceUser} socialLinks={socialLinks} dailyTargets={dailyTargets} defaultOpen={defaultOpen}>
        {children}
      </WorkspaceShell>
    </>
  );
}
