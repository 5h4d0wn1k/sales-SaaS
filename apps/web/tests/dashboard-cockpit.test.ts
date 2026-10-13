import { describe, expect, it } from "vitest";
import type { DashboardResponse } from "@sales/shared";
import { buildDashboardCockpit } from "../lib/dashboard-cockpit";

const baseDashboard = {
  subscription: {
    planKey: "pro",
    status: "active",
    seats: 5,
    usageLimit: 1000,
    monthlyUsage: 120,
  },
  sourcePlan: {
    id: "source_plan_1",
    summary: "Find governed outbound accounts",
    sources: ["website", "directory"],
    contactTargets: ["founders"],
    searchTerms: ["b2b saas hiring"],
    rationale: "Use public business signals before outreach.",
  },
  sourceRuns: [
    {
      id: "run_1",
      source: "website",
      status: "completed",
      providerMode: "mock",
      candidatesFound: 20,
      dedupedCount: 3,
      qualifiedCount: 8,
      rejectedCount: 9,
      qualityScore: 86,
      evidence: [],
      rejectionReasons: [],
      complianceChecks: [],
      freshness: "Today",
      nextAction: "Review before outreach.",
      summary: "Evidence generated for review.",
    },
  ],
  campaigns: [
    {
      id: "campaign_1",
      name: "First touch",
      channel: "email",
      stage: "approved",
      approved: true,
      firstActionCompleted: false,
      nextActionAt: "Ready now",
      leadsEnrolled: 8,
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
} satisfies Pick<
  DashboardResponse,
  "subscription" | "sourcePlan" | "sourceRuns" | "campaigns" | "leads"
>;

describe("dashboard cockpit model", () => {
  it("summarizes a ready workspace as an operator cockpit", () => {
    const cockpit = buildDashboardCockpit({
      dashboard: baseDashboard,
      blueprint: {
        status: "ready",
        readinessScore: 95,
        readinessGaps: [],
      },
      pendingProposalCount: 0,
      canReviewProposals: true,
      emailVerified: true,
      workspaceCount: 2,
      aiWorkerSummary: {
        active: 2,
        paused: 0,
        disabled: 0,
        pendingApproval: 0,
        blocked: 0,
        budgetUsedCents: 1500,
        budgetLimitCents: 10000,
      },
      contentPlan: {
        publishingBlocked: false,
        blockers: [],
        opportunities: [
          {
            id: "content_1",
            title: "AI sales workflow for founder-led SaaS",
            slug: "ai-sales-workflow-founder-led-saas",
            intent: "seo_landing_page",
            funnelStage: "consideration",
            audience: "Founder-led SaaS",
            priority: 94,
            targetKeywords: ["ai sales workflow"],
            sourceSignals: ["Sales Blueprint"],
            suggestedChannels: ["email"],
            leadCaptureOffer: "Blueprint teardown",
            guardrails: ["Operator review is required before publishing."],
            nextAction: "Draft a claim-safe brief.",
            status: "ready_for_brief",
          },
        ],
      },
    });

    expect(cockpit.overallLabel).toBe("ready");
    expect(cockpit.summary).toMatchObject({
      blocked: 0,
      needsReview: 0,
      ready: 6,
      workspaces: 2,
      emailVerified: true,
      planKey: "pro",
    });
    expect(cockpit.signals.find((signal) => signal.id === "source-evidence")).toMatchObject({
      value: "1/2",
      tone: "good",
    });
  });

  it("fails closed when core setup and approval authority are missing", () => {
    const cockpit = buildDashboardCockpit({
      dashboard: {
        ...baseDashboard,
        sourcePlan: null,
        sourceRuns: [],
        campaigns: [],
        leads: [],
      },
      blueprint: null,
      pendingProposalCount: 3,
      canReviewProposals: false,
      emailVerified: false,
      workspaceCount: 1,
      aiWorkerSummary: null,
      contentPlan: {
        publishingBlocked: true,
        blockers: ["Sales Blueprint is required before content planning."],
        opportunities: [],
      },
    });

    expect(cockpit.overallLabel).toBe("blocked");
    expect(cockpit.summary.blocked).toBeGreaterThanOrEqual(3);
    expect(cockpit.signals.find((signal) => signal.id === "blueprint")).toMatchObject({
      value: "Missing",
      tone: "blocked",
      href: "/settings",
    });
    expect(cockpit.signals.find((signal) => signal.id === "approvals")).toMatchObject({
      value: "3",
      tone: "blocked",
    });
  });
});
