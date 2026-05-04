import { Context, Next } from "hono";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";
import {
  decodeAuthSessionToken,
  getAuthSessionTokenFromCookies,
  parseCookieHeader,
} from "../auth-session-token";
import { ensureUserTenantAccess, TenantAccessError } from "../tenant-access";

const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}
const authSecret = AUTH_SECRET;

function isTestAuthBypassEnabled() {
  return process.env.NODE_ENV === "test" && process.env.ALLOW_TEST_AUTH_BYPASS === "true";
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  emailVerified: boolean;
  organizationId?: string;
  workspaceId?: string;
}

export function requireRole(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthUser | undefined;

    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
}

export function requireVerifiedEmail(message = "Verify your email before continuing.") {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthUser | undefined;

    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!user.emailVerified) {
      return c.json({ error: message, code: "email_verification_required" }, 403);
    }

    await next();
  };
}

export async function authMiddleware(c: Context, next: Next) {
  // Public paths that don't require authentication
  const publicPaths = [
    "/health",
    "/v1/foundation/summary",
    "/v1/webhooks/resend",
    "/v1/webhooks/twilio/voice-status",
    "/v1/billing/webhook/stripe",
    "/v1/billing/webhook/razorpay",
    "/v1/auth/register",
    "/v1/auth/verify-email/request",
    "/v1/auth/verify-email/confirm",
    "/v1/auth/password-reset/request",
    "/v1/auth/password-reset/confirm",
    "/v1/auth/health",
  ];

  const isPublic = publicPaths.some((path) => c.req.path.startsWith(path));

  if (isPublic || c.req.method === "OPTIONS") {
    return next();
  }

  // Get token from Authorization header or session cookie
  const authHeader = c.req.header("Authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const cookieHeader = c.req.header("cookie") ?? null;
    const cookies = parseCookieHeader(cookieHeader);
    token = getAuthSessionTokenFromCookies(cookies);
  }

  if (!token) {
    if (isTestAuthBypassEnabled()) {
      c.set("user", {
        id: "00000000-0000-4000-8000-000000000001",
        email: "test@example.com",
        name: "Test User",
        role: "owner",
        emailVerified: true,
      } as AuthUser);

      return next();
    }

    return c.json({ error: "Authentication required" }, 401);
  }

  try {
    const payload = await decodeAuthSessionToken(token, authSecret);
    if (!payload) {
      throw new Error("Invalid token");
    }

    const userId =
      typeof payload.sub === "string"
        ? payload.sub
        : typeof payload.id === "string"
          ? payload.id
          : null;
    if (!userId) {
      throw new Error("Invalid token: missing user ID");
    }

    // Fetch user from database with organization
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.displayName,
        role: users.role,
        organizationId: users.organizationId,
        activeWorkspaceId: users.activeWorkspaceId,
        emailVerifiedAt: users.emailVerified,
        sessionInvalidBefore: users.sessionInvalidBefore,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (user.sessionInvalidBefore) {
      const issuedAt =
        typeof payload.iat === "number" ? new Date(payload.iat * 1000) : null;

      if (!issuedAt || issuedAt.getTime() <= user.sessionInvalidBefore.getTime()) {
        return c.json({ error: "Session expired. Please sign in again." }, 401);
      }
    }

    const access = await ensureUserTenantAccess({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      activeWorkspaceId: user.activeWorkspaceId,
    });

    // Store user info in context for use in route handlers and middleware
    c.set("user", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: access.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      organizationId: access.organizationId,
      workspaceId: access.workspaceId,
    } as AuthUser);

    await next();
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
        },
        error.status as 400 | 401 | 403 | 404 | 409,
      );
    }

    console.error("Auth error:", error);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
