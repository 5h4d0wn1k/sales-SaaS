import { describe, expect, it } from "vitest";
import {
  buildRevenueForecast,
  revenueForecastResponseSchema,
} from "../src/revenue-forecast";
import type { DashboardResponse, LeadRecord, SalesBlueprint } from "../src/domain";

const now = "2026-06-04T00:00:00.000Z";

function lead(overrides: Partial<LeadRecord>): LeadRecord {
  return {
    id: "lead-1",
    fullName: "Nina Carter",
    email: "nina@example.com",
    phone: "+15550101010",
    company: "VectrCloud",
    source: "manual",
    status: "qualified",
    score: 82,
    lastTouchpoint: "Evidence reviewed",
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
    leads: [],
    campaigns: [],
    subscription: {
      planKey: "pro",
      status: "active",
      seats: 3,
      usageLimit: 1000,
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
    monthlyLeadTarget: 4,
    meetingTarget: 2,
    averageContractValue: 10000,
    automationMode: "approval_gated",
    approvalRequiredFor: ["first outreach"],
    complianceNotes: "Respect unsubscribe and sender reputation rules.",
    readinessScore: 100,
    readinessGaps: [],
    lastUpdatedAt: now,
    ...overrides,
  };
}

describe("revenue forecast", () => {
  it("requires Sales Blueprint assumptions before assigning pipeline value", () => {
    const forecast = revenueForecastResponseSchema.parse(
      buildRevenueForecast({
        dashboard: dashboard({
          leads: [lead({ id: "lead-qualified", status: "qualified" })],
        }),
        blueprint: null,
        generatedAt: now,
      }),
    );

    expect(forecast).toMatchObject({
      surface: "revenue-forecast",
      posture: "blueprint_required",
      title: "Revenue assumptions required",
      assumptions: {
        blueprintId: null,
        averageContractValue: 0,
      },
    });
    expect(forecast.nextActions[0]).toMatchObject({
      id: "save-blueprint",
      urgency: "blocked",
      href: "/settings#sales-blueprint",
    });
    expect(forecast.guardrails).toContain(
      "Forecast is deterministic planning guidance, not guaranteed revenue.",
    );
  });

  it("calculates weighted pipeline and target gap from lead stages", () => {
    const forecast = buildRevenueForecast({
      dashboard: dashboard({
        leads: [
          lead({ id: "lead-new", status: "new" }),
          lead({ id: "lead-qualified", status: "qualified" }),
          lead({ id: "lead-contacted", status: "contacted" }),
          lead({ id: "lead-booked", status: "meeting_booked" }),
          lead({ id: "lead-won", status: "won" }),
          lead({ id: "lead-lost", status: "lost" }),
        ],
        meetings: [
          {
            id: "meeting-1",
            leadId: "lead-booked",
            status: "scheduled",
            scheduledFor: now,
            owner: "Owner",
            notes: "Discovery call.",
            dealValueCents: 0,
            dealCurrency: "USD",
          },
        ],
      }),
      blueprint: blueprint({
        monthlyLeadTarget: 10,
        meetingTarget: 6,
        averageContractValue: 10000,
      }),
      generatedAt: now,
    });

    expect(forecast.posture).toBe("target_gap");
    expect(forecast.assumptions.weightedPipelineValue).toBe(21500);
    expect(forecast.assumptions.targetPipelineValue).toBe(33000);
    expect(forecast.assumptions.targetCoveragePercent).toBe(65);
    expect(forecast.stages.find((stage) => stage.id === "meeting_booked")).toMatchObject({
      leadCount: 1,
      estimatedValue: 5500,
    });
    expect(forecast.nextActions.map((action) => action.id)).toEqual(
      expect.arrayContaining(["move-leads-to-meetings"]),
    );
  });

  it("marks forecast coverage on track when target assumptions are met", () => {
    const forecast = buildRevenueForecast({
      dashboard: dashboard({
        leads: [
          lead({ id: "lead-won-1", status: "won" }),
          lead({ id: "lead-won-2", status: "won" }),
          lead({ id: "lead-booked", status: "meeting_booked" }),
          lead({ id: "lead-contacted", status: "contacted" }),
        ],
        meetings: [
        {
          id: "meeting-1",
          leadId: "lead-booked",
          status: "completed",
          scheduledFor: now,
          owner: "Owner",
          notes: "Converted.",
          dealValueCents: 1200000,
          dealCurrency: "USD",
        },
      ],
      }),
      blueprint: blueprint({
        monthlyLeadTarget: 4,
        meetingTarget: 2,
        averageContractValue: 8000,
      }),
      generatedAt: now,
    });

    expect(forecast.posture).toBe("on_track");
    expect(forecast.assumptions.actualClosedValue).toBe(12000);
    expect(forecast.stages.find((stage) => stage.id === "won")).toMatchObject({
      estimatedValue: 20000,
    });
    expect(forecast.nextActions).toEqual([
      expect.objectContaining({
        id: "review-next-growth-experiment",
        urgency: "good",
      }),
    ]);
    expect(forecast.metrics.find((metric) => metric.id === "actual-closed")).toMatchObject({
      value: "$12,000",
      tone: "good",
    });
    expect(forecast.metrics.find((metric) => metric.id === "pipeline-gap")).toMatchObject({
      value: "$0",
      tone: "good",
    });
  });
});
