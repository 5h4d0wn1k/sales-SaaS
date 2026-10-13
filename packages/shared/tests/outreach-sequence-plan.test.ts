import { describe, expect, it } from "vitest";
import {
  buildOutreachSequencePlan,
  outreachSequencePlanResponseSchema,
} from "../src/outreach-sequence-plan";
import type { DashboardResponse, LeadRecord, SalesBlueprint } from "../src/domain";

const now = "2026-06-04T12:00:00.000Z";

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    fullName: "Nina Carter",
    email: "nina@example.com",
    phone: "+15550101010",
    company: "VectrCloud",
    source: "website",
    status: "qualified",
    score: 88,
    lastTouchpoint: "Evidence showed an active outbound hiring push.",
    rejectionReason: null,
    ...overrides,
  };
}

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    workspace: {
      organizationName: "Northstar Labs",
      workspaceName: "Growth OS",
      region: "global",
      primaryChannel: "email",
    },
    metrics: [],
    leads: [lead()],
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

describe("outreach sequence plan", () => {
  it("builds a reviewable multi-channel sequence without provider work", () => {
    const plan = outreachSequencePlanResponseSchema.parse(
      buildOutreachSequencePlan({
        dashboard: dashboard(),
        blueprint: blueprint(),
        generatedAt: now,
      }),
    );

    expect(plan).toMatchObject({
      surface: "outreach-sequence-plan",
      posture: "review_ready",
      title: "Outreach sequence ready for review",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
    });
    expect(plan.channels.map((channel) => channel.channel)).toEqual(["email", "call"]);
    expect(plan.channels.every((channel) => channel.status === "included")).toBe(true);
    expect(plan.candidates[0]).toMatchObject({
      id: "lead-1",
      fullName: "Nina Carter",
      contactability: ["email", "call", "sms"],
    });
    expect(plan.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "email",
          providerWork: false,
          approvalRequired: true,
        }),
        expect.objectContaining({
          channel: "call",
          providerWork: false,
          approvalRequired: true,
        }),
      ]),
    );
    expect(plan.guardrails[0]).toContain("read-only");
  });

  it("blocks sequence planning until a Sales Blueprint exists", () => {
    const plan = buildOutreachSequencePlan({
      dashboard: dashboard(),
      blueprint: null,
      generatedAt: now,
    });

    expect(plan.posture).toBe("blueprint_required");
    expect(plan.nextActions[0]).toMatchObject({
      id: "complete-blueprint",
      tone: "blocked",
    });
  });

  it("flags channel review when requested channels exceed the current plan", () => {
    const plan = buildOutreachSequencePlan({
      dashboard: dashboard({
        subscription: {
          planKey: "starter",
          status: "active",
          seats: 3,
          usageLimit: 1000,
          monthlyUsage: 120,
        },
      }),
      blueprint: blueprint({
        businessProfile: {
          ...blueprint().businessProfile,
          channels: ["email", "linkedin"],
        },
        outreachChannels: ["email", "linkedin"],
      }),
      generatedAt: now,
    });

    expect(plan.posture).toBe("channel_review");
    expect(plan.channels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "linkedin",
          status: "requires_upgrade",
          recommendedPlan: expect.objectContaining({
            planKey: "elite",
          }),
        }),
      ]),
    );
    expect(plan.unavailableClaims[0]).toContain("No automatic email send");
  });
});
