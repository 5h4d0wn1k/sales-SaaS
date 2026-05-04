import { Context, Next } from "hono";
import { randomUUID } from "node:crypto";
import { createStorageAccessContext, getStorage } from "../storage";

// Simple in-memory rate limiter (production should use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = c.req.header("x-request-id")?.trim() || randomUUID();
  c.set("requestId", requestId);

  await next();

  c.res.headers.set("x-request-id", requestId);
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  // Get user ID or IP for rate limiting
  const user = c.get("user") as { id?: string } | undefined;
  const userId = user?.id ?? "anonymous";
  const key = `rate:${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // per minute

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
  } else {
    if (record.count >= maxRequests) {
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    }
    record.count++;
  }

  // Clean old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  await next();
}

export async function auditLogMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  const user = c.get("user") as {
    id?: string;
    organizationId?: string | null;
    workspaceId?: string | null;
  } | undefined;
  const requestId = c.get("requestId") as string | undefined;
  const storage = await getStorage(createStorageAccessContext(user));

  await next();

  const duration = Date.now() - startTime;
  const organizationId = user?.organizationId ?? null;

  // Log all authenticated and sensitive operations
  const sensitivePaths = [
    "/v1/leads",
    "/v1/campaigns",
    "/v1/calls",
    "/v1/meetings",
    "/v1/billing",
    "/v1/onboarding",
    "/v1/policies",
  ];

  const isSensitive = sensitivePaths.some((path) =>
    c.req.path.startsWith(path)
  );

  if (isSensitive || user) {
    try {
      // Get IP from headers
      const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";

      await storage.audit({
        organizationId,
        actorType: user ? "user" : "system",
        actorId: user?.id,
        eventType: `api.${c.req.method.toLowerCase()}.${c.req.path}`,
        payload: {
          requestId,
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          durationMs: duration,
          userAgent: c.req.header("user-agent") ?? "unknown",
          ip,
        },
      });
    } catch (error) {
      // Audit logging should never fail the request
      console.error("Audit log failed:", error);
    }
  }
}

export function securityHeadersMiddleware(c: Context, next: Next) {
  // Set security headers
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("X-XSS-Protection", "1; mode=block");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  // CSP - adjust based on your frontend needs
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
  ].join("; ");

  c.res.headers.set("Content-Security-Policy", csp);

  return next();
}

export async function validateJsonMiddleware(c: Context, next: Next) {
  const contentType = c.req.header("content-type") ?? "";
  const contentLength = parseInt(c.req.header("content-length") ?? "0", 10);
  const hasTransferEncoding = Boolean(c.req.header("transfer-encoding"));
  const hasRequestBody = contentLength > 0 || hasTransferEncoding;
  const isTwilioWebhook =
    c.req.path === "/v1/webhooks/twilio/voice-status" &&
    contentType.includes("application/x-www-form-urlencoded");

  if (
    c.req.method !== "GET" &&
    c.req.method !== "HEAD" &&
    hasRequestBody &&
    !contentType.includes("application/json") &&
    !isTwilioWebhook
  ) {
    return c.json(
      { error: "Content-Type must be application/json" },
      400
    );
  }

  await next();
}

// Request size limit (1MB for JSON)
const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export async function requestSizeLimitMiddleware(c: Context, next: Next) {
  const contentLength = parseInt(c.req.header("content-length") ?? "0", 10);

  if (contentLength > MAX_BODY_SIZE) {
    return c.json(
      { error: "Request body too large. Maximum size is 1MB." },
      413
    );
  }

  await next();
}
