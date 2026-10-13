import { describe, expect, it } from "vitest";
import {
  buildRevenueReconciliation,
  revenueReconciliationResponseSchema,
} from "../src/revenue-reconciliation";
import type { DashboardResponse, LeadRecord, MeetingRecord } from "../src/domain";

const now = "2026-06-04T12:00:00.000Z";

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    fullName: "Nina Carter",
    email: "nina@example.com",
    phone: "+15550101010",
    company: "VectrCloud",
    source: "manual",
    status: "won",
    score: 82,
    lastTouchpoint: "Closed from discovery call",
    rejectionReason: null,
    ...overrides,
  };
}

function meeting(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  return {
    id: "meeting-1",
    leadId: "lead-1",
    status: "completed",
    scheduledFor: "2026-06-05T10:00:00.000Z",
    owner: "Owner",
    notes: "Discovery call completed.",
    dealValueCents: 1200000,
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
    leads: [lead()],
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
    meetings: [meeting()],
    ...overrides,
  };
}

describe("revenue reconciliation", () => {
  it("builds a manual accounting handoff from completed meeting value and subscription context", () => {
    const reconciliation = revenueReconciliationResponseSchema.parse(
      buildRevenueReconciliation({
        dashboard: dashboard(),
        generatedAt: now,
      }),
    );

    expect(reconciliation.surface).toBe("revenue-reconciliation");
    expect(reconciliation.summary).toMatchObject({
      completedMeetingCount: 1,
      valuedMeetingCount: 1,
      missingValueCount: 0,
      actualValueCents: 1200000,
      currency: "USD",
      subscriptionStatus: "active",
      planKey: "pro",
      seats: 3,
      monthlyUsage: 120,
      usageLimit: 1000,
    });
    expect(reconciliation.records[0]).toMatchObject({
      meetingId: "meeting-1",
      leadId: "lead-1",
      leadName: "Nina Carter",
      dealValueCents: 1200000,
      revenueStatus: "recorded_value",
      nextAction: "Review against CRM, invoice, and payment records before accounting import.",
    });
    expect(reconciliation.metrics.find((metric) => metric.id === "actual-value")).toMatchObject({
      value: "$12,000",
      tone: "good",
    });
    expect(reconciliation.csv.filename).toBe("growth-os-revenue-reconciliation.csv");
    expect(reconciliation.csv.content).toContain('"Meeting ID","Lead ID","Lead name"');
    expect(reconciliation.guardrails).toContain(
      "Revenue reconciliation is a manual accounting handoff; no accounting, payment, CRM, or billing provider records are created or mutated.",
    );
  });

  it("flags missing deal value and won leads without completed meetings", () => {
    const reconciliation = buildRevenueReconciliation({
      dashboard: dashboard({
        leads: [
          lead({ id: "lead-missing-value", status: "won" }),
          lead({ id: "lead-without-meeting", fullName: "Omar Khan", status: "won" }),
        ],
        meetings: [
          meeting({
            id: "meeting-missing-value",
            leadId: "lead-missing-value",
            dealValueCents: 0,
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(reconciliation.summary).toMatchObject({
      completedMeetingCount: 1,
      valuedMeetingCount: 0,
      missingValueCount: 2,
      wonLeadWithoutMeetingCount: 1,
      actualValueCents: 0,
    });
    expect(reconciliation.records.map((record) => record.revenueStatus)).toEqual([
      "missing_value",
      "won_missing_meeting",
    ]);
    expect(reconciliation.records[0].nextAction).toBe(
      "Add actual contract value before using this row for accounting or billing reconciliation.",
    );
    expect(reconciliation.records[1].nextAction).toBe(
      "Confirm the closed-won source record and add a completed meeting with actual contract value before accounting import.",
    );
  });

  it("escapes formula-like CSV values before spreadsheet download", () => {
    const reconciliation = buildRevenueReconciliation({
      dashboard: dashboard({
        leads: [
          lead({
            fullName: "=IMPORTXML(\"https://example.com\")",
            company: "@Acme",
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(reconciliation.csv.content).toContain('"\'=IMPORTXML(""https://example.com"")"');
    expect(reconciliation.csv.content).toContain('"\'@Acme"');
  });
});
