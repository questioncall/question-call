import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getDefaultPath, getSafeServerSession } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function SignInPage({ searchParams }: LoginPageProps) {
  const session = await getSafeServerSession();

  if (session?.user?.role) {
    redirect(getDefaultPath(session.user.role));
  }

  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthShell
      description="One shared sign-in route sends students and teachers into the home feed at `/`, while their public profiles live at top-level username URLs."
      eyebrow="Shared Access"
      highlights={[
        "Canonical auth route lives under /auth/signin",
        "Authenticated users land on the app home",
        "Public profiles use the top-level username path",
      ]}
      portalLabel="Student + Teacher"
      title="Sign in to enter EduAsk"
    >
      <AuthForm callbackUrl={callbackUrl} mode="login" />
    </AuthShell>
  );
}
