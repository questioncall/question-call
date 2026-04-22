import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { GlobalNoticeModal } from "@/components/shared/global-notice-modal";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";
import { getSignInPath } from "@/lib/user-paths";
import { getPlatformConfig, getPlatformSocialLinks } from "@/models/PlatformConfig";

export const metadata = createNoIndexMetadata({
  title: "Workspace",
  description: "Private learning workspace for signed-in Question Call members.",
});

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

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const workspaceUser = await getWorkspaceUser(session.user);
  const socialLinks = getPlatformSocialLinks(await getPlatformConfig());

  return (
    <>
      <GlobalNoticeModal />
      <WorkspaceShell user={workspaceUser} socialLinks={socialLinks} defaultOpen={defaultOpen}>
        {children}
      </WorkspaceShell>
    </>
  );
}
