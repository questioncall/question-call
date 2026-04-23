import ApiRequestLog from "@/models/ApiRequestLog";

type RateLimitOptions = {
  action: string;
  userId: string;
  request?: Request;
  windowMs: number;
  maxRequests: number;
};

type RateLimitResult =
  | {
      ok: true;
      remaining: number;
      resetAt: string;
    }
  | {
      ok: false;
      error: string;
      retryAfterSeconds: number;
      resetAt: string;
    };

function getRequestIpAddress(request?: Request) {
  if (!request) {
    return null;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}

export async function enforceRequestRateLimit({
  action,
  userId,
  request,
  windowMs,
  maxRequests,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const resetAt = new Date(now.getTime() + windowMs);
  const ipAddress = getRequestIpAddress(request);
  const key = `${action}:${userId}`;

  const recentCount = await ApiRequestLog.countDocuments({
    key,
    createdAt: { $gte: windowStart },
  });

  if (recentCount >= maxRequests) {
    return {
      ok: false,
      error: "Too many requests. Please slow down and try again shortly.",
      retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)),
      resetAt: resetAt.toISOString(),
    };
  }

  await ApiRequestLog.create({
    key,
    action,
    userId,
    ipAddress,
    createdAt: now,
    expiresAt: resetAt,
  });

  return {
    ok: true,
    remaining: Math.max(0, maxRequests - recentCount - 1),
    resetAt: resetAt.toISOString(),
  };
}
