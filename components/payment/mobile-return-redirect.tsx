"use client";

import { useEffect } from "react";

const RETURN_COOKIE = "qc_checkout_return";

export type MobileReturnStatus = "success" | "submitted" | "cancelled";

function readReturnCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${RETURN_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(RETURN_COOKIE.length + 1)) : null;
}

function clearReturnCookie() {
  document.cookie = `${RETURN_COOKIE}=; path=/; max-age=0`;
}

/**
 * If the current checkout was started from the mobile app (the `/checkout` entry
 * route dropped a `qc_checkout_return` cookie holding the app's deep link), bounce
 * back into the app with the given status (and optional payment method) and return
 * true. The Chrome Custom Tab opened by `WebBrowser.openAuthSessionAsync` intercepts
 * the `questioncall://` scheme and closes itself. Inert (returns false) for normal
 * web visitors — call it and fall through to your usual navigation.
 */
export function consumeMobileReturn(
  status: MobileReturnStatus,
  method?: string,
): boolean {
  const returnUrl = readReturnCookie();
  if (!returnUrl) return false;
  clearReturnCookie();
  const params = new URLSearchParams({ status });
  if (method) params.set("method", method);
  const sep = returnUrl.includes("?") ? "&" : "?";
  window.location.assign(`${returnUrl}${sep}${params.toString()}`);
  return true;
}

/**
 * Declarative wrapper around {@link consumeMobileReturn} for success/cancel pages
 * that have no imperative submit handler to hook into. Renders nothing.
 */
export function MobileReturnRedirect({
  status,
  method,
}: {
  status: MobileReturnStatus;
  method?: string;
}) {
  useEffect(() => {
    consumeMobileReturn(status, method);
  }, [status, method]);

  return null;
}
