export const CRON_SECRET_ENV_KEY = "CRON_SECRET";
export const CRON_SECRET_QUERY_PARAM = "key";
export const CRON_SECRET_HEADER = "x-cron-secret";

type CronAuthResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

function normalizeSecret(value: string | null | undefined) {
  return value?.trim() || "";
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

  const { searchParams } = new URL(request.url);
  const querySecret = normalizeSecret(
    searchParams.get(CRON_SECRET_QUERY_PARAM),
  );
  const headerSecret = normalizeSecret(
    request.headers.get(CRON_SECRET_HEADER),
  );
  const authHeader = normalizeSecret(request.headers.get("authorization"));

  const isAuthorized =
    querySecret === configuredSecret ||
    headerSecret === configuredSecret ||
    authHeader === configuredSecret ||
    authHeader === `Bearer ${configuredSecret}`;

  if (!isAuthorized) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
