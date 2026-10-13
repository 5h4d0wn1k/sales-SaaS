import { describe, expect, it } from "vitest";
import {
  buildTelegramCommandReadiness,
  telegramCommandReadinessResponseSchema,
} from "../src/telegram-command-readiness";
import type {
  ActionProposalListResponse,
  DashboardResponse,
  TelegramIntegrationResponse,
} from "../src/domain";

const now = "2026-06-05T12:00:00.000Z";

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
    actionItems: [],
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
    proposals: [
      {
        id: "proposal-1",
        type: "telegram_pause",
        status: "pending",
        riskLevel: "medium",
        title: "Pause outreach from Telegram",
        detail: "A verified Telegram command requested a workspace outreach pause.",
        proposedBy: "telegram",
        targetKind: "workspace",
        targetId: null,
        targetLabel: "Workspace outreach",
        payloadSummary: "Pause running outreach after approval.",
        payload: {},
        guardrails: ["No direct Telegram mutation"],
        expectedEffect: "Running campaigns pause after approval.",
        rollbackPlan: "Reject the proposal to keep outreach running.",
        requiredRole: "admin",
        requestedBy: "telegram",
        reviewedBy: null,
        reviewNote: null,
        auditEventId: null,
        createdAt: now,
        reviewedAt: null,
        expiresAt: null,
      },
    ],
    summary: {
      pending: 1,
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
      botUsername: "@winrate_ops_bot",
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

describe("telegram command readiness", () => {
  it("marks fully configured Telegram commands ready while preserving mutation boundaries", () => {
    const readiness = telegramCommandReadinessResponseSchema.parse(
      buildTelegramCommandReadiness({
        dashboard: dashboard(),
        telegram: telegram(),
        proposals: proposals(),
        storageMode: "postgres",
        rateLimit: {
          limit: 12,
          windowSeconds: 60,
        },
        generatedAt: now,
      }),
    );

    expect(readiness).toMatchObject({
      surface: "telegram-command-readiness",
      posture: "ready",
      summary: {
        enabledCommandCount: 9,
        readOnlyCommandCount: 8,
        approvalGatedCommandCount: 1,
        pendingTelegramPauseProposals: 1,
        rateLimit: {
          durableStore: true,
        },
      },
    });
    expect(readiness.commands.find((command) => command.command === "pause"))
      .toMatchObject({
        mode: "approval_gated",
        status: "enabled",
      });
    expect(readiness.blockedMutations).toContain(
      "Approve or reject actions from Telegram",
    );
    expect(readiness.unavailableClaims[0]).toContain("cannot approve");
  });

  it("blocks launch readiness when secrets and binding are missing", () => {
    const readiness = buildTelegramCommandReadiness({
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
      storageMode: "memory",
      rateLimit: {
        limit: 12,
        windowSeconds: 60,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("blocked");
    expect(readiness.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "bot_token", status: "missing" }),
        expect.objectContaining({ id: "webhook_secret", status: "missing" }),
        expect.objectContaining({ id: "rate_limit", status: "watch" }),
      ]),
    );
    expect(readiness.summary.rateLimit.durableStore).toBe(false);
  });
});
