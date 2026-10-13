import { afterEach, describe, expect, it, vi } from "vitest";
import { conversionWorkQueueResponseSchema } from "@sales/shared";

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
          id: "user-conversion-work-queue",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-conversion-work-queue",
          workspaceId: "ws-conversion-work-queue",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("conversion work queue route", () => {
  it("returns a read-only conversion queue for the active workspace", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/conversion/work-queue");
    const body = conversionWorkQueueResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("conversion-work-queue");
    expect(body.workspace.name).toBeTruthy();
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        "call-blockers",
        "overdue-meetings",
        "upcoming-meetings",
        "handoff-candidates",
        "value-gaps",
      ]),
    );
    expect(body.guardrails).toContain(
      "Read-only conversion work queue; no meeting, call, outreach, or provider state changes are performed.",
    );
    expect(body.unavailableClaims).toContain(
      "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/conversion/work-queue");

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
