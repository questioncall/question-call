/**
 * In-memory token cache used to pass LiveKit credentials between the
 * accept-call overlay and the call page without a redundant network fetch.
 *
 * Tokens auto-expire after 30 seconds. The cache is consumed once (get + delete)
 * to avoid stale tokens sitting in memory.
 */

export type CachedCallToken = {
  token: string;
  serverUrl: string;
  channelId: string;
  timerDeadline: string;
  timeExtensionCount: number;
};

const TOKEN_CACHE = new Map<string, CachedCallToken>();
const EXPIRY_MS = 30_000; // auto-clear after 30s

/**
 * Store a token payload for a given callSessionId.
 * The entry self-destructs after 30 seconds if not consumed.
 */
export function cacheCallToken(callSessionId: string, data: CachedCallToken) {
  TOKEN_CACHE.set(callSessionId, data);

  setTimeout(() => {
    TOKEN_CACHE.delete(callSessionId);
  }, EXPIRY_MS);
}

/**
 * Consume (get + delete) a cached token for the given callSessionId.
 * Returns `null` if no cached entry exists.
 */
export function consumeCachedCallToken(
  callSessionId: string,
): CachedCallToken | null {
  const entry = TOKEN_CACHE.get(callSessionId);
  if (!entry) return null;

  TOKEN_CACHE.delete(callSessionId);
  return entry;
}
