"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className="rounded-2xl border border-[#281f1614] bg-white/70 px-4 py-2 text-sm font-medium text-[#2d251f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void signOut({
            callbackUrl: "/login",
          });
        })
      }
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
