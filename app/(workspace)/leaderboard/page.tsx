import { redirect } from "next/navigation";

import { getSafeServerSession, getWorkspaceUser } from "@/lib/auth";
import { getLeaderboardPath } from "@/lib/user-paths";

export default async function LeaderboardPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await getWorkspaceUser(session.user);

  redirect(getLeaderboardPath(user));
}
