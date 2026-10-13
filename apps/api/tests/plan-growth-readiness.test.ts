import { afterEach, describe, expect, it, vi } from "vitest";
import { planGrowthReadinessResponseSchema } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
});

async function loadAppWithAuth(role: "owner" | "admin" | "member") {
  vi.resetModules();
  vi.doMock("../src/middleware/auth", async () => {
    const actual = await vi.importActual<typeof import("../src/middleware/auth")>(
      "../src/middleware/auth",
    );

    return {
      ...actual,
      authMiddleware: async (c: any, next: () => Promise<void>) => {
        c.set("user", {
          id: "user-plan-growth",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-plan-growth",
          workspaceId: "ws-plan-growth",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("plan growth readiness route", () => {
  it("returns read-only plan pressure guidance for authenticated operators", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/growth/plan-readiness");
    const body = planGrowthReadinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("plan-growth-readiness");
    expect(body.workspace.planKey).toBeTruthy();
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining(["lead-usage", "outreach-quota", "voice-quota", "provider-budget", "channels"]),
    );
    expect(body.guardrails[0]).toContain("read-only");
    expect(body.unavailableClaims[0]).toContain("No automatic billing upgrade");
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/growth/plan-readiness");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authentication required",
    });

    if (previousBypass === undefined) {
      delete process.env.ALLOW_TEST_AUTH_BYPASS;
    } else {
      process.env.ALLOW_TEST_AUTH_BYPASS = previousBypass;
    }
  }, APP_BOOT_TIMEOUT_MS);
});
