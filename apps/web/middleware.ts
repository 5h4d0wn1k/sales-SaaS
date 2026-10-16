import type { NextFetchEvent, NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
  firstAttemptAt: number;
}

class RateLimiter {
  private readonly windowMs = 10 * 60 * 1000; // 10 minutes
  readonly maxAttempts = 5; // 5 attempts per window
  private readonly lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
  private readonly store = new Map<string, RateLimitEntry>();

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  isAllowed(key: string): { allowed: boolean; retryAfterSeconds?: number; lockedUntil?: number } {
    this.cleanup();
    const now = Date.now();
    const entry = this.store.get(key);

    // If locked out, check if lockout period has passed
    if (entry && entry.count > this.maxAttempts) {
      const lockoutPeriod = entry.firstAttemptAt + this.lockoutDurationMs;
      if (now < lockoutPeriod) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((lockoutPeriod - now) / 1000),
          lockedUntil: lockoutPeriod,
        };
      } else {
        // Lockout expired, reset
        this.store.delete(key);
      }
    }

    if (!entry) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
        firstAttemptAt: now,
      });
      return { allowed: true };
    }

    // Check if window expired
    if (entry.resetAt <= now) {
      this.store.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
        firstAttemptAt: entry.firstAttemptAt,
      });
      return { allowed: true };
    }

    // Check if reached max attempts
    if (entry.count >= this.maxAttempts) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
        lockedUntil: entry.firstAttemptAt + this.lockoutDurationMs,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);
    return { allowed: true };
  }
}

// Global rate limiter instances
const ipRateLimiter = new RateLimiter();
const emailRateLimiter = new RateLimiter();

function getClientIp(request: NextRequest): string {
  // Try different headers in order of preference
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cloudflareIp = request.headers.get("cf-connecting-ip");

  // x-forwarded-for can contain multiple IPs (comma-separated)
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    // Take the first one (client's original IP)
    return ips[0] || "unknown";
  }

  return realIp || cloudflareIp || "unknown";
}

async function extractEmailFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body: any = await request.json();
      // Handle both email and credentials formats
      if (body.email) return body.email as string;
      if (body.credentials && body.credentials.email) return body.credentials.email as string;
      if (body.credentials && typeof body.credentials === "object" && "email" in body.credentials) {
        return body.credentials.email as string;
      }
    }
  } catch {
    // If we can't parse the body, don't block (fail open)
  }
  return null;
}

export async function middleware(request: NextRequest, event?: NextFetchEvent) {
  // Only apply to credentials sign-in path
  const { pathname } = new URL(request.url);
  
  // Check if this is a credentials sign-in attempt
  // NextAuth uses /api/auth/callback/credentials for credentials provider
  if (!pathname.startsWith("/api/auth/callback/credentials")) {
    return;
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    return;
  }

  const clientIp = getClientIp(request);
  const ipKey = `ip:${clientIp}`;
  const email = await extractEmailFromRequest(request);
  const emailKey = email ? `email:${email.toLowerCase()}` : null;

  // Check IP rate limit
  const ipResult = ipRateLimiter.isAllowed(ipKey);
  if (!ipResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many login attempts. Please try again later.",
        retryAfterSeconds: ipResult.retryAfterSeconds,
        lockedUntil: ipResult.lockedUntil,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(ipResult.retryAfterSeconds),
          "X-RateLimit-Limit": String(ipRateLimiter.maxAttempts),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(Date.now() + (ipResult.retryAfterSeconds || 0) * 1000).toISOString(),
        },
      }
    );
  }

  // Check email rate limit if email is available
  if (emailKey) {
    const emailResult = emailRateLimiter.isAllowed(emailKey);
    if (!emailResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many login attempts for this email. Please try again later.",
          retryAfterSeconds: emailResult.retryAfterSeconds,
          lockedUntil: emailResult.lockedUntil,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(emailResult.retryAfterSeconds),
            "X-RateLimit-Limit": String(emailRateLimiter.maxAttempts),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(Date.now() + (emailResult.retryAfterSeconds || 0) * 1000).toISOString(),
          },
        }
      );
    }
  }

  return;
}

export const config = {
  matcher: [
    // Apply middleware to all API auth routes
    "/api/auth/callback/credentials",
    "/api/auth/signin/credentials",
    "/get-started", // This is the sign-in page
  ],
};