"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { getSignInPath } from "@/lib/user-paths";
import { LoaderCircleIcon, LogOutIcon } from "lucide-react";

export function AutoSignOut() {
  useEffect(() => {
    // Add a tiny delay to ensure the user sees the sign out screen
    const timer = setTimeout(() => {
      void signOut({ callbackUrl: getSignInPath() });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-border bg-card px-6 py-12 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
         <LogOutIcon className="ml-1 h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">Signing out</h3>
      <p className="mt-2 max-w-sm px-4 text-sm leading-6 text-muted-foreground">
        Clearing your session and preparing to return you to the login screen safely.
      </p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
        <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" />
        Finishing your session
      </div>
    </div>
  );
}
