import { afterEach, describe, expect, it, vi } from "vitest";
import { outboundChannelReadinessResponseSchema } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
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
          id: "user-channel-readiness",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-channel-readiness",
          workspaceId: "ws-channel-readiness",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("outbound channel readiness route", () => {
  it("returns channel maturity without enabling SMS or social dispatch", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "sales@example.com");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "ACtest");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "twilio-token");
    vi.stubEnv("TWILIO_FROM_NUMBER", "+15550101010");
    vi.stubEnv("TWILIO_TWIML_URL", "https://example.com/twiml.xml");
    vi.stubEnv("SOCIAL_PLATFORM_POLICY_CONFIGURED", "true");
    vi.stubEnv("SOCIAL_HUMAN_REVIEW_CONFIGURED", "true");

    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/outreach/channel-readiness");
    const body = outboundChannelReadinessResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body.surface).toBe("outbound-channel-readiness");
    expect(body.summary.liveDispatchChannels).toEqual(
      expect.arrayContaining(["email", "call"]),
    );
    expect(body.channels.find((channel) => channel.channel === "sms"))
      .toMatchObject({
        status: "roadmap",
        liveDispatchImplemented: false,
      });
    expect(body.unavailableClaims).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Live SMS dispatch"),
        expect.stringContaining("auto-connect"),
      ]),
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/outreach/channel-readiness");

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
