import Link from "next/link";

import { AuthShell } from "@/components/shared/auth-shell";
import { Button } from "@/components/ui/button";
import { appendSearchParams } from "@/lib/legacy-auth-redirect";
import { createNoIndexMetadata } from "@/lib/seo";

type LegacyAuthSignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata = createNoIndexMetadata({
  title: "Choose Sign Up Role",
  description: "Choose whether to create a student or teacher account.",
});

export default async function LegacyAuthSignupPage({
  searchParams,
}: LegacyAuthSignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const hasReferral =
    typeof resolvedSearchParams.ref === "string" &&
    resolvedSearchParams.ref.trim().length > 0;
  const studentHref = appendSearchParams(
    "/auth/signup/student",
    resolvedSearchParams,
  );
  const teacherHref = appendSearchParams(
    "/auth/signup/teacher",
    resolvedSearchParams,
  );

  return (
    <AuthShell
      description="Choose the account type that fits how you want to use the platform."
      eyebrow="Choose Role"
      highlights={[
        "Student accounts ask questions, take quizzes, and learn from courses",
        "Teacher accounts answer questions, teach, and earn",
        "You can still use a referral code while choosing either path",
      ]}
      imageQuote="Pick the path that matches what you want to do first. Learning and teaching both start here."
      portalLabel="Student + Teacher"
      title="How do you want to sign up?"
    >
      <div className="space-y-4">
        {hasReferral ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            You were referred by a friend. Choose the role you want first, and the referral will still apply.
          </div>
        ) : null}

        <div className="grid gap-3">
          <Button asChild className="h-12 rounded-xl text-sm font-semibold">
            <Link href={studentHref}>Continue as Student</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-xl text-sm font-semibold">
            <Link href={teacherHref}>Continue as Teacher</Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
