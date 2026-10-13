import { describe, expect, it } from "vitest";
import {
  buildConversionWorkQueue,
  conversionWorkQueueResponseSchema,
} from "../src/conversion-work-queue";
import type { DashboardResponse, LeadRecord, MeetingRecord } from "../src/domain";

const now = "2026-06-04T12:00:00.000Z";

type LeadOverrides = Omit<Partial<LeadRecord>, "email" | "phone"> & {
  email?: string | undefined;
  phone?: string | undefined;
};

function lead(overrides: LeadOverrides = {}): LeadRecord {
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

function meeting(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  return {
    id: "meeting-1",
    leadId: "lead-1",
    status: "scheduled",
    scheduledFor: "2026-06-04T10:00:00.000Z",
    owner: "Owner",
    notes: "Discovery call scheduled.",
    dealValueCents: 0,
    dealCurrency: "USD",
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

describe("conversion work queue", () => {
  it("prioritizes call review blockers before overdue meeting work", () => {
    const queue = conversionWorkQueueResponseSchema.parse(
      buildConversionWorkQueue({
        dashboard: dashboard({
          leads: [lead()],
          calls: [
            {
              id: "call-1",
              leadId: "lead-1",
              status: "review_required",
              provider: "twilio",
              providerCallId: null,
              summary: "Lower-confidence call needs review.",
              transcript: "",
              disposition: "Review needed",
              reviewRequired: true,
            },
          ],
          meetings: [meeting()],
        }),
        generatedAt: now,
      }),
    );

    expect(queue).toMatchObject({
      surface: "conversion-work-queue",
      posture: "blocked",
      title: "Conversion queue blocked",
      workspace: {
        name: "Growth OS",
        planKey: "pro",
      },
    });
    expect(queue.items.map((item) => item.id)).toEqual([
      "call-review-call-1",
      "meeting_outcome-meeting-1",
    ]);
    expect(queue.metrics.find((metric) => metric.id === "call-blockers")).toMatchObject({
      value: "1",
      tone: "blocked",
    });
    expect(queue.metrics.find((metric) => metric.id === "overdue-meetings")).toMatchObject({
      value: "1",
      tone: "warn",
    });
    expect(queue.guardrails).toContain(
      "Read-only conversion work queue; no meeting, call, outreach, or provider state changes are performed.",
    );
  });

  it("surfaces meeting handoff, missing contact, and missing closed-value work", () => {
    const queue = buildConversionWorkQueue({
      dashboard: dashboard({
        leads: [
          lead({
            id: "lead-contacted",
            fullName: "Casey Morgan",
            status: "contacted",
            score: 91,
            phone: undefined,
          }),
          lead({
            id: "lead-missing-contact",
            fullName: "Quinn Rivera",
            status: "qualified",
            score: 88,
            email: undefined,
            phone: undefined,
          }),
          lead({
            id: "lead-won",
            fullName: "Won Account",
            status: "won",
            score: 100,
          }),
        ],
        meetings: [
          meeting({
            id: "meeting-won",
            leadId: "lead-won",
            status: "completed",
            scheduledFor: "2026-06-03T12:00:00.000Z",
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(queue.posture).toBe("ready");
    expect(queue.items.map((item) => item.id)).toEqual([
      "record-value-meeting-won",
      "schedule_meeting-lead-contacted",
      "complete_contact-lead-missing-contact",
    ]);
    expect(queue.items.find((item) => item.id === "record-value-meeting-won")).toMatchObject({
      type: "record_value",
      urgency: "medium",
      href: "/dashboard#revenue-forecast",
    });
    expect(queue.items.find((item) => item.id === "complete_contact-lead-missing-contact")).toMatchObject({
      type: "complete_contact",
      lead: {
        contact: "No direct contact recorded",
      },
    });
    expect(queue.metrics.find((metric) => metric.id === "value-gaps")).toMatchObject({
      value: "1",
      tone: "warn",
    });
  });

  it("reports clear posture when no conversion work is open", () => {
    const queue = buildConversionWorkQueue({
      dashboard: dashboard({
        leads: [lead({ status: "won" })],
        meetings: [
          meeting({
            status: "completed",
            dealValueCents: 1200000,
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(queue.posture).toBe("clear");
    expect(queue.items).toEqual([]);
    expect(queue.metrics.every((metric) => metric.tone === "good" || metric.tone === "neutral")).toBe(
      true,
    );
    expect(queue.unavailableClaims).toContain(
      "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
    );
  });
});
