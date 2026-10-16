import { afterEach, describe, expect, it, vi } from "vitest";

async function loadDashboardApi(responses: Response[]) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => {
    const response = responses.shift();
    if (!response) {
      throw new Error("Unexpected fetch call");
    }

    return response;
  });

  vi.stubGlobal("fetch", fetchMock);
  class TestServerApiUnauthorizedError extends Error {}
  class TestServerApiWorkspaceSelectionRequiredError extends Error {}

  vi.doMock("@/lib/server-api-auth", () => {
    return {
      ServerApiUnauthorizedError: TestServerApiUnauthorizedError,
      ServerApiWorkspaceSelectionRequiredError:
        TestServerApiWorkspaceSelectionRequiredError,
      isServerApiUnauthorizedError: (error: unknown) =>
        error instanceof TestServerApiUnauthorizedError,
      isServerApiWorkspaceSelectionRequiredError: (error: unknown) =>
        error instanceof TestServerApiWorkspaceSelectionRequiredError,
      createServerApiHeaders: vi.fn(
        async () => new Headers({ authorization: "Bearer token" }),
      ),
      getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
    };
  });

  const dashboardApi = await import("../app/api");

  return {
    ...dashboardApi,
    TestServerApiWorkspaceSelectionRequiredError,
    fetchMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("dashboard api helpers", () => {
  it("surfaces workspace selection requirements separately from generic dashboard failures", async () => {
    const { getDashboardData, TestServerApiWorkspaceSelectionRequiredError } =
      await loadDashboardApi([
        new Response(
          JSON.stringify({
            error: "Select a workspace before continuing.",
            code: "workspace_selection_required",
          }),
          {
            status: 409,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
      ]);

    await expect(getDashboardData()).rejects.toBeInstanceOf(
      TestServerApiWorkspaceSelectionRequiredError,
    );
  });

  it("loads workspace memberships for the dashboard switcher", async () => {
    const memberships = [
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        role: "owner",
        active: true,
      },
      {
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        workspaceId: "ws-2",
        workspaceName: "Outbound Lab",
        role: "owner",
        active: false,
      },
    ];
    const { getWorkspaceMemberships } = await loadDashboardApi([
      new Response(JSON.stringify({ memberships }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceMemberships()).resolves.toEqual(memberships);
  });

  it("fails closed when billing data requires an explicit workspace selection", async () => {
    const {
      getBillingPortalData,
      TestServerApiWorkspaceSelectionRequiredError,
    } = await loadDashboardApi([
      new Response(
        JSON.stringify({
          error: "Select a workspace before continuing.",
          code: "workspace_selection_required",
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ]);

    await expect(getBillingPortalData()).rejects.toBeInstanceOf(
      TestServerApiWorkspaceSelectionRequiredError,
    );
  });

  it("loads provider health for workspace settings", async () => {
    const providerSummary = {
      sources: [
        {
          provider: "website-crawler",
          kind: "lead-source",
          mode: "mock",
          channels: ["website"],
          detail: "Lead discovery adapter is ready for planned sources.",
        },
      ],
      outreach: [
        {
          provider: "resend-fallback",
          kind: "outreach",
          mode: "configured",
          channels: ["email"],
          detail:
            "Outbound delivery adapter is available for campaign dispatch.",
        },
      ],
      voice: [
        {
          provider: "twilio-voice",
          kind: "voice",
          mode: "mock",
          channels: ["call"],
          detail: "Voice dispatch adapter is ready for AI call workflows.",
        },
      ],
      billing: [],
      webhooks: [],
      chat: [],
      summary: {
        configured: 1,
        guarded: 2,
        blocked: 0,
        disabled: 0,
        productionBlockers: [],
      },
    };
    const { getProviderSummary } = await loadDashboardApi([
      new Response(JSON.stringify(providerSummary), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getProviderSummary()).resolves.toMatchObject({
      ...providerSummary,
      sources: [
        expect.objectContaining({
          provider: "website-crawler",
          readiness: "guarded",
        }),
      ],
      outreach: [
        expect.objectContaining({
          provider: "resend-fallback",
          readiness: "guarded",
        }),
      ],
      voice: [
        expect.objectContaining({
          provider: "twilio-voice",
          readiness: "guarded",
        }),
      ],
    });
  });

  it("loads provider activation readiness for settings", async () => {
    const activationReadiness = {
      surface: "provider-activation-readiness",
      version: "2026-06-05.provider-activation-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "guarded",
      summary: {
        ready: 2,
        needsConfiguration: 4,
        missing: 0,
        blocked: 0,
        providersReady: 1,
        providersGuarded: 2,
        providersBlocked: 0,
        providersDisabled: 0,
        missingSecretNames: [],
      },
      steps: [
        {
          id: "credential_vault",
          title: "Credential vault policy",
          status: "needs_configuration",
          tone: "warn",
          detail: "Configure a deployment-owned credential vault.",
          requiredConfig: ["PROVIDER_CREDENTIAL_VAULT_CONFIGURED"],
          evidence: ["credential vault not configured"],
          affectedProviders: ["resend-fallback"],
        },
      ],
      providers: [
        {
          provider: "resend-fallback",
          kind: "outreach",
          mode: "configured",
          readiness: "configured",
          credentialState: "configured",
          missingSecretCount: 0,
          activationState: "ready",
          detail: "resend-fallback is configured for guarded live use.",
        },
      ],
      guardrails: [
        "Provider activation readiness is read-only; it never accepts, stores, rotates, or displays raw provider secret values.",
      ],
      unavailableClaims: ["Automated provider credential rotation"],
    };
    const { getProviderActivationReadiness, fetchMock } =
      await loadDashboardApi([
        new Response(JSON.stringify(activationReadiness), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ]);

    await expect(getProviderActivationReadiness()).resolves.toMatchObject({
      surface: "provider-activation-readiness",
      posture: "guarded",
      providers: [
        expect.objectContaining({
          provider: "resend-fallback",
          activationState: "ready",
        }),
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/providers/activation-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads provider cost curves for settings", async () => {
    const costCurves = {
      surface: "provider-cost-curves",
      version: "2026-06-05.provider-cost-curves",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "guarded",
      summary: {
        totalCurves: 2,
        meteredCurves: 1,
        guardedCurves: 1,
        unpricedCurves: 0,
        notBillableCurves: 0,
        providerCostBudgetCents: 5000,
        providerCostUsageCents: 1200,
        providerCostRemainingCents: 3800,
        utilizationPct: 24,
      },
      curves: [
        {
          provider: "resend-fallback",
          kind: "outreach",
          channels: ["email"],
          unitLabel: "accepted email",
          estimatedUnitCostCents: 1,
          status: "metered",
          tone: "good",
          detail: "Configured Resend dispatch is metered.",
          meteringEvents: ["outreach_dispatches", "provider_cost_cents"],
          guardrails: ["Approval gate"],
        },
        {
          provider: "website-crawler",
          kind: "lead-source",
          channels: ["website"],
          unitLabel: "source run",
          estimatedUnitCostCents: 50,
          status: "metered",
          tone: "good",
          detail:
            "Configured website sourcing is metered after evidence is created.",
          meteringEvents: ["leads_created", "provider_cost_cents"],
          guardrails: ["Provider-cost budget check", "Evidence review"],
        },
      ],
      aiWorkerCostCurves: [
        {
          workerType: "sales-researcher",
          unitLabel: "approved source dry-run result",
          estimatedUnitCostCents: 1200,
          status: "metered",
          tone: "good",
          detail:
            "Sales researcher dry-run results are metered after approval.",
          meteringEvents: [
            "ai_worker_task_proposals",
            "ai_worker_execution_cents",
          ],
          guardrails: ["Approval proposal", "Plan AI dry-run budget"],
        },
      ],
      channelQuotas: [
        {
          channel: "email",
          status: "enforced",
          tone: "good",
          metric: "outreach_dispatches + provider_cost_cents",
          detail: "Email dispatch checks quota and budget.",
          evidence: ["campaign dispatch route"],
        },
      ],
      guardrails: [
        "Provider cost curves standardize estimated unit costs for existing configured provider-work paths.",
      ],
      unavailableClaims: [
        "SMS provider cost curves",
        "Live source-provider invoice reconciliation",
      ],
    };
    const { getProviderCostCurves, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(costCurves), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getProviderCostCurves()).resolves.toMatchObject({
      surface: "provider-cost-curves",
      summary: {
        providerCostRemainingCents: 3800,
      },
      curves: expect.arrayContaining([
        expect.objectContaining({
          provider: "resend-fallback",
          estimatedUnitCostCents: 1,
        }),
        expect.objectContaining({
          provider: "website-crawler",
          estimatedUnitCostCents: 50,
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/providers/cost-curves",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads source acquisition readiness for the dashboard", async () => {
    const sourceReadiness = {
      surface: "source-acquisition-readiness",
      version: "2026-06-05.source-acquisition-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "guarded",
      summary: {
        plannedSources: 3,
        runSources: 1,
        totalRuns: 1,
        readySources: 0,
        needsReviewSources: 1,
        missingSources: 2,
        blockedSources: 0,
        configuredSourceProviders: 0,
        guardedSourceProviders: 2,
        mockSourceProviders: 2,
        averageQualityScore: 86,
        acceptedLeads: 8,
        rejectedCandidates: 8,
        dedupedCandidates: 4,
        evidenceSignals: 1,
        complianceChecks: 2,
        productionBlockers: [
          "Lead-source adapters are still mock-backed and need production provider integrations before scale.",
        ],
      },
      lanes: [
        {
          source: "website",
          provider: "website-crawler",
          planned: true,
          status: "needs_review",
          tone: "warn",
          providerMode: "mock",
          providerReadiness: "guarded",
          runCount: 1,
          latestRunId: "run-1",
          qualityScore: 86,
          acceptanceRatePct: 50,
          candidatesFound: 20,
          acceptedLeads: 8,
          rejectedCandidates: 8,
          dedupedCandidates: 4,
          evidenceSignals: 1,
          rejectionGroups: 1,
          complianceChecks: 2,
          freshness: "Scanned just now",
          detail:
            "Evidence is reviewable, but the lane is still mock-backed and not production-scale.",
          nextAction: "Review qualified evidence before campaign enrollment.",
          blockers: [],
          evidence: [
            "1 evidence signal",
            "1 rejection group",
            "2 compliance checks",
          ],
        },
      ],
      controls: [
        {
          id: "production_expansion",
          title: "Production expansion gates",
          status: "blocked",
          tone: "blocked",
          detail: "Live source expansion still needs real provider adapters.",
          evidence: [
            "Lead-source adapters are still mock-backed and need production provider integrations before scale.",
          ],
        },
        {
          id: "provider_terms_policy",
          title: "Provider terms policy",
          status: "blocked",
          tone: "blocked",
          detail:
            "Document approved provider terms before activating external source providers.",
          evidence: ["terms policy not configured"],
        },
      ],
      guardrails: [
        "Source acquisition readiness is read-only and does not call external lead providers.",
      ],
      unavailableClaims: [
        "Universal autonomous scraping from every source or platform.",
      ],
    };
    const { getSourceAcquisitionReadiness, fetchMock } = await loadDashboardApi(
      [
        new Response(JSON.stringify(sourceReadiness), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ],
    );

    await expect(getSourceAcquisitionReadiness()).resolves.toMatchObject({
      surface: "source-acquisition-readiness",
      posture: "guarded",
      lanes: [
        expect.objectContaining({
          provider: "website-crawler",
          status: "needs_review",
        }),
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/leads/source-acquisition-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads team members for workspace settings", async () => {
    const members = [
      {
        userId: "user-1",
        email: "owner@example.com",
        displayName: "Owner Example",
        workspaceRole: "owner",
        organizationRole: "owner",
        activeWorkspace: true,
        currentUser: true,
      },
    ];
    const { getWorkspaceTeamMembers } = await loadDashboardApi([
      new Response(JSON.stringify({ members }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceTeamMembers()).resolves.toEqual(members);
  });

  it("loads the sales blueprint for dashboard and settings surfaces", async () => {
    const blueprintResponse = {
      detail: "Sales blueprint is available for this workspace.",
      blueprint: {
        id: "blueprint-1",
        status: "ready",
        businessProfile: {
          businessName: "SignalForge AI",
          website: "https://signalforge.example",
          industry: "B2B SaaS",
          offerSummary:
            "AI-assisted outbound operations for founder-led software teams.",
          targetAudience: "Founder-led B2B SaaS companies",
          regions: ["US", "India"],
          goals: ["Increase qualified pipeline"],
          channels: ["email", "linkedin"],
          constraints: ["Keep first-touch approval"],
          voice: "Direct and consultative.",
          summary: "A governed revenue workspace for outbound execution.",
        },
        icpSummary: "Founder-led B2B SaaS teams",
        buyerRoles: ["Founder", "Head of Sales"],
        painPoints: ["Manual prospecting"],
        disqualifiers: ["No public business signal"],
        qualificationRules: ["Match selected regions"],
        sourceChannels: ["website", "search"],
        outreachChannels: ["email", "linkedin"],
        searchKeywords: ["B2B SaaS hiring SDR"],
        monthlyLeadTarget: 250,
        meetingTarget: 20,
        averageContractValue: 8000,
        automationMode: "approval_gated",
        approvalRequiredFor: ["first outreach"],
        complianceNotes: "Respect unsubscribe and sender reputation rules.",
        readinessScore: 100,
        readinessGaps: [],
        lastUpdatedAt: "2026-06-02T00:00:00.000Z",
      },
    };
    const { getSalesBlueprint } = await loadDashboardApi([
      new Response(JSON.stringify(blueprintResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getSalesBlueprint()).resolves.toMatchObject({
      blueprint: {
        businessProfile: {
          businessName: "SignalForge AI",
        },
        readinessScore: 100,
      },
    });
  });

  it("loads pending action proposals for the dashboard approval inbox", async () => {
    const proposalResponse = {
      proposals: [
        {
          id: "appr-1",
          type: "telegram_pause",
          status: "pending",
          riskLevel: "medium",
          title: "Pause outreach from Telegram",
          detail: "A Telegram pause request needs owner or admin approval.",
          proposedBy: "telegram",
          targetKind: "workspace",
          targetId: null,
          targetLabel: "Workspace outreach",
          payloadSummary: "Pause running campaigns after approval.",
          payload: {
            command: "pause",
          },
          guardrails: ["No webhook mutation", "Owner approval required"],
          expectedEffect: "Running campaigns move to paused.",
          rollbackPlan: "Reject the proposal to keep outreach running.",
          requiredRole: "admin",
          requestedBy: "ops_admin",
          reviewedBy: null,
          reviewNote: null,
          auditEventId: null,
          createdAt: "2026-06-02T00:00:00.000Z",
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
    const { getActionProposals, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(proposalResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getActionProposals("pending")).resolves.toMatchObject({
      proposals: [
        {
          type: "telegram_pause",
          status: "pending",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/action-proposals?status=pending",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads the AI worker control plane for the dashboard", async () => {
    const now = "2026-06-03T00:00:00.000Z";
    const controlPlaneResponse = {
      workers: [
        {
          id: "worker-1",
          name: "Sales researcher",
          role: "Lead discovery",
          status: "active",
          riskLevel: "medium",
          ownerRole: "admin",
          description: "Prepares lead evidence.",
          permissions: ["Read source plan"],
          allowedTools: ["website-source"],
          blockedTools: ["email-send"],
          monthlyBudgetCents: 50000,
          budgetUsedCents: 1000,
          lastActionAt: now,
          guardrails: ["No outreach dispatch."],
          createdAt: now,
          updatedAt: now,
        },
      ],
      runs: [
        {
          id: "run-1",
          workerId: "worker-1",
          workerName: "Sales researcher",
          status: "proposed",
          title: "Research accounts",
          detail: "Prepare a reviewable source batch.",
          riskLevel: "medium",
          proposedAction: "Collect public evidence and wait for review.",
          expectedCostCents: 1500,
          actualCostCents: 0,
          approvalProposalId: "appr-1",
          resultSummary: null,
          blockedReason: null,
          createdAt: now,
          completedAt: null,
          updatedAt: now,
        },
      ],
      summary: {
        active: 1,
        paused: 0,
        disabled: 0,
        pendingApproval: 1,
        blocked: 0,
        budgetUsedCents: 1000,
        budgetLimitCents: 50000,
      },
    };
    const { getAiWorkerControlPlane, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(controlPlaneResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getAiWorkerControlPlane()).resolves.toMatchObject({
      workers: [
        {
          name: "Sales researcher",
          status: "active",
        },
      ],
      summary: {
        pendingApproval: 1,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/ai-workers",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads AI worker execution readiness for the dashboard", async () => {
    const readinessResponse = {
      surface: "ai-worker-execution-readiness",
      version: "2026-06-05.ai-worker-execution-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "needs_approval",
      tone: "warn",
      title: "AI worker execution needs approval",
      summary:
        "1 worker task must be reviewed before any dry-run rehearsal can start.",
      liveExecution: {
        enabled: false,
        status: "blocked",
        detail: "Live external tool execution is intentionally disabled.",
      },
      metrics: [
        {
          id: "active-workers",
          label: "Active workers",
          value: "1",
          detail: "1 active worker can receive governed work.",
          tone: "good",
        },
      ],
      checks: [
        {
          id: "approved-ledger",
          label: "Approved ledger",
          status: "missing",
          detail: "1 proposed run still needs approval.",
          tone: "warn",
          evidence: ["/v1/action-proposals", "/v1/ai-workers"],
        },
      ],
      dryRunCandidates: [],
      toolScopeViolations: [],
      guardrails: [
        "This readiness report is deterministic and read-only; it never executes worker tools.",
      ],
      unavailableClaims: ["Live external AI-worker tool execution"],
    };
    const { getAiWorkerExecutionReadiness, fetchMock } = await loadDashboardApi(
      [
        new Response(JSON.stringify(readinessResponse), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ],
    );

    await expect(getAiWorkerExecutionReadiness()).resolves.toMatchObject({
      posture: "needs_approval",
      liveExecution: {
        enabled: false,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/ai-workers/execution-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads AI worker margin readiness for the dashboard", async () => {
    const readinessResponse = {
      surface: "ai-worker-margin-readiness",
      version: "2026-06-05.ai-worker-margin-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "margin_watch",
      tone: "warn",
      title: "AI worker margin needs controls",
      summary: "The workspace can continue in advisory mode.",
      revenueModel: {
        model: "subscription_with_usage_controls",
        planKey: "pro",
        planName: "Professional",
        billableUnits: [
          "monthly lead capacity",
          "provider-cost budget",
          "approval-gated AI worker task proposals",
        ],
      },
      planBoundary: {
        subscriptionStatus: "active",
        usageLimit: 5000,
        monthlyUsage: 120,
        providerCostBudgetCents: 5000,
        aiTaskProposalLimit: 50,
        aiTaskProposalUsage: 3,
        aiTaskProposalRemaining: 47,
        aiExecutionBudgetCents: 15000,
        aiExecutionBudgetUsageCents: 1200,
        aiExecutionBudgetRemainingCents: 13800,
        includedChannels: ["email", "call"],
        seats: 10,
      },
      liveScale: {
        enabled: false,
        status: "blocked",
        detail: "Live AI-worker scale remains blocked until controls exist.",
      },
      metrics: [
        {
          id: "provider-cost",
          label: "Provider budget",
          value: "$12 / $50",
          detail: "24% of provider-cost budget is used.",
          tone: "good",
        },
      ],
      checks: [
        {
          id: "provider-cost-boundary",
          label: "Provider-cost boundary",
          status: "met",
          detail: "Provider-cost budget has headroom for configured execution.",
          tone: "good",
          evidence: ["pricing.providerCostBudgetCents"],
        },
      ],
      requiredCapabilities: [
        {
          id: "ai-task-metering",
          label: "AI task metering",
          status: "met",
          detail:
            "AI worker task proposals are enforced by a metered plan quota.",
          evidence: ["usage.ai_worker_task_proposals"],
        },
      ],
      recommendedPlan: null,
      guardrails: [
        "AI-worker margin readiness is read-only and does not mutate billing.",
      ],
      unavailableClaims: ["Usage-based AI-worker billing"],
    };
    const { getAiWorkerMarginReadiness, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(readinessResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getAiWorkerMarginReadiness()).resolves.toMatchObject({
      surface: "ai-worker-margin-readiness",
      posture: "margin_watch",
      liveScale: {
        enabled: false,
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/ai-workers/margin-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads the command center operator brief for the dashboard", async () => {
    const briefResponse = {
      surface: "command-center-brief",
      version: "2026-06-04.operator-brief",
      generatedAt: "2026-06-04T00:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "review_required",
      title: "Ready for human review",
      summary:
        "1 pending approval, 0 provider blockers, 7 qualified leads, 2 meetings booked.",
      metrics: [
        {
          id: "approvals",
          label: "Approvals",
          value: "1",
          detail: "0 high-risk approvals.",
          tone: "warn",
        },
        {
          id: "providers",
          label: "Providers",
          value: "3",
          detail: "0 production blockers.",
          tone: "good",
        },
      ],
      nextActions: [
        {
          id: "review-approvals",
          label: "Review approval queue",
          detail: "1 proposal is waiting for a human decision.",
          urgency: "warn",
          href: "/dashboard#approval-inbox",
          evidence: ["/v1/action-proposals"],
        },
      ],
      guardrails: [
        "Read-only operator brief; no workspace state changes are made.",
        "Risky actions stay approval-gated in the app.",
        "Provider, suppression, budget, and role limits still apply.",
      ],
      unavailableClaims: [
        "Telegram cannot mutate outreach, approve actions, or run autonomous operations without in-app owner approval.",
      ],
    };
    const { getCommandCenterBrief, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(briefResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getCommandCenterBrief()).resolves.toMatchObject({
      posture: "review_required",
      nextActions: [
        {
          id: "review-approvals",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/brief",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads conversion brief for the dashboard conversion workflow", async () => {
    const briefResponse = {
      surface: "conversion-brief",
      version: "2026-06-04.conversion-brief",
      generatedAt: "2026-06-04T00:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "pipeline_ready",
      title: "Pipeline ready for meeting handoff",
      summary:
        "2 meeting candidates ready, 0 open meetings active, 0 calls needing review.",
      metrics: [
        {
          id: "meeting-candidates",
          label: "Meeting candidates",
          value: "2",
          detail:
            "2 leads qualified, contacted, or meeting-booked without an open meeting.",
          tone: "warn",
        },
        {
          id: "open-meetings",
          label: "Open meetings",
          value: "0",
          detail: "0 meetings pending or scheduled.",
          tone: "good",
        },
        {
          id: "calls-needing-review",
          label: "Calls needing review",
          value: "0",
          detail: "0 calls blocked from live follow-through.",
          tone: "good",
        },
        {
          id: "closed-won",
          label: "Closed won",
          value: "0",
          detail: "0 won leads and 0 completed meetings; 0 canceled meetings.",
          tone: "neutral",
        },
      ],
      nextActions: [
        {
          id: "schedule-meetings",
          label: "Schedule manual meetings",
          detail:
            "2 leads ready for a conversion handoff with no open meeting recorded.",
          urgency: "warn",
          href: "/dashboard#calls-and-meetings",
          evidence: ["/v1/dashboard", "/v1/meetings"],
        },
      ],
      leadFocus: [
        {
          id: "lead-1",
          fullName: "Nina Carter",
          company: "VectrCloud",
          status: "qualified",
          score: 86,
          contact: "nina@example.com",
          reason: "Qualified lead has no open meeting recorded.",
          recommendedAction:
            "Schedule a manual meeting handoff after operator-reviewed follow-up.",
          href: "/dashboard#leads",
        },
      ],
      guardrails: [
        "Read-only conversion brief; no scheduling, outreach, or provider work is performed.",
      ],
      unavailableClaims: [
        "Autonomous calendar scheduling and guaranteed lead conversion are not available.",
      ],
    };
    const { getConversionBrief, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(briefResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getConversionBrief()).resolves.toMatchObject({
      posture: "pipeline_ready",
      nextActions: [
        {
          id: "schedule-meetings",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/conversion/brief",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads conversion work queue for the dashboard conversion workflow", async () => {
    const queueResponse = {
      surface: "conversion-work-queue",
      version: "2026-06-04.conversion-work-queue",
      generatedAt: "2026-06-04T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "ready",
      title: "Conversion work queue ready",
      summary:
        "2 conversion tasks prioritized from 0 call blockers, 1 open meeting, and 1 handoff candidate.",
      metrics: [
        {
          id: "call-blockers",
          label: "Call blockers",
          value: "0",
          detail: "0 calls require review before live follow-through.",
          tone: "good",
        },
        {
          id: "overdue-meetings",
          label: "Overdue outcomes",
          value: "0",
          detail: "0 meetings are past scheduled time without a final outcome.",
          tone: "good",
        },
        {
          id: "upcoming-meetings",
          label: "Due within 24h",
          value: "1",
          detail: "1 meeting should be prepared or confirmed within 24 hours.",
          tone: "warn",
        },
        {
          id: "handoff-candidates",
          label: "Ready handoffs",
          value: "1",
          detail: "1 lead can move toward meeting follow-through.",
          tone: "warn",
        },
        {
          id: "value-gaps",
          label: "Value gaps",
          value: "0",
          detail:
            "0 completed meetings need actual value for forecast accuracy.",
          tone: "good",
        },
      ],
      items: [
        {
          id: "meeting_prep-meeting-1",
          type: "meeting_prep",
          title: "Prepare upcoming meeting",
          detail:
            "Nina Carter is scheduled with Owner; prepare context before the call.",
          urgency: "medium",
          dueAt: "2026-06-04T18:00:00.000Z",
          dueLabel: "Due within 24h",
          owner: "Owner",
          suggestedAction:
            "Review lead context, last touchpoint, and qualification notes before the meeting.",
          href: "/dashboard#calls-and-meetings",
          lead: {
            id: "lead-1",
            fullName: "Nina Carter",
            company: "VectrCloud",
            status: "meeting_booked",
            score: 86,
            contact: "nina@example.com",
          },
          relatedRecord: {
            kind: "meeting",
            id: "meeting-1",
          },
          evidence: ["/v1/dashboard", "/v1/meetings/:id"],
        },
      ],
      guardrails: [
        "Read-only conversion work queue; no meeting, call, outreach, or provider state changes are performed.",
      ],
      unavailableClaims: [
        "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
      ],
    };
    const { getConversionWorkQueue, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(queueResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getConversionWorkQueue()).resolves.toMatchObject({
      posture: "ready",
      items: [
        {
          id: "meeting_prep-meeting-1",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/conversion/work-queue",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads conversion integration readiness for the dashboard revenue workflow", async () => {
    const readinessResponse = {
      surface: "conversion-integration-readiness",
      version: "2026-06-05.conversion-integration-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "guarded",
      summary: {
        crmRecords: 4,
        missingContactRecords: 1,
        readyCalendarMeetings: 2,
        completedMeetings: 1,
        valuedMeetings: 1,
        missingValueRecords: 0,
        wonLeadsWithoutMeetings: 0,
        actualValueCents: 1200000,
        configuredControls: 1,
        blockedControls: 1,
      },
      controls: [
        {
          id: "crm_sync",
          title: "CRM sync readiness",
          status: "blocked",
          tone: "blocked",
          detail:
            "Use the manual CRM export until CRM sync, field mapping, and contact quality are ready.",
          nextAction:
            "Resolve CRM mapping and missing-contact blockers before enabling live sync.",
          evidence: ["4 CRM handoff records", "1 missing-contact record"],
          blockers: [
            "CRM handoff still contains records missing email and phone data.",
          ],
        },
        {
          id: "calendar_sync",
          title: "Calendar sync readiness",
          status: "needs_review",
          tone: "warn",
          detail:
            "Keep using manual calendar handoff until writable sync and availability controls are configured.",
          nextAction:
            "Configure calendar sync, availability policy, and reminder ownership before live sync.",
          evidence: ["2 pending or scheduled meetings"],
          blockers: [
            "Writable calendar sync is not configured for this deployment.",
          ],
        },
        {
          id: "accounting_sync",
          title: "Accounting sync readiness",
          status: "needs_review",
          tone: "warn",
          detail:
            "Keep revenue reconciliation manual until value capture and accounting policy are complete.",
          nextAction:
            "Resolve missing values, won-lead records, accounting sync, and revenue policy blockers.",
          evidence: ["1 completed meeting"],
          blockers: [
            "External accounting sync is not configured for this deployment.",
          ],
        },
        {
          id: "invoice_payment_matching",
          title: "Invoice and payment matching",
          status: "needs_review",
          tone: "warn",
          detail:
            "Invoice and payment matching remain manual until closed value and reconciliation controls exist.",
          nextAction:
            "Configure invoice matching and payment reconciliation before claiming revenue automation.",
          evidence: ["$12,000 recorded closed value"],
          blockers: [
            "Invoice matching workflow is not configured for this deployment.",
          ],
        },
      ],
      guardrails: [
        "Conversion integration readiness is read-only and does not mutate CRM, calendar, accounting, invoice, payment, billing, or provider records.",
      ],
      unavailableClaims: [
        "Live accounting sync, invoice matching, payment settlement, tax advice, or revenue-recognition automation without deployment-specific integrations.",
      ],
    };
    const { getConversionIntegrationReadiness, fetchMock } =
      await loadDashboardApi([
        new Response(JSON.stringify(readinessResponse), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ]);

    await expect(getConversionIntegrationReadiness()).resolves.toMatchObject({
      posture: "guarded",
      controls: expect.arrayContaining([
        expect.objectContaining({
          id: "crm_sync",
          status: "blocked",
        }),
      ]),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/conversion/integration-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads outreach sequence plan for the dashboard outreach workflow", async () => {
    const sequencePlanResponse = {
      surface: "outreach-sequence-plan",
      version: "2026-06-04.outreach-sequence-plan",
      generatedAt: "2026-06-04T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "review_ready",
      title: "Outreach sequence ready for review",
      summary:
        "2 reviewable steps are drafted for 1 lead without creating provider work.",
      metrics: [
        {
          id: "candidates",
          label: "Candidate leads",
          value: "1",
          detail: "1 candidate has at least one direct contact route.",
          tone: "good",
        },
      ],
      channels: [
        {
          channel: "email",
          label: "Email",
          status: "included",
          tone: "good",
          detail: "Email is included in pro.",
          recommendedPlan: null,
        },
      ],
      candidates: [
        {
          id: "lead-1",
          fullName: "Nina Carter",
          company: "VectrCloud",
          status: "qualified",
          score: 88,
          source: "website",
          lastTouchpoint: "Evidence reviewed.",
          contactability: ["email", "call"],
          personalizationSignals: ["VectrCloud from website"],
        },
      ],
      steps: [
        {
          id: "step-1-email",
          dayOffset: 0,
          channel: "email",
          title: "First-touch value hypothesis",
          objective:
            "Open a relevant business problem with evidence from the lead record.",
          leadSegment: "qualified leads like Nina Carter",
          sampleSubject: "Relevant outbound operating gap",
          sampleBody: "Hi Nina Carter, I noticed reviewed evidence.",
          personalizationSignals: ["VectrCloud from website"],
          approvalRequired: true,
          riskLevel: "medium",
          providerWork: false,
          gatedBy: ["owner/admin approval"],
        },
      ],
      nextActions: [
        {
          id: "create-campaign",
          label: "Create draft campaign",
          href: "/dashboard#outreach-operations",
          detail: "Turn the reviewed sequence into a draft campaign.",
          tone: "good",
        },
      ],
      guardrails: [
        "Outreach sequence planning is read-only; no campaign, activity, provider send, call, SMS, social action, or CRM record is created.",
      ],
      unavailableClaims: [
        "No automatic email send, phone call, LinkedIn action, SMS send, scraping, enrichment purchase, or provider mutation is performed.",
      ],
    };
    const { getOutreachSequencePlan, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(sequencePlanResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getOutreachSequencePlan()).resolves.toMatchObject({
      posture: "review_ready",
      steps: [
        {
          id: "step-1-email",
          providerWork: false,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/outreach/sequence-plan",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads outbound channel readiness for the dashboard outreach workflow", async () => {
    const readinessResponse = {
      surface: "outbound-channel-readiness",
      version: "2026-06-05.outbound-channel-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "guarded",
      summary: {
        totalChannels: 4,
        readyChannels: ["email", "call"],
        reviewOnlyChannels: [],
        blockedChannels: ["linkedin"],
        roadmapChannels: ["sms"],
        liveDispatchChannels: ["email", "call"],
      },
      metrics: [
        {
          id: "live-dispatch",
          label: "Live dispatch",
          value: "2",
          detail: "2 channels pass plan, quota, provider, and cost checks.",
          tone: "good",
        },
      ],
      channels: [
        {
          channel: "email",
          label: "Email",
          status: "ready",
          tone: "good",
          liveDispatchImplemented: true,
          entitlementAllowed: true,
          providerConfigured: true,
          costCurveConfigured: true,
          quotaMetric: "outreach_dispatches",
          quotaRemaining: 990,
          detail:
            "Email can use the existing guarded dispatch path after approval and suppression checks.",
          controls: [
            {
              id: "plan_channel",
              label: "Plan channel",
              status: "met",
              detail: "Email channel is available for pro.",
              evidence: ["included_channels"],
            },
          ],
          blockers: [],
          recommendedPlan: null,
        },
        {
          channel: "sms",
          label: "SMS",
          status: "roadmap",
          tone: "blocked",
          liveDispatchImplemented: false,
          entitlementAllowed: false,
          providerConfigured: false,
          costCurveConfigured: false,
          quotaMetric: null,
          quotaRemaining: null,
          detail:
            "SMS remains roadmap even when readiness flags are present because live SMS dispatch and quota enforcement are not implemented.",
          controls: [
            {
              id: "live_sms_dispatch",
              label: "Live SMS dispatch endpoint",
              status: "missing",
              detail: "No live SMS dispatch endpoint is implemented.",
              evidence: ["outreach sequence guardrails"],
            },
          ],
          blockers: ["Live SMS dispatch endpoint"],
          recommendedPlan: null,
        },
      ],
      guardrails: [
        "Outbound channel readiness is read-only and does not create campaigns, activities, calls, SMS, social actions, or provider work.",
      ],
      unavailableClaims: [
        "Live SMS dispatch, SMS quota enforcement, and SMS provider cost curves are not implemented.",
      ],
    };
    const { getOutboundChannelReadiness, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(readinessResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getOutboundChannelReadiness()).resolves.toMatchObject({
      posture: "guarded",
      summary: {
        liveDispatchChannels: ["email", "call"],
        roadmapChannels: ["sms"],
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/outreach/channel-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads revenue forecast for the dashboard revenue panel", async () => {
    const forecastResponse = {
      surface: "revenue-forecast",
      version: "2026-06-04.revenue-forecast",
      generatedAt: "2026-06-04T00:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "target_gap",
      title: "Pipeline target gap visible",
      summary:
        "$21,500 weighted pipeline against $33,000 target coverage model.",
      assumptions: {
        blueprintId: "blueprint-1",
        averageContractValue: 10000,
        monthlyLeadTarget: 10,
        meetingTarget: 6,
        weightedPipelineValue: 21500,
        actualClosedValue: 0,
        targetPipelineValue: 33000,
        targetCoveragePercent: 65,
        model:
          "Deterministic stage-weight model: new 5%, qualified 20%, contacted 35%, meeting booked 55%, won 100%, lost 0%.",
      },
      metrics: [
        {
          id: "weighted-pipeline",
          label: "Weighted pipeline",
          value: "$21,500",
          detail: "65% of target-weighted meeting pipeline.",
          tone: "warn",
        },
        {
          id: "actual-closed",
          label: "Actual closed",
          value: "$0",
          detail: "0 completed meetings with recorded contract value.",
          tone: "neutral",
        },
        {
          id: "pipeline-gap",
          label: "Pipeline gap",
          value: "$11,500",
          detail:
            "$33,000 target based on meeting target and stage confidence.",
          tone: "warn",
        },
        {
          id: "lead-coverage",
          label: "Lead target coverage",
          value: "40%",
          detail: "4 qualified pipeline leads against 10 target leads.",
          tone: "warn",
        },
        {
          id: "meeting-coverage",
          label: "Meeting target coverage",
          value: "33%",
          detail: "2 meeting signals against 6 target meetings.",
          tone: "warn",
        },
      ],
      stages: [
        {
          id: "qualified",
          label: "Qualified",
          leadCount: 1,
          weight: 0.2,
          estimatedValue: 2000,
          detail: "1 lead at 20% deterministic stage confidence.",
          tone: "neutral",
        },
        {
          id: "meeting_booked",
          label: "Meeting booked",
          leadCount: 1,
          weight: 0.55,
          estimatedValue: 5500,
          detail: "1 lead at 55% deterministic stage confidence.",
          tone: "warn",
        },
      ],
      nextActions: [
        {
          id: "move-leads-to-meetings",
          label: "Move leads toward meetings",
          detail:
            "2 meeting signals is below 50% of the monthly meeting target.",
          urgency: "warn",
          href: "/dashboard#calls-and-meetings",
          evidence: ["/v1/dashboard", "/v1/meetings"],
        },
      ],
      guardrails: [
        "Forecast is deterministic planning guidance, not guaranteed revenue.",
        "Average contract value, lead target, and meeting target come from the Sales Blueprint.",
      ],
      unavailableClaims: [
        "Guaranteed revenue, guaranteed meetings, and autonomous close-rate optimization are not available.",
      ],
    };
    const { getRevenueForecast, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(forecastResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getRevenueForecast()).resolves.toMatchObject({
      posture: "target_gap",
      assumptions: {
        targetCoveragePercent: 65,
      },
      nextActions: [
        {
          id: "move-leads-to-meetings",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/revenue/forecast",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads plan growth readiness for the dashboard action center", async () => {
    const readinessResponse = {
      surface: "plan-growth-readiness",
      version: "2026-06-04.plan-growth-readiness",
      generatedAt: "2026-06-04T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "starter",
      },
      posture: "upgrade_recommended",
      title: "Upgrade before the next scale push",
      summary: "Move to Professional before scaling usage.",
      metrics: [
        {
          id: "lead-usage",
          label: "Lead usage",
          value: "920 / 1,000",
          detail: "92% of monthly lead capacity used.",
          tone: "warn",
        },
        {
          id: "provider-budget",
          label: "Provider budget",
          value: "$14 / $15",
          detail: "93% of monthly provider budget used.",
          tone: "warn",
        },
        {
          id: "channels",
          label: "Included channels",
          value: "Email",
          detail: "Missing Call for current workspace intent.",
          tone: "warn",
        },
      ],
      signals: [
        {
          id: "lead-capacity",
          title: "Lead usage capacity",
          detail: "Lead usage is approaching the current plan limit.",
          tone: "warn",
          current: 920,
          limit: 1000,
          utilizationPct: 92,
          actionLabel: "Review billing",
          href: "/billing",
        },
      ],
      recommendedPlan: {
        planKey: "pro",
        planName: "Professional",
        description: "For teams managing active campaigns and review flows",
        price: {
          usd: 45,
          inr: 3399,
        },
        usageLimit: 5000,
        outreachDispatchLimit: 1000,
        voiceCallLimit: 250,
        providerCostBudgetCents: 5000,
        aiWorkerTaskProposalLimit: 50,
        aiWorkerExecutionBudgetCents: 15000,
        includedChannels: ["email", "call"],
        checkoutPath: "/get-started?plan=pro",
      },
      nextActions: [
        {
          id: "review-upgrade",
          label: "Review Professional",
          href: "/get-started?plan=pro",
          detail:
            "Compare the recommended plan against expected source volume.",
          tone: "warn",
        },
      ],
      guardrails: [
        "Plan growth readiness is read-only; no subscription, payment provider, provider configuration, or usage record is mutated.",
      ],
      unavailableClaims: [
        "No automatic billing upgrade, checkout completion, or payment provider mutation is performed.",
      ],
    };
    const { getPlanGrowthReadiness, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(readinessResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getPlanGrowthReadiness()).resolves.toMatchObject({
      posture: "upgrade_recommended",
      recommendedPlan: {
        planKey: "pro",
      },
      nextActions: [
        {
          id: "review-upgrade",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/growth/plan-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads managed service readiness for the dashboard action center", async () => {
    const readinessResponse = {
      surface: "managed-service-readiness",
      version: "2026-06-06.managed-service-readiness",
      generatedAt: "2026-06-06T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "needs_operator_review",
      title: "Managed rollout needs operator review",
      summary:
        "Operator Assist is the likely fit, but 2 operator controls need review before sales or delivery treats the workspace as ready.",
      recommendedPackage: {
        key: "operator-assist",
        tier: "Operator Assist",
        bestFor:
          "Agencies or SMB teams that need review cadence while the product matures",
        includes:
          "Weekly workflow review, lead evidence checks, campaign approval support, and reporting rhythm",
        outcome:
          "Keep lead evidence, approvals, and reporting cadence moving with review support",
        defaultBudgetRange: "1500_5000",
        recommendedGoals: [
          "Launch approval-gated outreach",
          "Add managed rollout support",
        ],
        operatingBoundary:
          "Operator support can review and propose work, but customer-owned approvals and provider readiness still control execution.",
      },
      metrics: [
        {
          id: "recommended-package",
          label: "Recommended package",
          value: "Operator Assist",
          detail:
            "Agencies or SMB teams that need review cadence while the product matures",
          tone: "good",
        },
        {
          id: "delivery-owner",
          label: "Delivery owner",
          value: "ops@example.com",
          detail: "Managed-service delivery ownership is configured.",
          tone: "good",
        },
      ],
      controls: [
        {
          id: "commercial-scope",
          title: "Commercial scope",
          detail:
            "Scope policy, SOW template, pricing policy, delivery owner, and customer handoff are configured.",
          tone: "good",
          actionLabel: "Review managed services",
          href: "/managed-services",
          evidence: ["MANAGED_SERVICE_SCOPE_POLICY_CONFIGURED"],
        },
        {
          id: "approval-workload",
          title: "Approval workload",
          detail: "2 pending proposals need review cadence.",
          tone: "warn",
          actionLabel: "Open approvals",
          href: "/dashboard#approval-inbox",
          evidence: ["/v1/action-proposals"],
        },
      ],
      nextActions: [
        {
          id: "scope-managed-package",
          label: "Scope Operator Assist",
          href: "/contact?intent=managed_services&managedPackage=operator-assist",
          detail:
            "Send the current package fit into managed-services intake without changing billing.",
          tone: "good",
        },
      ],
      guardrails: [
        "Managed-service readiness is read-only; it does not create a service contract, checkout, billing change, provider work, or Telegram-controlled mutation.",
      ],
      unavailableClaims: [
        "No managed-service contract, SOW, checkout, invoice, or payment-provider mutation is created by this surface.",
      ],
    };
    const { getManagedServiceReadiness, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(readinessResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getManagedServiceReadiness()).resolves.toMatchObject({
      posture: "needs_operator_review",
      recommendedPackage: {
        key: "operator-assist",
      },
      controls: [
        {
          id: "commercial-scope",
        },
        {
          id: "approval-workload",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/growth/managed-service-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads sanitized recent audit evidence for the dashboard", async () => {
    const auditResponse = {
      surface: "audit-log",
      version: "2026-06-04.audit-log",
      generatedAt: "2026-06-04T12:00:00.000Z",
      summary: {
        totalReturned: 1,
        sensitiveCount: 0,
        reviewCount: 0,
        requestCount: 1,
        latestEventAt: "2026-06-04T12:00:00.000Z",
      },
      events: [
        {
          id: "audit-1",
          eventType: "api.get./v1/dashboard",
          actorType: "user",
          actorId: "user-1",
          createdAt: "2026-06-04T12:00:00.000Z",
          summary: "GET /v1/dashboard returned 200 in the server audit trail.",
          severity: "info",
          scope: {
            organizationId: "org-1",
            workspaceId: null,
          },
          target: {
            kind: null,
            id: null,
          },
          evidence: ["request req-1", "status 200"],
          payloadKeys: ["method", "path", "requestId", "status"],
        },
      ],
      guardrails: [
        "Recent audit log is read-only and does not expose raw request, webhook, or provider payload bodies.",
      ],
      unavailableClaims: [
        "Hosted SIEM streaming, destructive retention deletion jobs, immutable object-lock archives, and legal discovery workflows are not available unless separately configured.",
      ],
    };
    const { getAuditLog, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(auditResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getAuditLog(12)).resolves.toMatchObject({
      surface: "audit-log",
      summary: {
        totalReturned: 1,
      },
      events: [
        {
          eventType: "api.get./v1/dashboard",
          severity: "info",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/audit/recent?limit=12",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads audit compliance readiness for settings", async () => {
    const readinessResponse = {
      surface: "audit-compliance-readiness",
      version: "2026-06-05.audit-compliance-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      posture: "guarded",
      summary: {
        ready: 1,
        needsConfiguration: 3,
        missing: 1,
        latestEventAt: "2026-06-05T12:00:00.000Z",
        manualExportMode: "sanitized_hash_chain",
      },
      steps: [
        {
          id: "manual_export",
          title: "Manual hash-chain export",
          status: "ready",
          tone: "good",
          detail: "Operators can download a sanitized JSON audit package.",
          requiredConfig: ["/v1/audit/export"],
          evidence: ["sanitized event summaries"],
        },
        {
          id: "retention_policy",
          title: "Retention policy",
          status: "missing",
          tone: "blocked",
          detail: "Declare an audit retention window.",
          requiredConfig: ["AUDIT_RETENTION_DAYS"],
          evidence: ["retention days not configured"],
        },
      ],
      guardrails: [
        "Readiness exposes configuration presence and sanitized evidence only.",
      ],
      unavailableClaims: [
        "Destructive retention deletion jobs require deployment-specific integrations.",
      ],
    };
    const { getAuditComplianceReadiness, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(readinessResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getAuditComplianceReadiness()).resolves.toMatchObject({
      surface: "audit-compliance-readiness",
      summary: {
        manualExportMode: "sanitized_hash_chain",
      },
      steps: [
        {
          id: "manual_export",
          status: "ready",
        },
        {
          id: "retention_policy",
          status: "missing",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/audit/compliance-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads command center policy explanations for the dashboard", async () => {
    const policyResponse = {
      surface: "command-center-policy",
      version: "2026-06-04.command-policy",
      generatedAt: "2026-06-04T00:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      actor: {
        role: "admin",
        emailVerified: true,
      },
      policies: [
        {
          intent: "summarize_workspace",
          label: "Summarize workspace",
          decision: "read_only",
          riskLevel: "low",
          requiredRole: "member",
          channel: "in_app",
          summary: "Status answers are read-only.",
          preconditions: [
            {
              id: "role",
              label: "Role",
              status: "met",
              detail: "admin can request member-level command handling.",
            },
          ],
          guardrails: ["No records are mutated."],
          evidence: ["/v1/dashboard"],
          nextAction: {
            label: "Open dashboard",
            href: "/dashboard",
          },
        },
        {
          intent: "telegram_mutate_outreach",
          label: "Telegram mutate outreach",
          decision: "blocked",
          riskLevel: "critical",
          requiredRole: "admin",
          channel: "telegram",
          summary: "Telegram cannot directly mutate outreach.",
          preconditions: [
            {
              id: "direct-mutation",
              label: "Direct mutation",
              status: "blocked",
              detail: "Telegram cannot directly mutate campaign state.",
            },
          ],
          guardrails: ["Critical sales actions require in-app approval."],
          evidence: ["/v1/integrations/telegram"],
          nextAction: {
            label: "Open approval inbox",
            href: "/dashboard#approval-inbox",
          },
        },
      ],
      unavailableClaims: [
        "Telegram cannot mutate outreach, approve actions, or run autonomous operations without in-app owner approval.",
      ],
    };
    const { getCommandCenterPolicies, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(policyResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getCommandCenterPolicies()).resolves.toMatchObject({
      actor: {
        role: "admin",
      },
      policies: [
        {
          intent: "summarize_workspace",
          decision: "read_only",
        },
        {
          intent: "telegram_mutate_outreach",
          decision: "blocked",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/policies",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads Telegram command readiness for settings", async () => {
    const readinessResponse = {
      surface: "telegram-command-readiness",
      version: "2026-06-05.telegram-command-readiness",
      generatedAt: "2026-06-05T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "guarded",
      summary: {
        integrationStatus: "pending_verification",
        enabledCommandCount: 9,
        readOnlyCommandCount: 8,
        approvalGatedCommandCount: 1,
        blockedMutationCount: 4,
        recentCommandCount: 0,
        pendingTelegramPauseProposals: 0,
        rateLimit: {
          limit: 12,
          windowSeconds: 60,
          durableStore: false,
        },
      },
      controls: [
        {
          id: "bot_token",
          label: "Bot token",
          status: "met",
          tone: "good",
          detail: "TELEGRAM_BOT_TOKEN is configured server-side.",
          evidence: ["TELEGRAM_BOT_TOKEN"],
        },
        {
          id: "rate_limit",
          label: "Per-chat command throttle",
          status: "watch",
          tone: "warn",
          detail: "Demo memory fallback is active.",
          evidence: ["telegram.rate_limit.claim"],
        },
      ],
      commands: [
        {
          command: "status",
          label: "Workspace status",
          mode: "read_only",
          status: "enabled",
          detail: "/status returns read-only workspace context.",
          guardrails: ["Read-only reply"],
        },
        {
          command: "pause",
          label: "Pause proposal",
          mode: "approval_gated",
          status: "enabled",
          detail: "/pause creates an Approval Inbox proposal.",
          guardrails: ["Creates action proposal only"],
        },
      ],
      blockedMutations: [
        "Approve or reject actions from Telegram",
        "Dispatch campaigns, calls, SMS, or social actions from Telegram",
      ],
      guardrails: [
        "Telegram command readiness is read-only and does not bind chats, approve proposals, dispatch outreach, change billing, configure providers, or run AI-worker tools.",
      ],
      unavailableClaims: [
        "Telegram cannot approve, reject, dispatch, bill, configure providers, or mutate outreach directly.",
      ],
    };
    const { getTelegramCommandReadiness, fetchMock } =
      await loadDashboardApi([
        new Response(JSON.stringify(readinessResponse), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ]);

    await expect(getTelegramCommandReadiness()).resolves.toMatchObject({
      surface: "telegram-command-readiness",
      posture: "guarded",
      commands: [
        {
          command: "status",
          status: "enabled",
        },
        {
          command: "pause",
          mode: "approval_gated",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/telegram-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads Telegram notification readiness for settings", async () => {
    const readinessResponse = {
      surface: "telegram-notification-readiness",
      version: "2026-06-06.telegram-notification-readiness",
      generatedAt: "2026-06-06T12:00:00.000Z",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      posture: "guarded",
      summary: {
        integrationStatus: "active",
        enabledNotificationCount: 2,
        notificationTypeCount: 5,
        pendingApprovalCount: 3,
        actionItemCount: 1,
        maxNotificationsPerHour: 12,
        escalationOwnerConfigured: true,
        deliveryAuditConfigured: true,
        targetChatConfigured: true,
        targetChatMatchesWorkspace: true,
      },
      controls: [
        {
          id: "notification_switch",
          label: "Notification switch",
          status: "met",
          tone: "good",
          detail:
            "Telegram notifications are enabled for readiness evaluation.",
          evidence: ["TELEGRAM_NOTIFICATIONS_ENABLED"],
        },
        {
          id: "quiet_hours",
          label: "Quiet hours",
          status: "watch",
          tone: "warn",
          detail: "Quiet-hours handling is missing.",
          evidence: ["TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED"],
        },
      ],
      notificationTypes: [
        {
          id: "operator_brief",
          label: "Operator brief digest",
          status: "enabled",
          detail: "Scheduled summaries can notify the bound chat.",
          guardrails: ["Summary-only notification"],
        },
        {
          id: "provider_alert",
          label: "Provider readiness alert",
          status: "disabled",
          detail:
            "Provider readiness alert is not configured for Telegram delivery yet.",
          guardrails: ["No approval or provider mutation"],
        },
      ],
      guardrails: [
        "Telegram notification readiness is read-only and does not send Telegram messages, approve work, dispatch outreach, change billing, configure providers, or run AI-worker tools.",
      ],
      unavailableClaims: [
        "No Telegram notification is sent by this readiness surface.",
      ],
    };
    const { getTelegramNotificationReadiness, fetchMock } =
      await loadDashboardApi([
        new Response(JSON.stringify(readinessResponse), {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      ]);

    await expect(getTelegramNotificationReadiness()).resolves.toMatchObject({
      surface: "telegram-notification-readiness",
      posture: "guarded",
      summary: {
        enabledNotificationCount: 2,
        targetChatMatchesWorkspace: true,
      },
      notificationTypes: [
        {
          id: "operator_brief",
          status: "enabled",
        },
        {
          id: "provider_alert",
          status: "disabled",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/command-center/telegram-notification-readiness",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("loads pending workspace invitations for settings", async () => {
    const invitations = [
      {
        id: "invite-1",
        email: "teammate@example.com",
        role: "member",
        status: "pending",
        workspaceId: "ws-1",
        workspaceName: "Default Workspace",
        organizationId: "org-1",
        organizationName: "Northstar Labs",
        invitedByName: "Owner Example",
        expiresAt: new Date("2026-05-11T00:00:00.000Z").toISOString(),
        acceptedAt: null,
      },
    ];
    const { getWorkspaceInvitations } = await loadDashboardApi([
      new Response(JSON.stringify({ invitations }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getWorkspaceInvitations()).resolves.toEqual(invitations);
  });

  it("loads content opportunities for the dashboard demand engine", async () => {
    const contentPlan = {
      generatedAt: "2026-06-04T00:00:00.000Z",
      blueprintId: "blueprint-1",
      workspaceBusinessName: "SignalForge AI",
      summary: "Generated 1 reviewable content opportunity.",
      publishingBlocked: false,
      blockers: [],
      guardrails: [
        "Operator review is required before publishing.",
        "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
      ],
      opportunities: [
        {
          id: "content-1",
          title: "AI sales workflow for founder-led SaaS",
          slug: "ai-sales-workflow-for-founder-led-saas",
          intent: "seo_landing_page",
          funnelStage: "consideration",
          audience: "Founder-led B2B SaaS",
          priority: 94,
          targetKeywords: ["AI sales software"],
          sourceSignals: ["website source evidence"],
          suggestedChannels: ["email"],
          leadCaptureOffer: "Sales Blueprint teardown request",
          guardrails: [
            "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
          ],
          nextAction:
            "Draft a claim-safe landing page brief from the Sales Blueprint.",
          status: "ready_for_brief",
        },
      ],
    };
    const { getContentOpportunityPlan, fetchMock } = await loadDashboardApi([
      new Response(JSON.stringify(contentPlan), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    await expect(getContentOpportunityPlan(1)).resolves.toMatchObject({
      workspaceBusinessName: "SignalForge AI",
      opportunities: [
        {
          intent: "seo_landing_page",
          status: "ready_for_brief",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/content/opportunities?limit=1",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });
});
