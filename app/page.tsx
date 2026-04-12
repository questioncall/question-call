import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { PublicLanding } from "@/components/shared/public-landing";
import { WorkspaceHome } from "@/components/shared/workspace-home";
import { WorkspaceShell } from "@/components/shared/workspace-shell";
import { getDefaultPath, getSafeServerSession, getWorkspaceUser } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    return <PublicLanding />;
  }

  if (session.user.role === "ADMIN") {
    redirect(getDefaultPath(session.user.role));
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const workspaceUser = await getWorkspaceUser(session.user);

  return (
    <WorkspaceShell user={workspaceUser} defaultOpen={defaultOpen}>
      <WorkspaceHome role={workspaceUser.role as "STUDENT" | "TEACHER"} userId={workspaceUser.id} />
    </WorkspaceShell>
  );
}
