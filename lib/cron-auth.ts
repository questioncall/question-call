import crypto from "crypto";

export const CRON_SECRET_ENV_KEY = "CRON_SECRET";
export const CRON_SECRET_HEADER = "x-cron-secret";

type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function normalizeSecret(value: string | null | undefined) {
  return value?.trim() || "";
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  // timingSafeEqual throws on length mismatch, so compare lengths first.
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateCronRequest(request: Request): CronAuthResult {
  // Cron auth is env-only. Never add a hardcoded fallback secret here.
  const configuredSecret = normalizeSecret(process.env[CRON_SECRET_ENV_KEY]);

  if (!configuredSecret) {
    return {
      ok: false,
      status: 500,
      error: `${CRON_SECRET_ENV_KEY} is not configured.`,
    };
  }

  // Headers only. A `?key=<secret>` query param was previously accepted, which
  // wrote the secret into Vercel access logs, proxy/CDN logs, browser history,
  // and the Referer header of any outbound navigation. Cron schedulers should
  // send `x-cron-secret` (or `Authorization: Bearer …`) instead.
  const headerSecret = normalizeSecret(request.headers.get(CRON_SECRET_HEADER));
  const authHeader = normalizeSecret(request.headers.get("authorization"));

  const isAuthorized =
    safeEqual(headerSecret, configuredSecret) ||
    safeEqual(authHeader, configuredSecret) ||
    safeEqual(authHeader, `Bearer ${configuredSecret}`);

  if (!isAuthorized) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
