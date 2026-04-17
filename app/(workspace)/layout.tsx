import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { GlobalNoticeModal } from "@/components/shared/global-notice-modal";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getSignInPath } from "@/lib/user-paths";

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

  return (
    <>
      <GlobalNoticeModal />
      <WorkspaceShell user={workspaceUser} defaultOpen={defaultOpen}>
        {children}
      </WorkspaceShell>
    </>
  );
}
