import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getDefaultPath, getSafeServerSession } from "@/lib/auth";

export default async function StudentSignUpPage() {
  const session = await getSafeServerSession();

  if (session?.user?.role) {
    redirect(getDefaultPath(session.user.role));
  }

  return (
    <AuthShell
      description="Create a student account and land directly in the shared home feed, with your public profile available at a clean username URL."
      eyebrow="Student Portal"
      highlights={[
        "Student registration stays role-aware",
        "The shared home route is the first stop after sign-in",
        "Each account receives a clean public username path",
      ]}
      portalLabel="Student signup"
      title="Register as a student"
    >
      <AuthForm mode="register" role="STUDENT" />
    </AuthShell>
  );
}
