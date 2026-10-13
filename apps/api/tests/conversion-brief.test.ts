import { afterEach, describe, expect, it, vi } from "vitest";
import { conversionBriefResponseSchema } from "@sales/shared";

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
          id: "user-conversion-brief",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-conversion-brief",
          workspaceId: "ws-conversion-brief",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("conversion brief route", () => {
  it("returns a read-only conversion brief for the active workspace", async () => {
    const app = await loadAppWithAuth("owner");
    const response = await app.request("/v1/conversion/brief");
    const body = conversionBriefResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("conversion-brief");
    expect(body.workspace.name).toBeTruthy();
    expect(body.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        "meeting-candidates",
        "open-meetings",
        "calls-needing-review",
        "closed-won",
      ]),
    );
    expect(body.nextActions.length).toBeGreaterThan(0);
    expect(body.guardrails).toContain(
      "Read-only conversion brief; no scheduling, outreach, or provider work is performed.",
    );
    expect(body.unavailableClaims).toContain(
      "Autonomous calendar scheduling and guaranteed lead conversion are not available.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/conversion/brief");

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
