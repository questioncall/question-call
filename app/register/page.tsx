import { redirect } from "next/navigation";

import {
  appendSearchParams,
} from "@/lib/legacy-auth-redirect";

type LegacyRootRegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyRootRegisterPage({
  searchParams,
}: LegacyRootRegisterPageProps) {
  redirect(
    appendSearchParams(
      "/auth/signup",
      await searchParams,
    ),
  );
}
