import { redirect } from "next/navigation";

import { getSafeServerSession } from "@/lib/auth";
import { getProfilePath, getSignInPath } from "@/lib/user-paths";

export default async function StudentProfilePage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect(getSignInPath());
  }

  redirect(getProfilePath(session.user));
}
