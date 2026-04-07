import { redirect } from "next/navigation";

import { AutoSignOut } from "@/components/shared/auto-signout";
import { AuthShell } from "@/components/shared/auth-shell";
import { getSafeServerSession } from "@/lib/auth";
import { getSignInPath } from "@/lib/user-paths";

export default async function SignOutPage() {
  const session = await getSafeServerSession();

  if (!session?.user) {
    redirect(getSignInPath());
  }

  return (
    <AuthShell
      description="This route exists so logout also has a clean canonical URL under the auth namespace."
      eyebrow="Session"
      highlights={[
        "Canonical sign-out route lives under /auth/signout",
        "The session is cleared immediately on page load",
        "After sign-out you return to /auth/signin",
      ]}
      portalLabel="Secure logout"
      title="Signing you out"
    >
      <AutoSignOut />
    </AuthShell>
  );
}
