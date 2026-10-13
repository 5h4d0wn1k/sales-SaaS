import { afterEach, describe, expect, it, vi } from "vitest";
import { outreachSequencePlanResponseSchema } from "@sales/shared";

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
          id: "user-outreach-plan",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-outreach-plan",
          workspaceId: "ws-outreach-plan",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("outreach sequence plan route", () => {
  it("returns read-only sequence planning guidance for authenticated operators", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/outreach/sequence-plan");
    const body = outreachSequencePlanResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("outreach-sequence-plan");
    expect(body.steps.every((step) => step.providerWork === false)).toBe(true);
    expect(body.guardrails[0]).toContain("read-only");
    expect(body.unavailableClaims[0]).toContain("No automatic email send");
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/outreach/sequence-plan");

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
