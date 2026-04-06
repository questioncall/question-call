import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getSafeServerSession, getDefaultPath } from "@/lib/auth";

export default async function TeacherRegisterPage() {
  const session = await getSafeServerSession();

  if (session?.user?.role) {
    redirect(getDefaultPath(session.user.role));
  }

  return (
    <AuthShell
      description="Create a teacher account, then land directly on the authenticated app home where the question feed shell can grow next."
      eyebrow="Teacher Portal"
      highlights={[
        "Teacher registration stays role-aware",
        "The app home is now the post-login landing route",
        "Profile details move to a dedicated teacher profile page",
      ]}
      portalLabel="Teacher signup"
      title="Register as a teacher"
    >
      <AuthForm mode="register" role="TEACHER" />
    </AuthShell>
  );
}


