import { describe, expect, it } from "vitest";
import {
  buildPlanGrowthReadiness,
  planGrowthReadinessResponseSchema,
} from "../src/plan-growth-readiness";
import type { DashboardResponse, SalesBlueprint } from "../src/domain";

const now = "2026-06-04T12:00:00.000Z";

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
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
    ...overrides,
  };
}

function blueprint(overrides: Partial<SalesBlueprint> = {}): SalesBlueprint {
  return {
    id: "blueprint-1",
    status: "ready",
    businessProfile: {
      businessName: "SignalForge AI",
      website: "https://signalforge.example",
      industry: "B2B SaaS",
      offerSummary: "AI-assisted outbound operations for founder-led software teams.",
      targetAudience: "Founder-led B2B SaaS companies",
      regions: ["US"],
      goals: ["Increase qualified pipeline"],
      channels: ["email", "phone calls"],
      constraints: ["Keep first-touch approval"],
      voice: "Direct and consultative.",
      summary: "A governed revenue workspace for outbound execution.",
    },
    icpSummary: "Founder-led B2B SaaS teams",
    buyerRoles: ["Founder", "Head of Sales"],
    painPoints: ["Manual prospecting"],
    disqualifiers: ["No public business signal"],
    qualificationRules: ["Must show active go-to-market motion"],
    sourceChannels: ["website", "search"],
    outreachChannels: ["email", "call"],
    searchKeywords: ["B2B SaaS outbound"],
    monthlyLeadTarget: 2000,
    meetingTarget: 30,
    averageContractValue: 12000,
    automationMode: "approval_gated",
    approvalRequiredFor: ["first outreach", "phone calls"],
    complianceNotes: "Honor suppression and review risky channels.",
    readinessScore: 92,
    readinessGaps: [],
    lastUpdatedAt: now,
    ...overrides,
  };
}

describe("plan growth readiness", () => {
  it("reports healthy plan fit when capacity, channels, and blueprint are aligned", () => {
    const readiness = planGrowthReadinessResponseSchema.parse(
      buildPlanGrowthReadiness({
        dashboard: dashboard(),
        blueprint: blueprint(),
        outreachDispatchUsage: 120,
        voiceCallUsage: 12,
        providerCostUsageCents: 1200,
        generatedAt: now,
      }),
    );

    expect(readiness).toMatchObject({
      surface: "plan-growth-readiness",
      posture: "healthy",
      title: "Plan fit is healthy",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
      recommendedPlan: null,
    });
    expect(readiness.metrics.find((metric) => metric.id === "lead-usage")).toMatchObject({
      value: "1,200 / 5,000",
      tone: "good",
    });
    expect(readiness.metrics.find((metric) => metric.id === "outreach-quota")).toMatchObject({
      value: "120 / 1,000",
      tone: "good",
    });
    expect(readiness.metrics.find((metric) => metric.id === "voice-quota")).toMatchObject({
      value: "12 / 250",
      tone: "good",
    });
    expect(readiness.signals.find((signal) => signal.id === "channel-fit")).toMatchObject({
      tone: "good",
    });
    expect(readiness.guardrails[0]).toContain("read-only");
  });

  it("recommends an upgrade when usage targets and channels exceed the current plan", () => {
    const readiness = buildPlanGrowthReadiness({
      dashboard: dashboard({
        subscription: {
          planKey: "starter",
          status: "active",
          seats: 3,
          usageLimit: 1000,
          monthlyUsage: 920,
        },
        campaigns: [
          {
            id: "campaign-1",
            name: "Founder call sequence",
            channel: "call",
            stage: "draft",
            approved: false,
            firstActionCompleted: false,
            nextActionAt: now,
            leadsEnrolled: 12,
          },
        ],
      }),
      blueprint: blueprint({
        outreachChannels: ["email", "call", "linkedin"],
        businessProfile: {
          ...blueprint().businessProfile,
          channels: ["email", "call", "linkedin"],
        },
        monthlyLeadTarget: 3500,
      }),
      outreachDispatchUsage: 95,
      voiceCallUsage: 0,
      providerCostUsageCents: 1400,
      generatedAt: now,
    });

    expect(readiness.posture).toBe("upgrade_recommended");
    expect(readiness.recommendedPlan).toMatchObject({
      planKey: "elite",
      planName: "Elite",
      includedChannels: ["email", "call", "linkedin"],
    });
    expect(readiness.signals.find((signal) => signal.id === "channel-fit")).toMatchObject({
      tone: "warn",
    });
    expect(readiness.signals.find((signal) => signal.id === "outreach-quota")).toMatchObject({
      tone: "warn",
      current: 95,
      limit: 100,
    });
    expect(readiness.signals.find((signal) => signal.id === "voice-quota")).toMatchObject({
      tone: "warn",
      current: 0,
      limit: 0,
    });
    expect(readiness.nextActions[0]).toMatchObject({
      id: "review-upgrade",
      href: "/get-started?plan=elite",
    });
  });

  it("blocks growth readiness for exhausted capacity or unhealthy billing state", () => {
    const readiness = buildPlanGrowthReadiness({
      dashboard: dashboard({
        subscription: {
          planKey: "starter",
          status: "past_due",
          seats: 3,
          usageLimit: 1000,
          monthlyUsage: 1000,
        },
      }),
      blueprint: blueprint(),
      outreachDispatchUsage: 100,
      voiceCallUsage: 1,
      providerCostUsageCents: 1600,
      generatedAt: now,
    });

    expect(readiness.posture).toBe("blocked");
    expect(readiness.title).toBe("Plan growth is blocked");
    expect(readiness.signals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "lead-capacity",
          tone: "blocked",
        }),
        expect.objectContaining({
          id: "outreach-quota",
          tone: "blocked",
        }),
        expect.objectContaining({
          id: "billing-state",
          tone: "blocked",
        }),
      ]),
    );
    expect(readiness.unavailableClaims[0]).toContain("No automatic billing upgrade");
  });
});
