import { normalizeClientIpFromHeaders } from "./client-ip";

const CONTACT_INTAKE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS = 5;

type ContactIntakeRateLimitBucket = {
  count: number;
  resetAt: number;
};

export type ContactIntakeRateLimitResult =
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

const contactIntakeRateLimitBuckets = new Map<string, ContactIntakeRateLimitBucket>();

export function normalizeContactIntakeClientIp(
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

export function checkContactIntakeRateLimit(
  clientKey: string,
  now = Date.now(),
): ContactIntakeRateLimitResult {
  const bucket = contactIntakeRateLimitBuckets.get(clientKey);

  if (!bucket || bucket.resetAt <= now) {
    contactIntakeRateLimitBuckets.set(clientKey, {
      count: 1,
      resetAt: now + CONTACT_INTAKE_RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
      limit: CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS,
      remaining: CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: now + CONTACT_INTAKE_RATE_LIMIT_WINDOW_MS,
    };
  }

  if (bucket.count >= CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      limit: CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    limit: CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS,
    remaining: CONTACT_INTAKE_RATE_LIMIT_MAX_REQUESTS - bucket.count,
    resetAt: bucket.resetAt,
  };
}
