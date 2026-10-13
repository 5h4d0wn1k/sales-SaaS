import { afterEach, describe, expect, it, vi } from "vitest";
import { revenueReconciliationResponseSchema } from "@sales/shared";

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
          id: "user-revenue-reconciliation",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-revenue-reconciliation",
          workspaceId: "ws-revenue-reconciliation",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("revenue reconciliation route", () => {
  it("returns a guarded manual accounting handoff package for authenticated operators", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/revenue/reconciliation");
    const body = revenueReconciliationResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("revenue-reconciliation");
    expect(body.workspace.name).toBeTruthy();
    expect(body.csv.content).toContain('"Meeting ID","Lead ID","Lead name"');
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        "actual-value",
        "valued-meetings",
        "missing-values",
        "subscription",
      ]),
    );
    expect(body.guardrails).toContain(
      "Revenue reconciliation is a manual accounting handoff; no accounting, payment, CRM, or billing provider records are created or mutated.",
    );
    expect(body.unavailableClaims).toContain(
      "Live accounting sync, invoice matching, payment settlement, tax advice, and revenue-recognition automation are not available unless separately integrated.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/revenue/reconciliation");

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
