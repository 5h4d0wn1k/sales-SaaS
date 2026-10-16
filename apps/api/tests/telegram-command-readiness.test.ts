import { afterEach, describe, expect, it, vi } from "vitest";
import { telegramCommandReadinessResponseSchema } from "@sales/shared";

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
          id: "user-telegram-readiness",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-telegram-readiness",
          workspaceId: "ws-telegram-readiness",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("telegram command readiness route", () => {
  it("returns guarded launch checks for a configured chat before first verified command", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");

    const app = await loadAppWithAuth("admin");
    const configureResponse = await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@salesxgrowth_ops_bot",
        chatId: "-1001234567890",
        allowedCommands: [
          "status",
          "brief",
          "approvals",
          "providers",
          "suppressions",
          "sequence",
          "forecast",
          "help",
          "pause",
        ],
      }),
    });

    expect(configureResponse.status).toBe(201);

    const response = await app.request("/v1/command-center/telegram-readiness");
    const body = telegramCommandReadinessResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body.surface).toBe("telegram-command-readiness");
    expect(body.posture).toBe("guarded");
    expect(body.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bot_token", status: "met" }),
        expect.objectContaining({ id: "webhook_secret", status: "met" }),
        expect.objectContaining({ id: "chat_binding", status: "met" }),
        expect.objectContaining({
          id: "webhook_verification",
          status: "watch",
        }),
      ]),
    );
    expect(body.commands.find((command) => command.command === "pause"))
      .toMatchObject({
        mode: "approval_gated",
        status: "enabled",
      });
    expect(body.blockedMutations).toContain(
      "Dispatch campaigns, calls, SMS, or social actions from Telegram",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/command-center/telegram-readiness");

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
