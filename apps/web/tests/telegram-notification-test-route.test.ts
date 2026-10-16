import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
      "content-type": "application/json",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));
  vi.doMock("@/lib/return-to", async () => import("../lib/return-to"));

  const route = await import(
    "../app/api/command-center/telegram-notifications/test/route"
  );
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request(
    "http://localhost/api/command-center/telegram-notifications/test",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form),
    },
  ) as NextRequest;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("telegram notification test proxy route", () => {
  it("posts a safe notification test through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(
        JSON.stringify({
          surface: "telegram-notification-delivery",
          version: "2026-06-06.telegram-notification-delivery",
          generatedAt: "2026-06-06T00:00:00.000Z",
          notificationType: "operator_brief",
          mode: "preview",
          provider: "telegram",
          chatIdMask: "-1***7890",
          messagePreview: "salesxgrowth Operator brief digest",
          detail:
            "Telegram notification delivery preview generated. No network message was sent.",
          guardrails: [
            "Summary-only Telegram notification.",
            "No approval, outreach dispatch, call dispatch, billing change, provider configuration, or AI-worker execution was performed.",
          ],
          auditEventId: null,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await POST(createPostRequest({
      returnTo: "/settings#telegram-notifications",
      notificationType: "operator_brief",
      dryRun: "false",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/settings");
    expect(location.hash).toBe("#telegram-notifications");
    expect(location.searchParams.get("telegramNotificationStatus")).toBe("previewed");
    expect(location.searchParams.get("telegramNotificationMode")).toBe("preview");
    expect(location.searchParams.get("telegramNotificationType")).toBe(
      "operator_brief",
    );
    expect(location.searchParams.get("telegramNotificationChat")).toBe(
      "-1***7890",
    );
    expect(location.toString()).not.toContain("salesxgrowth+Operator+brief+digest");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/telegram-notifications/test",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          notificationType: "operator_brief",
          dryRun: false,
        }),
      }),
    );
  });

  it("preserves blocked delivery posture without exposing raw target chat IDs", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          surface: "telegram-notification-delivery",
          version: "2026-06-06.telegram-notification-delivery",
          generatedAt: "2026-06-06T00:00:00.000Z",
          notificationType: "operator_brief",
          mode: "blocked",
          provider: "telegram",
          chatIdMask: "-1***7890",
          messagePreview: "salesxgrowth Operator brief digest",
          detail:
            "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID does not match the active workspace chat binding.",
          guardrails: ["Summary-only Telegram notification."],
          auditEventId: null,
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await POST(createPostRequest({
      returnTo: "/settings",
      notificationType: "operator_brief",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/settings");
    expect(location.searchParams.get("telegramNotificationStatus")).toBe("blocked");
    expect(location.searchParams.get("telegramNotificationMode")).toBe("blocked");
    expect(location.searchParams.get("telegramNotificationChat")).toBe(
      "-1***7890",
    );
    expect(location.searchParams.get("telegramNotificationMessage")).toContain(
      "does not match the active workspace",
    );
    expect(location.toString()).not.toContain("-1001234567890");
  });

  it("does not collapse failed delivery responses into queued settings status", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          surface: "telegram-notification-delivery",
          version: "2026-06-06.telegram-notification-delivery",
          generatedAt: "2026-06-06T00:00:00.000Z",
          notificationType: "operator_brief",
          mode: "failed",
          provider: "telegram",
          chatIdMask: "-1***7890",
          messagePreview: "salesxgrowth Operator brief digest",
          detail: "Telegram message failed with status 500.",
          guardrails: ["Summary-only Telegram notification."],
          auditEventId: "audit_123",
        }),
        {
          status: 502,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await POST(createPostRequest({
      returnTo: "/settings#telegram-notifications",
      notificationType: "operator_brief",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.hash).toBe("#telegram-notifications");
    expect(location.searchParams.get("telegramNotificationStatus")).toBe("failed");
    expect(location.searchParams.get("telegramNotificationMode")).toBe("failed");
    expect(location.searchParams.get("telegramNotificationAudit")).toBe("audit_123");
    expect(location.searchParams.get("telegramNotificationMessage")).toContain(
      "failed with status 500",
    );
  });
});
