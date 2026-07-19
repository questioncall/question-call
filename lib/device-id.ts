// Stable per-browser device id, used to tag call accept/reject requests so the
// server's CALL_HANDLED_EVENT fan-out (dismiss incoming-call UI on the same
// account's other devices) can be ignored by the device that performed the
// action. Not a security identifier — purely a self-echo filter.

const STORAGE_KEY = "qc.deviceId";

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Storage unavailable (private mode etc.) — fall back to a per-session id.
    if (!cached) {
      cached = `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return cached;
  }
}
