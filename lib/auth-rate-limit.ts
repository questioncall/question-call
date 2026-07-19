import { NextResponse } from "next/server";

import { enforceRequestRateLimit, getRequestIp } from "@/lib/request-rate-limit";

/**
 * Rate limiting for PRE-AUTHENTICATION endpoints (login, register, OTP send and
 * verify). These run before a session exists, so they bucket on the supplied
 * email and on the client IP rather than a userId.
 *
 * Both buckets are checked: the per-email cap stops a focused attack on one
 * account, the per-IP cap stops a spray across many accounts from one host.
 *
 * Mirrors the `requireMobileAdmin` gate shape — return `result.response`
 * directly when `ok` is false.
 */
export type AuthRateLimitGate =
  | { ok: true }
  | { ok: false; response: NextResponse };

type Budget = { windowMs: number; maxRequests: number };

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

/** Sensible defaults per action; override per call site when needed. */
export const AUTH_RATE_LIMITS = {
  login: {
    perEmail: { windowMs: FIFTEEN_MINUTES, maxRequests: 10 },
    perIp: { windowMs: FIFTEEN_MINUTES, maxRequests: 50 },
  },
  register: {
    perEmail: { windowMs: ONE_HOUR, maxRequests: 5 },
    perIp: { windowMs: ONE_HOUR, maxRequests: 10 },
  },
  otpSend: {
    perEmail: { windowMs: ONE_HOUR, maxRequests: 3 },
    perIp: { windowMs: ONE_HOUR, maxRequests: 15 },
  },
  otpVerify: {
    perEmail: { windowMs: FIFTEEN_MINUTES, maxRequests: 10 },
    perIp: { windowMs: FIFTEEN_MINUTES, maxRequests: 30 },
  },
} as const satisfies Record<string, { perEmail: Budget; perIp: Budget }>;

export async function enforceAuthRateLimit(params: {
  action: string;
  request: Request;
  /** Lowercased email, when the endpoint receives one. */
  email?: string | null;
  perEmail: Budget;
  perIp: Budget;
}): Promise<AuthRateLimitGate> {
  const { action, request, email, perEmail, perIp } = params;

  const buckets: Array<{ identifier: string; budget: Budget }> = [];

  if (email) {
    buckets.push({ identifier: `email:${email}`, budget: perEmail });
  }

  const ip = getRequestIp(request);
  if (ip) {
    buckets.push({ identifier: `ip:${ip}`, budget: perIp });
  }

  for (const { identifier, budget } of buckets) {
    const result = await enforceRequestRateLimit({
      action,
      identifier,
      request,
      windowMs: budget.windowMs,
      maxRequests: budget.maxRequests,
    });

    if (!result.ok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: result.error },
          {
            status: 429,
            headers: { "Retry-After": String(result.retryAfterSeconds) },
          },
        ),
      };
    }
  }

  return { ok: true };
}
