import { Context, Next } from "hono";
import { getStorage } from "../storage";
import { db, users, organizations, workspaces } from "@sales/database";
import { eq } from "drizzle-orm";
import {
  decodeAuthSessionToken,
  getAuthSessionTokenFromCookies,
  parseCookieHeader,
} from "../auth-session-token";

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
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // If user doesn't have an organization, create or assign one
    if (!user.organizationId) {
      // Create a personal organization for the user
      const slug = `${user.name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${userId.slice(0, 8)}`;
      const [organization] = await db
        .insert(organizations)
        .values({
          name: user.name || `${user.email}'s Workspace`,
          slug: slug,
          region: "global",
        })
        .returning();

      // Create a default workspace
      const [workspace] = await db
        .insert(workspaces)
        .values({
          organizationId: organization.id,
          name: "Default Workspace",
          industry: "Unknown",
        })
        .returning();

      // Update user with organization
      await db
        .update(users)
        .set({ organizationId: organization.id })
        .where(eq(users.id, userId));

      // Set the organizationId on user object
      user.organizationId = organization.id;

      // Also create a subscription for the organization (free trial)
      const { subscriptions } = await import("@sales/database");
      await db.insert(subscriptions).values({
        organizationId: organization.id,
        planKey: "free",
        status: "trialing",
        usageLimit: 100,
        seats: 1,
      });
    }

    // Get the workspace for this user's organization
    let [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.organizationId, user.organizationId))
      .limit(1);

    if (!workspace && user.organizationId) {
      [workspace] = await db
        .insert(workspaces)
        .values({
          organizationId: user.organizationId,
          name: "Default Workspace",
          industry: "Unknown",
        })
        .returning();
    }

    // Store user info in context for use in route handlers and middleware
    c.set("user", {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      workspaceId: workspace?.id,
    } as AuthUser);

    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
