/**
 * The dedicated checkout subdomain (e.g. buy.questioncall.com).
 *
 * The mobile app hands users off here for manual eSewa payment. On this host we
 * strip the full web chrome (global nav, "back to course", PWA install prompts)
 * and show only the product + payment surface, so it behaves like a focused
 * payment gateway rather than the whole web app.
 *
 * Override with NEXT_PUBLIC_CHECKOUT_HOST when the domain differs per env.
 *
 * This module is client-safe (no next/headers). Server code should use
 * isCheckoutRequest() from "./checkout-host.server".
 */
export const CHECKOUT_HOST = (
  process.env.NEXT_PUBLIC_CHECKOUT_HOST || "buy.questioncall.com"
).toLowerCase();

/** Strip port, take the first forwarded value, lower-case. */
export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(",")[0].split(":")[0].trim().toLowerCase();
}

export function isCheckoutHostname(host: string | null | undefined): boolean {
  return normalizeHost(host) === CHECKOUT_HOST;
}

/** Client-side check based on the current browser location. */
export function isCheckoutHostClient(): boolean {
  if (typeof window === "undefined") return false;
  return isCheckoutHostname(window.location.hostname);
}

export type CheckoutTheme = "light" | "dark";

/**
 * Normalize a `?theme=` value (passed by the app so the checkout matches the
 * app's theme, not the device/browser). Anything unrecognized → undefined,
 * which lets the page fall back to its default (light on the checkout subdomain,
 * next-themes on the main website).
 */
export function parseCheckoutTheme(
  value: string | string[] | null | undefined,
): CheckoutTheme | undefined {
  const raw = (Array.isArray(value) ? value[0] : value)?.toLowerCase();
  return raw === "dark" ? "dark" : raw === "light" ? "light" : undefined;
}
