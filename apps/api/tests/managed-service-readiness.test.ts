import { afterEach, describe, expect, it, vi } from "vitest";
import { managedServiceReadinessResponseSchema } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
  delete process.env.MANAGED_SERVICE_SCOPE_POLICY_CONFIGURED;
  delete process.env.MANAGED_SERVICE_SOW_TEMPLATE_CONFIGURED;
  delete process.env.MANAGED_SERVICE_PRICING_POLICY_CONFIGURED;
  delete process.env.MANAGED_SERVICE_DELIVERY_OWNER;
  delete process.env.MANAGED_SERVICE_HANDOFF_CONFIGURED;
  delete process.env.MANAGED_SERVICE_PROVIDER_COST_POLICY_CONFIGURED;
  delete process.env.MANAGED_SERVICE_CAPACITY_CONFIGURED;
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
          id: "user-managed-service",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-managed-service",
          workspaceId: "ws-managed-service",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("managed service readiness route", () => {
  it("returns read-only managed delivery controls for authenticated operators", async () => {
    process.env.MANAGED_SERVICE_SCOPE_POLICY_CONFIGURED = "true";
    process.env.MANAGED_SERVICE_SOW_TEMPLATE_CONFIGURED = "true";
    process.env.MANAGED_SERVICE_PRICING_POLICY_CONFIGURED = "true";
    process.env.MANAGED_SERVICE_DELIVERY_OWNER = "ops@example.com";
    process.env.MANAGED_SERVICE_HANDOFF_CONFIGURED = "true";
    process.env.MANAGED_SERVICE_PROVIDER_COST_POLICY_CONFIGURED = "true";
    process.env.MANAGED_SERVICE_CAPACITY_CONFIGURED = "true";

    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/growth/managed-service-readiness");
    const body = managedServiceReadinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("managed-service-readiness");
    expect(body.recommendedPackage.key).toMatch(/setup-sprint|operator-assist|managed-revops/);
    expect(body.controls.map((control) => control.id)).toEqual(
      expect.arrayContaining([
        "commercial-scope",
        "subscription-state",
        "provider-cost-boundary",
        "approval-workload",
        "conversion-workload",
      ]),
    );
    expect(body.guardrails[0]).toContain("read-only");
    expect(body.unavailableClaims[0]).toContain("No managed-service contract");
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/growth/managed-service-readiness");

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
