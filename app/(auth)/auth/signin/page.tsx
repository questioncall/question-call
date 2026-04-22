import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { getDefaultPath, getSafeServerSession } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export const metadata = createNoIndexMetadata({
  title: "Sign In",
  description: "Sign in to your Question Call account.",
});

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
      imageQuote="Every sign-in opens something valuable: answers from teachers, quizzes to sharpen your skills, courses to explore, and chances to turn knowledge into earnings."
      portalLabel="Student + Teacher"
      title="Sign in to continue"
    >
      <AuthForm callbackUrl={callbackUrl} mode="login" />
    </AuthShell>
  );
}
