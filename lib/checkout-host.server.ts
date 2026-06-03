import { headers } from "next/headers";

import { isCheckoutHostname } from "./checkout-host";

/**
 * Server-side: is the current request served from the checkout subdomain?
 * Reads the forwarded host first (set by the platform proxy), then the raw host.
 */
export async function isCheckoutRequest(): Promise<boolean> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  return isCheckoutHostname(host);
}
