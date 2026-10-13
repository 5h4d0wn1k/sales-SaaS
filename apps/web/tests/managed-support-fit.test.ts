import { describe, expect, it } from "vitest";
import type {
  ConversionWorkQueueResponse,
  DashboardResponse,
  PlanGrowthReadinessResponse,
} from "@sales/shared";
import { buildManagedSupportFit } from "../lib/managed-support-fit";
import type { OperationalHealthModel } from "../lib/operational-health";

const baseDashboard = {
  subscription: {
    planKey: "pro",
    status: "active",
    seats: 3,
    usageLimit: 1000,
    monthlyUsage: 120,
  },
  sourcePlan: {
    id: "source_plan_1",
    summary: "Find governed outbound accounts",
    sources: ["website"],
    contactTargets: ["founders"],
    searchTerms: ["b2b services"],
    rationale: "Use public business signals before outreach.",
  },
  sourceRuns: [
    {
      id: "run_1",
      source: "website",
      status: "completed",
      providerMode: "mock",
      candidatesFound: 12,
      dedupedCount: 2,
      qualifiedCount: 6,
      rejectedCount: 4,
      qualityScore: 84,
      evidence: [],
      rejectionReasons: [],
      complianceChecks: ["suppression precheck"],
      freshness: "Today",
      nextAction: "Review before outreach.",
      summary: "Evidence generated for review.",
    },
  ],
  leads: [
    {
      id: "lead_1",
      fullName: "Nina Carter",
      email: "nina@example.com",
      company: "VectrCloud",
      source: "website",
      status: "qualified",
      score: 82,
      lastTouchpoint: "Source run",
      rejectionReason: null,
    },
  ],
  campaigns: [],
  calls: [],
  meetings: [],
} satisfies Pick<
  DashboardResponse,
  "subscription" | "sourcePlan" | "sourceRuns" | "leads" | "campaigns" | "calls" | "meetings"
>;

const healthyPlan = {
  surface: "plan-growth-readiness",
  version: "2026-06-04.plan-growth-readiness",
  generatedAt: "2026-06-05T12:00:00.000Z",
  workspace: {
    name: "Winrate Demo",
    planKey: "pro",
  },
  posture: "healthy",
  title: "Plan fit is healthy",
  summary: "Usage, provider budget, channel access, and blueprint readiness are aligned.",
  metrics: [],
  signals: [],
  recommendedPlan: null,
  nextActions: [],
  guardrails: [
    "Plan growth readiness is read-only; no subscription, payment provider, provider configuration, or usage record is mutated.",
  ],
  unavailableClaims: [],
} satisfies PlanGrowthReadinessResponse;

const upgradePlan = {
  ...healthyPlan,
  posture: "upgrade_recommended",
  title: "Upgrade before the next scale push",
  summary: "Move to Scale before scaling usage and provider work.",
  recommendedPlan: {
    planKey: "scale",
    planName: "Scale",
    description: "For governed teams scaling outbound.",
    price: {
      usd: 299,
      inr: 24999,
    },
    usageLimit: 25000,
    outreachDispatchLimit: 5000,
    voiceCallLimit: 1000,
    providerCostBudgetCents: 20000,
    aiWorkerTaskProposalLimit: 250,
    aiWorkerExecutionBudgetCents: 75000,
    includedChannels: ["email", "call", "linkedin"],
    checkoutPath: "/get-started?plan=scale",
  },
} satisfies PlanGrowthReadinessResponse;

const clearConversion = {
  surface: "conversion-work-queue",
  version: "2026-06-04.conversion-work-queue",
  generatedAt: "2026-06-05T12:00:00.000Z",
  workspace: {
    name: "Winrate Demo",
    planKey: "pro",
  },
  posture: "clear",
  title: "Conversion queue is clear",
  summary: "No conversion task is open.",
  metrics: [],
  items: [],
  guardrails: [
    "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
  ],
  unavailableClaims: [],
} satisfies ConversionWorkQueueResponse;

const blockedConversion = {
  ...clearConversion,
  posture: "blocked",
  title: "Review gates are blocked",
  summary: "Call review is required.",
  items: [
    {
      id: "queue_1",
      type: "call_review",
      title: "Review call before follow-up",
      detail: "A call needs operator review.",
      urgency: "blocked",
      dueAt: null,
      dueLabel: "Review now",
      owner: "owner@example.com",
      suggestedAction: "Review the call outcome before follow-up.",
      href: "/dashboard#calls-and-meetings",
      lead: {
        id: "lead_1",
        fullName: "Nina Carter",
        company: "VectrCloud",
        status: "qualified",
        score: 82,
        contact: "nina@example.com",
      },
      relatedRecord: {
        kind: "call",
        id: "call_1",
      },
      evidence: ["/v1/dashboard", "/v1/calls/:id/review"],
    },
  ],
} satisfies ConversionWorkQueueResponse;

