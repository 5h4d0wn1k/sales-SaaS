import { describe, expect, it } from "vitest";
import type { DashboardResponse } from "../src/domain";
import type { ConversionWorkQueueResponse } from "../src/conversion-work-queue";
import type { PlanGrowthReadinessResponse } from "../src/plan-growth-readiness";
import {
  buildManagedServiceReadiness,
  managedServicePackages,
  managedServiceReadinessResponseSchema,
} from "../src/managed-service-readiness";

const now = "2026-06-06T12:00:00.000Z";

const dashboard = {
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
    monthlyUsage: 1200,
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
} satisfies DashboardResponse;

const healthyPlan = {
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
  guardrails: [
    "Plan growth readiness is read-only; no subscription, payment provider, provider configuration, or usage record is mutated.",
  ],
  unavailableClaims: [],
} satisfies PlanGrowthReadinessResponse;

const clearConversionQueue = {
  surface: "conversion-work-queue",
  version: "2026-06-04.conversion-work-queue",
  generatedAt: now,
  workspace: {
    name: "Growth OS",
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

const configuredManagedService = {
  scopePolicyConfigured: true,
  sowTemplateConfigured: true,
  pricingPolicyConfigured: true,
  deliveryOwner: "ops@example.com",
  customerHandoffConfigured: true,
  providerCostPolicyConfigured: true,
  supportCapacityConfigured: true,
};

describe("managed service readiness", () => {
  it("keeps managed service packages bounded and claim-safe", () => {
    expect(managedServicePackages.map((managedPackage) => managedPackage.key)).toEqual([
      "setup-sprint",
      "operator-assist",
      "managed-revops",
    ]);

    const packageCopy = managedServicePackages
      .map((managedPackage) =>
        [
          managedPackage.tier,
          managedPackage.bestFor,
          managedPackage.includes,
          managedPackage.outcome,
          managedPackage.operatingBoundary,
        ]
          .join(" ")
          .toLowerCase(),
      );

    for (const copy of packageCopy) {
      expect(copy).not.toContain("guaranteed meetings");
      expect(copy).not.toContain("full autonomy");
      expect(copy).not.toContain("universal scraping");
    }
  });

  it("reports ready-to-scope when commercial, billing, approval, and conversion controls are clear", () => {
    const readiness = managedServiceReadinessResponseSchema.parse(
      buildManagedServiceReadiness({
        dashboard,
        planGrowthReadiness: healthyPlan,
        conversionWorkQueue: clearConversionQueue,
        proposals: {
          summary: {
            pending: 0,
            highRisk: 0,
            approved: 0,
            rejected: 0,
          },
        },
        aiWorkerSummary: {
          active: 1,
          paused: 0,
          disabled: 0,
          pendingApproval: 0,
          blocked: 0,
          budgetUsedCents: 0,
          budgetLimitCents: 5000,
        },
        config: configuredManagedService,
        generatedAt: now,
      }),
    );

    expect(readiness).toMatchObject({
      surface: "managed-service-readiness",
      posture: "ready_to_scope",
      title: "Managed rollout can be scoped",
      recommendedPackage: {
        key: "setup-sprint",
        tier: "Setup Sprint",
      },
    });
    expect(readiness.controls.find((control) => control.id === "commercial-scope")).toMatchObject({
      tone: "good",
    });
    expect(readiness.nextActions[0]).toMatchObject({
      id: "scope-managed-package",
      href: expect.stringContaining("managedPackage=setup-sprint"),
    });
    expect(readiness.guardrails[0]).toContain("read-only");
  });

  it("recommends operator review when workload pressure rises but hard blockers are absent", () => {
    const readiness = buildManagedServiceReadiness({
      dashboard,
      planGrowthReadiness: {
        ...healthyPlan,
        posture: "upgrade_recommended",
        summary: "Move to Scale before scaling usage and provider work.",
      },
      conversionWorkQueue: {
        ...clearConversionQueue,
        posture: "ready",
        items: [
          {
            id: "queue_1",
            type: "meeting_prep",
            title: "Prepare meeting follow-up",
            detail: "Review meeting prep before the next call.",
            urgency: "high",
            dueAt: null,
            dueLabel: "Review today",
            owner: "owner@example.com",
            suggestedAction: "Prepare follow-up notes.",
            href: "/dashboard#calls-and-meetings",
            lead: null,
            relatedRecord: {
              kind: "meeting",
              id: "meeting_1",
            },
            evidence: ["/v1/conversion/work-queue"],
          },
        ],
      },
      proposals: {
        summary: {
          pending: 2,
          highRisk: 0,
          approved: 0,
          rejected: 0,
        },
      },
      aiWorkerSummary: {
        active: 1,
        paused: 0,
        disabled: 0,
        pendingApproval: 1,
        blocked: 0,
        budgetUsedCents: 1000,
        budgetLimitCents: 5000,
      },
      config: configuredManagedService,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "needs_operator_review",
      recommendedPackage: {
        key: "operator-assist",
      },
    });
    expect(readiness.controls.find((control) => control.id === "approval-workload")).toMatchObject({
      tone: "warn",
    });
    expect(readiness.controls.find((control) => control.id === "conversion-workload")).toMatchObject({
      tone: "warn",
    });
  });

  it("blocks managed rollout when commercial controls, subscription, or high-risk work are unsafe", () => {
    const readiness = buildManagedServiceReadiness({
      dashboard: {
        ...dashboard,
        subscription: {
          ...dashboard.subscription,
          status: "past_due",
        },
      },
      planGrowthReadiness: {
        ...healthyPlan,
        posture: "blocked",
        summary: "Resolve billing status before creating more billable work.",
      },
      conversionWorkQueue: {
        ...clearConversionQueue,
        posture: "blocked",
        items: [
          {
            id: "queue_blocked",
            type: "call_review",
            title: "Review blocked call",
            detail: "A call needs review before follow-up.",
            urgency: "blocked",
            dueAt: null,
            dueLabel: "Review now",
            owner: "owner@example.com",
            suggestedAction: "Review call outcome.",
            href: "/dashboard#calls-and-meetings",
            lead: null,
            relatedRecord: {
              kind: "call",
              id: "call_1",
            },
            evidence: ["/v1/conversion/work-queue"],
          },
        ],
      },
      proposals: {
        summary: {
          pending: 2,
          highRisk: 1,
          approved: 0,
          rejected: 0,
        },
      },
      aiWorkerSummary: null,
      config: {
        ...configuredManagedService,
        deliveryOwner: null,
        scopePolicyConfigured: false,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("blocked");
    expect(readiness.recommendedPackage.key).toBe("managed-revops");
    expect(readiness.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "commercial-scope",
          tone: "blocked",
        }),
        expect.objectContaining({
          id: "subscription-state",
          tone: "blocked",
        }),
        expect.objectContaining({
          id: "approval-workload",
          tone: "blocked",
        }),
      ]),
    );
    expect(readiness.unavailableClaims[0]).toContain("No managed-service contract");
  });
});
