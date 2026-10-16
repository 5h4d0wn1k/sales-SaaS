import { describe, expect, it } from "vitest";
import type {
  ActionProposalListResponse,
  DashboardResponse,
  TelegramIntegrationResponse,
} from "../src/domain";
import {
  buildTelegramNotificationReadiness,
  telegramNotificationReadinessResponseSchema,
} from "../src/telegram-notification-readiness";

const now = "2026-06-06T12:00:00.000Z";

function dashboard(): DashboardResponse {
  return {
    workspace: {
      organizationName: "Northstar Labs",
      workspaceName: "Growth OS",
      region: "global",
      primaryChannel: "email",
    },
    metrics: [],
    leads: [],
    campaigns: [],
    subscription: {
      planKey: "pro",
      status: "active",
      seats: 3,
      usageLimit: 5000,
      monthlyUsage: 120,
    },
    actionItems: [
      {
        id: "action-1",
        title: "Review provider alert",
        detail: "Provider readiness needs review.",
        urgency: "medium",
      },
    ],
    onboarding: {
      id: "onboarding-1",
      status: "completed",
      currentStep: "complete",
      transcript: [],
      extractedProfile: null,
      scraperBrief: null,
      outreachBrief: null,
    },
    sourcePlan: null,
    sourceRuns: [],
    activities: [],
    calls: [],
    meetings: [],
  };
}

function proposals(): ActionProposalListResponse {
  return {
    proposals: [],
    summary: {
      pending: 2,
      highRisk: 0,
      approved: 0,
      rejected: 0,
    },
  };
}

function telegram(overrides: Partial<TelegramIntegrationResponse> = {}): TelegramIntegrationResponse {
  return {
    integration: {
      id: "telegram-1",
      status: "active",
      botUsername: "@salesxgrowth_ops_bot",
      chatIdMask: "-1***7890",
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
      lastUpdateId: 1001,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    deployment: {
      botTokenConfigured: true,
      webhookSecretConfigured: true,
    },
    liveCommands: [
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
    plannedCommands: [],
    recentCommands: [
      {
        id: "telegram-audit-1",
        command: "brief",
        chatIdMask: "-1***7890",
        result: "success",
        detail: "Operator brief summarized for Telegram.",
        createdAt: now,
      },
    ],
    detail: "Telegram command center binding is available for safe commands.",
    ...overrides,
  };
}

const readyConfig = {
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
  payloadReviewConfigured: true,
  maxNotificationsPerHour: 12,
};

describe("telegram notification readiness", () => {
  it("reports ready notification posture when policy, delivery, and chat controls are configured", () => {
    const readiness = telegramNotificationReadinessResponseSchema.parse(
      buildTelegramNotificationReadiness({
        dashboard: dashboard(),
        telegram: telegram(),
        proposals: proposals(),
        config: readyConfig,
        generatedAt: now,
      }),
    );

    expect(readiness).toMatchObject({
      surface: "telegram-notification-readiness",
      posture: "ready",
      summary: {
        enabledNotificationCount: 5,
        notificationTypeCount: 5,
        pendingApprovalCount: 2,
        actionItemCount: 1,
        escalationOwnerConfigured: true,
        deliveryAuditConfigured: true,
        targetChatConfigured: true,
        targetChatMatchesWorkspace: true,
      },
    });
    expect(readiness.controls.find((control) => control.id === "notification_policy"))
      .toMatchObject({
        status: "met",
      });
    expect(readiness.notificationTypes.every((item) => item.status === "enabled")).toBe(true);
    expect(readiness.guardrails[0]).toContain("read-only");
    expect(readiness.unavailableClaims[0]).toContain("No Telegram notification is sent");
  });

  it("keeps notification posture guarded when optional delivery discipline is incomplete", () => {
    const readiness = buildTelegramNotificationReadiness({
      dashboard: dashboard(),
      telegram: telegram(),
      proposals: proposals(),
      config: {
        ...readyConfig,
        quietHoursConfigured: false,
        deliveryAuditConfigured: false,
        providerAlertsConfigured: false,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("guarded");
    expect(readiness.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "quiet_hours", status: "watch" }),
        expect.objectContaining({ id: "delivery_audit", status: "watch" }),
      ]),
    );
    expect(readiness.notificationTypes.find((item) => item.id === "provider_alert"))
      .toMatchObject({
        status: "disabled",
      });
  });

  it("blocks notification readiness when chat, token, policy, or owner controls are missing", () => {
    const readiness = buildTelegramNotificationReadiness({
      dashboard: dashboard(),
      telegram: telegram({
        integration: {
          id: null,
          status: "not_configured",
          botUsername: null,
          chatIdMask: null,
          allowedCommands: ["status", "help"],
          lastUpdateId: null,
          lastVerifiedAt: null,
          createdAt: null,
          updatedAt: null,
        },
        deployment: {
          botTokenConfigured: false,
          webhookSecretConfigured: false,
        },
        recentCommands: [],
      }),
      proposals: proposals(),
      config: {
        notificationsEnabled: false,
        targetChatConfigured: false,
        targetChatMatchesWorkspace: false,
        policyConfigured: false,
        quietHoursConfigured: false,
        escalationOwner: null,
        digestScheduleConfigured: false,
        approvalAlertsConfigured: false,
        providerAlertsConfigured: false,
        conversionAlertsConfigured: false,
        incidentAlertsConfigured: false,
        deliveryAuditConfigured: false,
        maxNotificationsPerHour: 12,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("blocked");
    expect(readiness.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "notification_switch", status: "missing" }),
        expect.objectContaining({ id: "bot_token", status: "missing" }),
        expect.objectContaining({ id: "chat_binding", status: "missing" }),
        expect.objectContaining({ id: "notification_policy", status: "missing" }),
        expect.objectContaining({ id: "escalation_owner", status: "missing" }),
      ]),
    );
    expect(readiness.summary.enabledNotificationCount).toBe(0);
  });
});
