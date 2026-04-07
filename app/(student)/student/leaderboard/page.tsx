import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { getLeaderboardPath, getSignInPath } from "@/lib/user-paths";

export default async function LegacyStudentLeaderboardRedirectPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect(getSignInPath());
  }

  redirect(getLeaderboardPath(session.user));
}
