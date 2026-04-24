import { redirect } from "next/navigation";

import {
  appendSearchParams,
  getCanonicalSignUpPathForRole,
} from "@/lib/legacy-auth-redirect";

type LegacyRoleRegisterPageProps = {
  params: Promise<{ role: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyRoleRegisterPage({
  params,
  searchParams,
}: LegacyRoleRegisterPageProps) {
  const { role } = await params;

  redirect(
    appendSearchParams(
      getCanonicalSignUpPathForRole(role),
      await searchParams,
    ),
  );
}
