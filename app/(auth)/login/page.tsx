import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getSafeServerSession, getDefaultPath } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSafeServerSession();

  if (session?.user?.role) {
    redirect(getDefaultPath(session.user.role));
  }

  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  return (
    <AuthShell
      description="One shared login routes students and teachers into the app home at `/`, where the shared shell can host the feed, sidebar, and header UI."
      eyebrow="Shared Access"
      highlights={[
        "Credentials auth with NextAuth",
        "Authenticated users land on the app home",
        "Profile routes stay separate from the landing screen",
      ]}
      portalLabel="Student + Teacher"
      title="Sign in to enter EduAsk"
    >
      <AuthForm callbackUrl={callbackUrl} mode="login" />
    </AuthShell>
  );
}


