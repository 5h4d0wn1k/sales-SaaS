import { describe, expect, it, vi } from "vitest";
import {
  actionProposalListResponseSchema,
  telegramIntegrationResponseSchema,
} from "@sales/shared";
import { DemoStore } from "../src/demo-store";
import { deliverTelegramOperationalNotification } from "../src/telegram-notifications";

function deliveryFixtures() {
  const store = new DemoStore();
  const proposals = store.listActionProposals();

  return {
    dashboard: store.getDashboard(),
    proposals: actionProposalListResponseSchema.parse({
      proposals,
      summary: {
        pending: proposals.filter((proposal) => proposal.status === "pending").length,
        highRisk: proposals.filter(
          (proposal) => proposal.status === "pending" && proposal.riskLevel === "high",
        ).length,
        approved: proposals.filter((proposal) => proposal.status === "approved").length,
        rejected: proposals.filter((proposal) => proposal.status === "rejected").length,
      },
    }),
    telegram: telegramIntegrationResponseSchema.parse({
      integration: {
        id: "tg_delivery_test",
        status: "active",
        botUsername: "@salesxgrowth_ops_bot",
        chatIdMask: "-1***7896",
        allowedCommands: ["status", "brief", "help"],
        lastUpdateId: 123,
        lastVerifiedAt: "2026-06-06T10:00:00.000Z",
        createdAt: "2026-06-06T09:00:00.000Z",
        updatedAt: "2026-06-06T10:00:00.000Z",
      },
      deployment: {
        botTokenConfigured: true,
        webhookSecretConfigured: true,
      },
      liveCommands: ["status", "brief", "help"],
      plannedCommands: [],
      recentCommands: [],
      detail: "Telegram command center binding is available for safe read-only commands.",
    }),
  };
}

function readyConfig(payloadReviewConfigured: boolean) {
  return {
    notificationsEnabled: true,
    targetChatConfigured: true,
    targetChatMatchesWorkspace: true,
    policyConfigured: true,
    quietHoursConfigured: true,
    escalationOwner: "ops@example.com",
    digestScheduleConfigured: true,
    approvalAlertsConfigured: true,
    providerAlertsConfigured: true,
    conversionAlertsConfigured: true,
    incidentAlertsConfigured: true,
    deliveryAuditConfigured: true,
    payloadReviewConfigured,
    maxNotificationsPerHour: 12,
  };
}

describe("telegram notification delivery", () => {
  it("blocks live transport when payload review is not configured", async () => {
    const transport = vi.fn(async () => ({
      sent: true,
      detail: "Fake transport should not be called.",
    }));
    const fixtures = deliveryFixtures();
    const delivery = await deliverTelegramOperationalNotification({
      notificationType: "operator_brief",
      dashboard: fixtures.dashboard,
      proposals: fixtures.proposals,
      telegram: fixtures.telegram,
      config: readyConfig(false),
      targetChatId: "-1001234567896",
      targetChatMatchesWorkspace: true,
      transport,
      generatedAt: "2026-06-06T12:00:00.000Z",
    });

    expect(delivery.mode).toBe("blocked");
    expect(delivery.detail).toContain("payload review is not configured");
    expect(transport).not.toHaveBeenCalled();
  });

  it("uses injected live transport after payload review and keeps the payload summary-only", async () => {
    const transportCalls: Array<[string, string]> = [];
    const transport = vi.fn(async (chatId: string, text: string) => {
      transportCalls.push([chatId, text]);
      return {
      sent: true,
      detail: "Fake Telegram message sent.",
      };
    });
    const fixtures = deliveryFixtures();
    const delivery = await deliverTelegramOperationalNotification({
      notificationType: "operator_brief",
      dashboard: fixtures.dashboard,
      proposals: fixtures.proposals,
      telegram: fixtures.telegram,
      config: readyConfig(true),
      targetChatId: "-1001234567896",
      targetChatMatchesWorkspace: true,
      transport,
      generatedAt: "2026-06-06T12:00:00.000Z",
    });

    expect(delivery.mode).toBe("queued");
    expect(delivery.detail).toBe("Fake Telegram message sent.");
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transportCalls[0]?.[0]).toBe("-1001234567896");
    expect(transportCalls[0]?.[1]).toContain("salesxgrowth Operator brief digest");
    expect(transportCalls[0]?.[1]).toContain("Guardrail: this notification did not approve");
    expect(JSON.stringify(delivery)).not.toContain("-1001234567896");
    expect(JSON.stringify(delivery)).not.toContain("telegram-token-test");
  });
});
