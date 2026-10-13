import { normalizeClientIpFromHeaders } from "./client-ip";

const AUTH_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const AUTH_RATE_LIMIT_MAX_REQUESTS = {
  register: 5,
  email_verification_request: 5,
  email_verification_confirm: 20,
  password_reset_request: 5,
  password_reset_confirm: 20,
} as const;

export type AuthRateLimitScope = keyof typeof AUTH_RATE_LIMIT_MAX_REQUESTS;

type AuthRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type AuthRateLimitResult =
  | {
      allowed: true;
      limit: number;
      remaining: number;
      resetAt: number;
    }
  | {
      allowed: false;
      limit: number;
      retryAfterSeconds: number;
      resetAt: number;
    };

const authRateLimitBuckets = new Map<string, AuthRateLimitBucket>();

export function normalizeAuthClientIp(
  forwardedFor?: string | null,
  realIp?: string | null,
  cloudflareConnectingIp?: string | null,
) {
  return normalizeClientIpFromHeaders({
    forwardedFor,
    realIp,
    cloudflareConnectingIp,
  });
}

export function checkAuthRateLimit(
  scope: AuthRateLimitScope,
  clientKey: string,
  now = Date.now(),
): AuthRateLimitResult {
  const normalizedKey = clientKey.trim() || "unknown";
  const limit = AUTH_RATE_LIMIT_MAX_REQUESTS[scope];
  const bucketKey = `${scope}:${normalizedKey}`;
  const bucket = authRateLimitBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    authRateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      limit,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    limit,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}
