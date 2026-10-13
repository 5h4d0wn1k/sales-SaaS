import { afterEach, describe, expect, it, vi } from "vitest";
import { revenueForecastResponseSchema } from "@sales/shared";

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
          id: "user-revenue-forecast",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-revenue-forecast",
          workspaceId: "ws-revenue-forecast",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("revenue forecast route", () => {
  it("returns a guarded deterministic forecast for authenticated operators", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/revenue/forecast");
    const body = revenueForecastResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("revenue-forecast");
    expect(body.workspace.name).toBeTruthy();
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        "weighted-pipeline",
        "pipeline-gap",
        "lead-coverage",
        "meeting-coverage",
      ]),
    );
    expect(body.stages.map((stage) => stage.id)).toEqual(
      expect.arrayContaining(["qualified", "contacted", "meeting_booked", "won"]),
    );
    expect(body.guardrails).toContain(
      "Forecast is deterministic planning guidance, not guaranteed revenue.",
    );
    expect(body.unavailableClaims).toContain(
      "Guaranteed revenue, guaranteed meetings, and autonomous close-rate optimization are not available.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/revenue/forecast");

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
