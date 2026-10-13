import { afterEach, describe, expect, it, vi } from "vitest";
import { crmHandoffResponseSchema } from "@sales/shared";

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
          id: "user-crm-handoff",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-crm-handoff",
          workspaceId: "ws-crm-handoff",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("CRM handoff route", () => {
  it("returns a manual CRM export package for the active workspace", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/conversion/crm-handoff");
    const body = crmHandoffResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("crm-handoff");
    expect(body.workspace.name).toBeTruthy();
    expect(body.records.length).toBeGreaterThan(0);
    expect(body.csv.content).toContain('"Lead ID","Full name","Company"');
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        "crm-records",
        "open-pipeline",
        "closed-won",
        "missing-contact",
        "captured-value",
      ]),
    );
    expect(body.guardrails).toContain(
      "CRM handoff is a manual export; no external CRM records are created or mutated.",
    );
    expect(body.unavailableClaims).toContain(
      "Live CRM sync, accounting attribution, billing reconciliation, and autonomous CRM updates are not available unless separately configured.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/conversion/crm-handoff");

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
