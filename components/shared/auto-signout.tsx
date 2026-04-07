"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { getSignInPath } from "@/lib/user-paths";
import { LogOutIcon } from "lucide-react";

export function AutoSignOut() {
  useEffect(() => {
    // Add a tiny delay to ensure the user sees the sign out screen
    const timer = setTimeout(() => {
      void signOut({ callbackUrl: getSignInPath() });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
         <LogOutIcon className="h-6 w-6 ml-1" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">Signout in progress</h3>
      <p className="mt-2 text-sm text-gray-500 max-w-sm px-4">
        Clearing your session and preparing to return you to the login screen safely.
      </p>
    </div>
  );
}
