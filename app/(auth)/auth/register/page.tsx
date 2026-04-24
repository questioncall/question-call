import { redirect } from "next/navigation";

import {
  appendSearchParams,
} from "@/lib/legacy-auth-redirect";

type LegacyAuthRegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LegacyAuthRegisterPage({
  searchParams,
}: LegacyAuthRegisterPageProps) {
  redirect(
    appendSearchParams(
      "/auth/signup",
      await searchParams,
    ),
  );
}
