import "server-only";

const DEFAULT_DEV_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getSiteUrl() {
  // Keep the canonical/public site URL independent from auth callback config.
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return normalizeSiteUrl(configuredUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();

  if (vercelUrl) {
    return normalizeSiteUrl(`https://${vercelUrl}`);
  }

  return DEFAULT_DEV_SITE_URL;
}

export const SITE_URL = getSiteUrl();