const goodOps = {
  posture: "good",
  label: "healthy",
  title: "Operational health is clear",
  summary: "Recent workflow, approval, provider, and API evidence does not show an open blocker.",
  latestEvidenceAt: "2026-06-05T12:00:00.000Z",
  metrics: [],
  signals: [],
  guardrails: [
    "Health is based on recent sanitized dashboard and audit evidence only.",
  ],
} satisfies OperationalHealthModel;

const blockedOps = {
  ...goodOps,
  posture: "blocked",
  label: "blocked",
  title: "Operational blockers visible",
  summary: "2 blocked lanes found across dispatch, provider, approval, or API evidence.",
} satisfies OperationalHealthModel;

describe("managed support fit", () => {
  it("keeps low-pressure workspaces self-serve while preserving a setup-sprint path", () => {
    const fit = buildManagedSupportFit({
      dashboard: baseDashboard,
      planGrowthReadiness: healthyPlan,
      conversionWorkQueue: clearConversion,
      operationalHealth: goodOps,
      pendingProposalCount: 0,
      highRiskProposalCount: 0,
      aiWorkerSummary: {
        active: 1,
        paused: 0,
        disabled: 0,
        pendingApproval: 0,
        blocked: 0,
        budgetUsedCents: 0,
        budgetLimitCents: 5000,
      },
    });

    expect(fit).toMatchObject({
      posture: "self_serve_ready",
      tone: "good",
      packageKey: "setup-sprint",
      contactLabel: "Scope Setup Sprint",
    });
    expect(fit.contactHref).toContain("managedPackage=setup-sprint");
    expect(fit.guardrails[0]).toContain("advisory");
  });

  it("recommends Operator Assist when approval and conversion work needs cadence", () => {
    const fit = buildManagedSupportFit({
      dashboard: {
        ...baseDashboard,
        campaigns: [
          {
            id: "campaign_1",
            name: "Founder follow-up",
            channel: "email",
            stage: "approved",
            approved: true,
            firstActionCompleted: false,
            nextActionAt: "Ready now",
            leadsEnrolled: 6,
          },
        ],
      },
      planGrowthReadiness: healthyPlan,
      conversionWorkQueue: {
        ...clearConversion,
        posture: "ready",
        items: [
          {
            ...blockedConversion.items[0],
            id: "queue_ready",
            urgency: "high",
            title: "Prepare meeting follow-up",
          },
        ],
      },
      operationalHealth: goodOps,
      pendingProposalCount: 2,
      highRiskProposalCount: 0,
      aiWorkerSummary: null,
    });

    expect(fit).toMatchObject({
      posture: "operator_assist_recommended",
      tone: "warn",
      packageKey: "operator-assist",
      contactLabel: "Scope Operator Assist",
    });
    expect(fit.signals.find((signal) => signal.id === "approval-load")).toMatchObject({
      value: "2",
      tone: "warn",
    });
  });

  it("recommends Managed RevOps when plan pressure and operational blockers stack up", () => {
    const fit = buildManagedSupportFit({
      dashboard: {
        ...baseDashboard,
        subscription: {
          ...baseDashboard.subscription,
          monthlyUsage: 940,
        },
        campaigns: [
          {
            id: "campaign_1",
            name: "Founder follow-up",
            channel: "email",
            stage: "approved",
            approved: true,
            firstActionCompleted: false,
            nextActionAt: "Ready now",
            leadsEnrolled: 6,
          },
        ],
        calls: [
          {
            id: "call_1",
            leadId: "lead_1",
            status: "review_required",
            provider: "twilio",
            providerCallId: null,
            summary: "Call needs review.",
            transcript: "",
            disposition: "needs_review",
            reviewRequired: true,
          },
        ],
        meetings: [
          {
            id: "meeting_1",
            leadId: "lead_1",
            status: "scheduled",
            scheduledFor: "2026-06-06T15:00:00.000Z",
            owner: "owner@example.com",
            notes: "Prep before call.",
            dealValueCents: 0,
            dealCurrency: "USD",
          },
        ],
      },
      planGrowthReadiness: upgradePlan,
      conversionWorkQueue: blockedConversion,
      operationalHealth: blockedOps,
      pendingProposalCount: 2,
      highRiskProposalCount: 1,
      aiWorkerSummary: {
        active: 2,
        paused: 0,
        disabled: 0,
        pendingApproval: 1,
        blocked: 1,
        budgetUsedCents: 2500,
        budgetLimitCents: 5000,
      },
    });

    expect(fit).toMatchObject({
      posture: "managed_revops_recommended",
      tone: "blocked",
      packageKey: "managed-revops",
      contactLabel: "Scope Managed RevOps",
    });
    expect(fit.metrics).toContainEqual({
      label: "Recommended support",
      value: "Managed RevOps",
    });
    expect(fit.contactHref).toContain("managedPackage=managed-revops");
  });
});
