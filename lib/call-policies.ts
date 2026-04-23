export const CALL_RATE_LIMITS = {
  create: {
    action: "call:create",
    windowMs: 60_000,
    maxRequests: 5,
  },
  accept: {
    action: "call:accept",
    windowMs: 60_000,
    maxRequests: 15,
  },
  reject: {
    action: "call:reject",
    windowMs: 60_000,
    maxRequests: 15,
  },
} as const;
