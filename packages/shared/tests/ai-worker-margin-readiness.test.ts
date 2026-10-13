import { describe, expect, it } from "vitest";
import type {
  AiWorkerControlPlaneResponse,
  DashboardResponse,
  PlanGrowthReadinessResponse,
} from "../src";
import { buildAiWorkerMarginReadiness } from "../src/ai-worker-margin-readiness";

const now = "2026-06-05T12:00:00.000Z";

const dashboard = {
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
  leads: [],
  campaigns: [],
  subscription: {
    planKey: "pro",
    status: "active",
    seats: 5,
    usageLimit: 5000,
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
  sourcePlan: null,
  sourceRuns: [],
  activities: [],
  calls: [],
  meetings: [],
} satisfies DashboardResponse;

const controlPlane = {
  workers: [
    {
      id: "worker_researcher",
      name: "Sales researcher",
      role: "Lead discovery",
      status: "active",
      riskLevel: "medium",
      ownerRole: "admin",
      description: "Prepares lead evidence before outreach.",
      permissions: ["Read source plan", "Create approval proposals"],
      allowedTools: ["website-source", "directory-source"],
      blockedTools: ["email-send", "crm-write"],
      monthlyBudgetCents: 50000,
      budgetUsedCents: 12000,
      lastActionAt: now,
      guardrails: ["Return to operator review when evidence is incomplete."],
      createdAt: now,
      updatedAt: now,
    },
  ],
  runs: [],
  summary: {
    active: 1,
    paused: 0,
    disabled: 0,
    pendingApproval: 0,
    blocked: 0,
    budgetUsedCents: 12000,
    budgetLimitCents: 50000,
  },
} satisfies AiWorkerControlPlaneResponse;

const healthyPlanReadiness = {
  surface: "plan-growth-readiness",
  version: "2026-06-04.plan-growth-readiness",
  generatedAt: now,
  workspace: {
    name: "Growth OS",
    planKey: "pro",
  },
  posture: "healthy",
  title: "Plan fit is healthy",
  summary: "Usage, provider budget, channel access, and blueprint readiness are aligned.",
  metrics: [],
  signals: [],
  recommendedPlan: null,
  nextActions: [],
  guardrails: [],
  unavailableClaims: [],
} satisfies PlanGrowthReadinessResponse;

describe("AI worker margin readiness", () => {
  it("blocks live AI-worker scale when an active workspace has no provider-cost budget", () => {
    const readiness = buildAiWorkerMarginReadiness({
      dashboard: {
        ...dashboard,
        subscription: {
          ...dashboard.subscription,
          planKey: "free",
          usageLimit: 100,
        },
      },
      controlPlane,
      planGrowthReadiness: {
        ...healthyPlanReadiness,
        workspace: {
          ...healthyPlanReadiness.workspace,
          planKey: "free",
        },
      },
      providerCostUsageCents: 0,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      surface: "ai-worker-margin-readiness",
      posture: "blocked",
      tone: "blocked",
      liveScale: {
        enabled: false,
        status: "blocked",
      },
    });
    expect(readiness.checks.find((check) => check.id === "provider-cost-boundary"))
      .toMatchObject({
        status: "blocked",
      });
  });

  it("keeps production scale in margin watch when AI-worker dry-run cost curves are not wired", () => {
    const readiness = buildAiWorkerMarginReadiness({
      dashboard,
      controlPlane,
      planGrowthReadiness: healthyPlanReadiness,
      providerCostUsageCents: 1200,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "margin_watch",
      tone: "warn",
      liveScale: {
        enabled: false,
      },
    });
    expect(readiness.requiredCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "ai-task-metering", status: "missing" }),
      expect.objectContaining({ id: "ai-execution-budget", status: "missing" }),
      expect.objectContaining({ id: "provider-cost-curves", status: "missing" }),
      expect.objectContaining({ id: "audit-coverage", status: "met" }),
      expect.objectContaining({ id: "admin-controls", status: "met" }),
    ]));
    expect(readiness.unavailableClaims).toContain("Live external AI-worker execution billing");
  });

  it("marks advisory margin ready when plan fit and production controls are present", () => {
    const readiness = buildAiWorkerMarginReadiness({
      dashboard,
      controlPlane,
      planGrowthReadiness: healthyPlanReadiness,
      providerCostUsageCents: 1200,
      aiTaskMeteringEnforced: true,
      aiExecutionBudgetEnforced: true,
      providerCostCurvesConfigured: true,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "advisory_ready",
      tone: "good",
      revenueModel: {
        model: "subscription_with_usage_controls",
        planKey: "pro",
      },
      planBoundary: {
        providerCostBudgetCents: 5000,
        aiExecutionBudgetCents: 15000,
        aiExecutionBudgetUsageCents: 0,
        aiExecutionBudgetRemainingCents: 15000,
        includedChannels: ["email", "call"],
      },
    });
  });
});
