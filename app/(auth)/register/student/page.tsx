import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getSafeServerSession, getDefaultPath } from "@/lib/auth";

export default async function StudentRegisterPage() {
  const session = await getSafeServerSession();

  if (session?.user?.role) {
    redirect(getDefaultPath(session.user.role));
  }

  return (
    <AuthShell
      description="Create a student account, then land directly on the authenticated home where the feed and shared shell will live."
      eyebrow="Student Portal"
      highlights={[
        "Student registration stays role-aware",
        "The app home is now the first stop after sign-in",
        "Profile details live on a dedicated profile route",
      ]}
      portalLabel="Student signup"
      title="Register as a student"
    >
      <AuthForm mode="register" role="STUDENT" />
    </AuthShell>
  );
}


