import { describe, expect, it } from "vitest";
import {
  buildCommandCenterActionProposalInput,
  buildCommandCenterBrief,
  buildCommandCenterCommandPreview,
  buildCommandCenterPolicyCatalog,
  commandCenterCapabilitiesResponseSchema,
  commandCenterBriefResponseSchema,
  commandCenterCommandPreviewSchema,
  commandCenterPolicyCatalogResponseSchema,
  getCommandCenterCapabilities,
} from "../src/command-center";
import type {
  ActionProposalListResponse,
  DashboardResponse,
  ProviderSummary,
  TelegramIntegrationResponse,
} from "../src/domain";

describe("command center capabilities", () => {
  it("keeps guarded Telegram and beta AI worker control visible with clear availability", () => {
    const capabilities = commandCenterCapabilitiesResponseSchema.parse(
      getCommandCenterCapabilities({ actorRole: "owner" }),
    );

    expect(capabilities.workspaceScoped).toBe(true);
    expect(capabilities.capabilities.find((item) => item.id === "workspace-status")).toMatchObject({
      status: "available",
      accessible: true,
    });
    expect(capabilities.capabilities.find((item) => item.id === "telegram-control")).toMatchObject({
      status: "beta",
      accessible: true,
    });
    expect(
      capabilities.capabilities.find((item) => item.id === "telegram-control")?.guardrails,
    ).toContain("per-chat command throttling");
    expect(capabilities.capabilities.find((item) => item.id === "ai-worker-orchestration")).toMatchObject({
      status: "beta",
      accessible: true,
    });
    expect(capabilities.unavailableClaims).toContain(
      "Telegram cannot mutate outreach, approve actions, or run autonomous operations without in-app owner approval.",
    );
  });

  it("limits high-risk controls for member actors", () => {
    const capabilities = getCommandCenterCapabilities({ actorRole: "member" });

    expect(capabilities.actorRole).toBe("member");
    expect(capabilities.capabilities.find((item) => item.id === "workspace-status")).toMatchObject({
      accessible: true,
    });
    expect(capabilities.capabilities.find((item) => item.id === "approval-review")).toMatchObject({
      requiredRole: "admin",
      accessible: false,
    });
    expect(capabilities.capabilities.find((item) => item.id === "telegram-control")).toMatchObject({
      requiredRole: "admin",
      accessible: false,
    });
  });

  it("falls back unknown actor roles to member-level access", () => {
    const capabilities = getCommandCenterCapabilities({ actorRole: "operator" });

    expect(capabilities.actorRole).toBe("member");
    expect(capabilities.capabilities.find((item) => item.id === "telegram-control")).toMatchObject({
      accessible: false,
    });
  });

  it("builds guarded operator brief and command policy catalog from workspace risk signals", () => {
    const now = "2026-06-04T00:00:00.000Z";
    const dashboard: DashboardResponse = {
      workspace: {
        organizationName: "Northstar Labs",
        workspaceName: "Growth OS",
        region: "global",
        primaryChannel: "email",
      },
      metrics: [
        { label: "Qualified leads", value: "7", detail: "Qualified leads." },
        { label: "Campaigns running", value: "1", detail: "Running campaigns." },
        { label: "Meetings booked", value: "2", detail: "Meetings booked." },
      ],
      leads: [
        {
          id: "lead-1",
          fullName: "Nina Carter",
          email: "nina@example.com",
          company: "VectrCloud",
          source: "website",
          status: "qualified",
          score: 86,
          lastTouchpoint: "Evidence reviewed",
          rejectionReason: null,
        },
      ],
      campaigns: [
        {
          id: "camp-1",
          name: "Founder outbound",
          channel: "email",
          stage: "draft",
          approved: false,
          firstActionCompleted: false,
          nextActionAt: "Awaiting approval",
          leadsEnrolled: 7,
        },
      ],
      subscription: {
        planKey: "pro",
        status: "active",
        seats: 5,
        usageLimit: 1000,
        monthlyUsage: 120,
      },
      actionItems: [],
      onboarding: {
        id: "onb-1",
        status: "completed",
        currentStep: "complete",
        transcript: [],
        extractedProfile: null,
        scraperBrief: null,
        outreachBrief: null,
      },
      sourcePlan: {
        id: "plan-1",
        summary: "Find founder-led SaaS accounts.",
        sources: ["website"],
        contactTargets: ["Founder"],
        searchTerms: ["founder led SaaS"],
        rationale: "Use public evidence before outreach.",
      },
      sourceRuns: [],
      activities: [],
      calls: [],
      meetings: [
        {
          id: "meeting-1",
          leadId: "lead-1",
          status: "scheduled",
          scheduledFor: now,
          owner: "Owner",
          notes: "Discovery call.",
          dealValueCents: 0,
          dealCurrency: "USD",
        },
      ],
    };
    const proposals: ActionProposalListResponse = {
      proposals: [],
      summary: {
        pending: 2,
        highRisk: 1,
        approved: 0,
        rejected: 0,
      },
    };
    const providers: ProviderSummary = {
      sources: [],
      outreach: [],
      voice: [],
      billing: [],
      webhooks: [],
      chat: [],
      summary: {
        configured: 1,
        guarded: 0,
        blocked: 1,
        disabled: 0,
        productionBlockers: ["TELEGRAM_WEBHOOK_SECRET is missing."],
      },
    };
    const telegram: TelegramIntegrationResponse = {
      integration: {
        id: "tg-1",
        status: "pending_verification",
        botUsername: "@winrate_ops_bot",
        chatIdMask: "-1***7010",
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
        lastUpdateId: null,
        lastVerifiedAt: null,
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
      recentCommands: [],
      detail: "Telegram command center binding is pending verification.",
    };

    const brief = commandCenterBriefResponseSchema.parse(
      buildCommandCenterBrief({
        dashboard,
        proposals,
        providers,
        telegram,
        generatedAt: now,
      }),
    );

    expect(brief).toMatchObject({
      surface: "command-center-brief",
      posture: "blocked",
      title: "Operator attention required",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
    });
    expect(brief.nextActions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        "review-approvals",
        "fix-provider-readiness",
        "run-source-evidence",
        "finish-telegram-binding",
      ]),
    );
    expect(brief.guardrails).toContain("Read-only operator brief; no workspace state changes are made.");

    const policyCatalog = commandCenterPolicyCatalogResponseSchema.parse(
      buildCommandCenterPolicyCatalog({
        dashboard,
        proposals,
        providers,
        telegram,
        actorRole: "member",
        emailVerified: false,
        generatedAt: now,
      }),
    );

    expect(policyCatalog).toMatchObject({
      surface: "command-center-policy",
      actor: {
        role: "member",
        emailVerified: false,
      },
      workspace: {
        name: "Growth OS",
      },
    });
    expect(
      policyCatalog.policies.find((policy) => policy.intent === "summarize_workspace"),
    ).toMatchObject({
      decision: "read_only",
      requiredRole: "member",
      channel: "in_app",
    });
    expect(policyCatalog.policies.find((policy) => policy.intent === "approve_action")).toMatchObject({
      decision: "blocked",
      requiredRole: "admin",
    });
    expect(
      policyCatalog.policies.find((policy) => policy.intent === "telegram_mutate_outreach"),
    ).toMatchObject({
      decision: "blocked",
      riskLevel: "critical",
      channel: "telegram",
    });
    expect(
      policyCatalog.policies
        .find((policy) => policy.intent === "run_source_evidence")
        ?.preconditions.find((precondition) => precondition.id === "verified-email"),
    ).toMatchObject({
      status: "blocked",
    });

    const safePreview = commandCenterCommandPreviewSchema.parse(
      buildCommandCenterCommandPreview({
        commandText: "Summarize workspace status",
        channel: "in_app",
        policyCatalog,
        generatedAt: now,
      }),
    );

    expect(safePreview).toMatchObject({
      surface: "command-center-command-preview",
      previewOnly: true,
      executionMode: "answer_only",
      requestedMutation: false,
      match: {
        intent: "summarize_workspace",
      },
    });
    expect(safePreview.guardrails).toContain("Command preview is deterministic and read-only.");

    const unsafePreview = commandCenterCommandPreviewSchema.parse(
      buildCommandCenterCommandPreview({
        commandText: "Scrape LinkedIn and auto-DM every lead",
        channel: "telegram",
        policyCatalog,
        generatedAt: now,
      }),
    );

    expect(unsafePreview).toMatchObject({
      executionMode: "blocked",
      requestedMutation: false,
      match: {
        intent: "unsupported_automation",
      },
      policy: {
        decision: "blocked",
        riskLevel: "critical",
      },
    });

    expect(
      buildCommandCenterActionProposalInput({
        preview: unsafePreview,
        dashboard,
        requestedBy: "Ops Owner",
      }),
    ).toBeNull();

    const adminCatalog = commandCenterPolicyCatalogResponseSchema.parse(
      buildCommandCenterPolicyCatalog({
        dashboard,
        proposals,
        providers: {
          ...providers,
          summary: {
            configured: 1,
            guarded: 0,
            blocked: 0,
            disabled: 0,
            productionBlockers: [],
          },
        },
        telegram,
        actorRole: "admin",
        emailVerified: true,
        generatedAt: now,
      }),
    );
    const sourcePreview = commandCenterCommandPreviewSchema.parse(
      buildCommandCenterCommandPreview({
        commandText: "Run source evidence for this workspace",
        channel: "in_app",
        policyCatalog: adminCatalog,
        generatedAt: now,
      }),
    );
    const proposalInput = buildCommandCenterActionProposalInput({
      preview: sourcePreview,
      dashboard,
      requestedBy: "Ops Admin",
    });

    expect(sourcePreview.executionMode).toBe("requires_approval");
    expect(proposalInput).toMatchObject({
      type: "lead_source_run",
      proposedBy: "operator",
      targetKind: "source_plan",
      targetId: "plan-1",
      requiredRole: "admin",
      requestedBy: "Ops Admin",
    });
    expect(proposalInput?.guardrails).toContain("Approval inbox review is required before any effect.");
  });
});
