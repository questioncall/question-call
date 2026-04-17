/**
 * Next.js Instrumentation Hook - v14 compatible
 * DB connections handled lazily on first request
 */

export async function register() {
  console.log("[instrumentation] Server ready ✓");
}

export function onRequestError(err: Error, request: Request) {
  console.error("[instrumentation] Request error:", err.message);
}
