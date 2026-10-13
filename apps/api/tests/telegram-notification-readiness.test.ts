import { afterEach, describe, expect, it, vi } from "vitest";
import {
  telegramNotificationDeliveryResponseSchema,
  telegramNotificationReadinessResponseSchema,
} from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.useRealTimers();
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
          id: "user-telegram-notification-readiness",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-telegram-notification-readiness",
          workspaceId: "ws-telegram-notification-readiness",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("telegram notification readiness route", () => {
  it("returns guarded delivery checks for a configured chat and partial notification policy", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1001234567890");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_ESCALATION_OWNER", "ops@example.com");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_APPROVAL_ALERTS_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_MAX_PER_HOUR", "12");

    const app = await loadAppWithAuth("admin");
    const configureResponse = await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
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

    const response = await app.request(
      "/v1/command-center/telegram-notification-readiness",
    );
    const body = telegramNotificationReadinessResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body.surface).toBe("telegram-notification-readiness");
    expect(body.posture).toBe("guarded");
    expect(body.summary.enabledNotificationCount).toBe(2);
    expect(body.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "notification_switch", status: "met" }),
        expect.objectContaining({ id: "notification_policy", status: "met" }),
        expect.objectContaining({ id: "chat_binding", status: "met" }),
        expect.objectContaining({ id: "target_chat_secret", status: "met" }),
      ]),
    );
    expect(body.unavailableClaims[0]).toContain("No Telegram notification is sent");
  }, APP_BOOT_TIMEOUT_MS);

  it("sends a safe preview notification test and records delivery posture", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1001234567891");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_ESCALATION_OWNER", "ops@example.com");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_CONFIGURED", "true");

    const app = await loadAppWithAuth("owner");
    const configureResponse = await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
        chatId: "-1001234567891",
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

    const response = await app.request(
      "/v1/command-center/telegram-notifications/test",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
          dryRun: false,
        }),
      },
    );
    const body = telegramNotificationDeliveryResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "telegram-notification-delivery",
      notificationType: "operator_brief",
      mode: "preview",
      provider: "telegram",
      chatIdMask: "-1***7891",
    });
    expect(body.messagePreview).toContain("Winrate Operator brief digest");
    expect(body.messagePreview).toContain("Guardrail: this notification did not approve");
    expect(body.detail).toContain("No network message was sent");
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks notification tests when the deployment target does not match the bound chat", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1000000000000");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_ESCALATION_OWNER", "ops@example.com");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");

    const app = await loadAppWithAuth("admin");
    await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
        chatId: "-1001234567892",
        allowedCommands: ["status", "brief", "help"],
      }),
    });

    const response = await app.request(
      "/v1/command-center/telegram-notifications/test",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
        }),
      },
    );
    const body = telegramNotificationDeliveryResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(409);
    expect(body.mode).toBe("blocked");
    expect(body.detail).toContain("does not match the active workspace");
    expect(JSON.stringify(body)).not.toContain("-1001234567892");
  }, APP_BOOT_TIMEOUT_MS);

  it("rate-limits repeated notification tests before Telegram delivery", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1001234567893");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_ESCALATION_OWNER", "ops@example.com");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_MAX_PER_HOUR", "1");

    const app = await loadAppWithAuth("owner");
    await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
        chatId: "-1001234567893",
        allowedCommands: ["status", "brief", "help"],
      }),
    });

    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        notificationType: "operator_brief",
      }),
    };

    const firstResponse = await app.request(
      "/v1/command-center/telegram-notifications/test",
      request,
    );
    const secondResponse = await app.request(
      "/v1/command-center/telegram-notifications/test",
      request,
    );
    const first = telegramNotificationDeliveryResponseSchema.parse(
      await firstResponse.json(),
    );
    const second = telegramNotificationDeliveryResponseSchema.parse(
      await secondResponse.json(),
    );

    expect(firstResponse.status).toBe(200);
    expect(first.mode).toBe("preview");
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("retry-after")).toBe("3600");
    expect(second.mode).toBe("blocked");
    expect(second.detail).toContain("rate cap reached");
    expect(second.messagePreview).toContain("blocked before delivery");
  }, APP_BOOT_TIMEOUT_MS);

  it("keeps scheduled dispatch public but protected by a scheduler secret", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.stubEnv("TELEGRAM_NOTIFICATION_SCHEDULER_SECRET", "");
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request(
      "/v1/command-center/telegram-notifications/scheduled-dispatch",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("TELEGRAM_NOTIFICATION_SCHEDULER_SECRET");

    if (previousBypass === undefined) {
      delete process.env.ALLOW_TEST_AUTH_BYPASS;
    } else {
      process.env.ALLOW_TEST_AUTH_BYPASS = previousBypass;
    }
  }, APP_BOOT_TIMEOUT_MS);

  it("dispatches a scheduled summary preview after scheduler, quiet-hours, and ledger checks", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T12:00:00.000Z"));
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1001234567894");
    vi.stubEnv("TELEGRAM_NOTIFICATION_SCHEDULER_SECRET", "scheduler-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_START", "22:00");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_END", "08:00");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TIME_ZONE", "UTC");
    vi.stubEnv("TELEGRAM_NOTIFICATION_ESCALATION_OWNER", "ops@example.com");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_CONFIGURED", "true");

    const app = await loadAppWithAuth("owner");
    await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
        chatId: "-1001234567894",
        allowedCommands: ["status", "brief", "help"],
      }),
    });

    const response = await app.request(
      "/v1/command-center/telegram-notifications/scheduled-dispatch",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-notification-scheduler-secret": "scheduler-secret-test",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
        }),
      },
    );
    const body = telegramNotificationDeliveryResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body.mode).toBe("preview");
    expect(body.chatIdMask).toBe("-1***7894");
    expect(body.messagePreview).toContain("Winrate Operator brief digest");
    expect(body.detail).toContain("No network message was sent");
  }, APP_BOOT_TIMEOUT_MS);

  it("skips scheduled Telegram dispatch during configured quiet hours", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-06T22:15:00.000Z"));
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "telegram-token-test");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "telegram-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATIONS_ENABLED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TARGET_CHAT_ID", "-1001234567895");
    vi.stubEnv("TELEGRAM_NOTIFICATION_SCHEDULER_SECRET", "scheduler-secret-test");
    vi.stubEnv("TELEGRAM_NOTIFICATION_POLICY_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED", "true");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_START", "22:00");
    vi.stubEnv("TELEGRAM_NOTIFICATION_QUIET_HOURS_END", "08:00");
    vi.stubEnv("TELEGRAM_NOTIFICATION_TIME_ZONE", "UTC");
    vi.stubEnv("TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED", "true");

    const app = await loadAppWithAuth("admin");
    await app.request("/v1/integrations/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        botUsername: "@winrate_ops_bot",
        chatId: "-1001234567895",
        allowedCommands: ["status", "brief", "help"],
      }),
    });

    const response = await app.request(
      "/v1/command-center/telegram-notifications/scheduled-dispatch",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer scheduler-secret-test",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
        }),
      },
    );
    const body = telegramNotificationDeliveryResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(202);
    expect(body.mode).toBe("blocked");
    expect(body.detail).toContain("quiet hours are active");
    expect(body.messagePreview).toContain("skipped during quiet hours");
    expect(JSON.stringify(body)).not.toContain("-1001234567895");
  }, APP_BOOT_TIMEOUT_MS);

  it("requires owner or admin role for notification tests", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request(
      "/v1/command-center/telegram-notifications/test",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          notificationType: "operator_brief",
        }),
      },
    );

    expect(response.status).toBe(403);
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request(
      "/v1/command-center/telegram-notification-readiness",
    );

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
