export function getSafeNavigationTarget(
  target: string | null | undefined,
  fallback = "/",
) {
  if (!target) {
    return fallback;
  }

  if (target.startsWith("/")) {
    return target;
  }

  try {
    const url = new URL(target);
    const path = `${url.pathname}${url.search}${url.hash}`;

    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
}
