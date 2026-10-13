import { describe, expect, it } from "vitest";
import {
  buildConversionBrief,
  conversionBriefResponseSchema,
} from "../src/conversion-brief";
import type { DashboardResponse, LeadRecord } from "../src/domain";

const now = "2026-06-04T00:00:00.000Z";

type LeadOverrides = Omit<Partial<LeadRecord>, "email" | "phone"> & {
  email?: string | undefined;
  phone?: string | undefined;
};

function lead(overrides: LeadOverrides): LeadRecord {
  const record: LeadRecord = {
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

  if ("email" in overrides && overrides.email === undefined) {
    delete record.email;
  }

  if ("phone" in overrides && overrides.phone === undefined) {
    delete record.phone;
  }

  return record;
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

describe("conversion brief", () => {
  it("surfaces call review blockers before meeting handoff actions", () => {
    const brief = conversionBriefResponseSchema.parse(
      buildConversionBrief({
        dashboard: dashboard({
          leads: [lead({ id: "lead-review", status: "qualified" })],
          calls: [
            {
              id: "call-1",
              leadId: "lead-review",
              status: "review_required",
              provider: "twilio",
              providerCallId: null,
              summary: "Lower-confidence call needs review.",
              transcript: "",
              disposition: "Review needed",
              reviewRequired: true,
            },
          ],
        }),
        generatedAt: now,
      }),
    );

    expect(brief).toMatchObject({
      surface: "conversion-brief",
      posture: "blocked",
      title: "Conversion follow-through blocked",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
    });
    expect(brief.nextActions[0]).toMatchObject({
      id: "review-calls",
      urgency: "blocked",
      href: "/dashboard#calls-and-meetings",
    });
    expect(brief.metrics.find((metric) => metric.id === "calls-needing-review")).toMatchObject({
      value: "1",
      tone: "blocked",
    });
    expect(brief.guardrails).toContain(
      "Read-only conversion brief; no scheduling, outreach, or provider work is performed.",
    );
  });

  it("orders meeting candidates by conversion readiness and score", () => {
    const brief = buildConversionBrief({
      dashboard: dashboard({
        leads: [
          lead({
            id: "lead-qualified",
            fullName: "Quinn Rivera",
            status: "qualified",
            score: 98,
            email: undefined,
            phone: undefined,
          }),
          lead({
            id: "lead-contacted",
            fullName: "Casey Morgan",
            status: "contacted",
            score: 70,
            phone: undefined,
          }),
          lead({
            id: "lead-booked",
            fullName: "Mika Singh",
            status: "meeting_booked",
            score: 50,
          }),
          lead({
            id: "lead-won",
            fullName: "Won Account",
            status: "won",
            score: 100,
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(brief.posture).toBe("pipeline_ready");
    expect(brief.nextActions.map((action) => action.id)).toEqual(
      expect.arrayContaining(["schedule-meetings", "complete-contact-data"]),
    );
    expect(brief.leadFocus.map((item) => item.id)).toEqual([
      "lead-booked",
      "lead-contacted",
      "lead-qualified",
    ]);
    expect(brief.leadFocus.find((item) => item.id === "lead-qualified")).toMatchObject({
      contact: "No direct contact recorded",
      recommendedAction: "Complete contact data before outreach or meeting scheduling.",
    });
  });

  it("tracks pending meeting outcomes without double-counting open meeting leads", () => {
    const brief = buildConversionBrief({
      dashboard: dashboard({
        leads: [lead({ id: "lead-open-meeting", status: "meeting_booked" })],
        meetings: [
          {
            id: "meeting-1",
            leadId: "lead-open-meeting",
            status: "scheduled",
            scheduledFor: now,
            owner: "Owner",
            notes: "Discovery call scheduled.",
            dealValueCents: 0,
            dealCurrency: "USD",
          },
        ],
      }),
      generatedAt: now,
    });

    expect(brief.posture).toBe("needs_follow_up");
    expect(brief.leadFocus).toEqual([]);
    expect(brief.nextActions.map((action) => action.id)).toContain("capture-meeting-outcomes");
    expect(brief.metrics.find((metric) => metric.id === "meeting-candidates")).toMatchObject({
      value: "0",
      tone: "good",
    });
  });
});
