import { redirect } from "next/navigation";

import {
  appendSearchParams,
  getCanonicalSignUpPathForRole,
} from "@/lib/legacy-auth-redirect";

type LegacyRootRoleRegisterPageProps = {
  params: Promise<{ role: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyRootRoleRegisterPage({
  params,
  searchParams,
}: LegacyRootRoleRegisterPageProps) {
  const { role } = await params;

  redirect(
    appendSearchParams(
      getCanonicalSignUpPathForRole(role),
      await searchParams,
    ),
  );
}
