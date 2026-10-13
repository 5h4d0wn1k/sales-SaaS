import { describe, expect, it } from "vitest";
import { buildCrmHandoff, crmHandoffResponseSchema } from "../src/crm-handoff";
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
    status: "qualified",
    score: 82,
    lastTouchpoint: "Evidence reviewed",
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
    meetings: [],
    ...overrides,
  };
}

describe("CRM handoff", () => {
  it("builds a manual CRM export with conversion and value context", () => {
    const handoff = crmHandoffResponseSchema.parse(
      buildCrmHandoff({
        dashboard: dashboard({
          leads: [lead({ status: "won" })],
          meetings: [meeting()],
        }),
        generatedAt: now,
      }),
    );

    expect(handoff.surface).toBe("crm-handoff");
    expect(handoff.summary).toMatchObject({
      totalRecords: 1,
      closedWonCount: 1,
      openPipelineCount: 0,
      valueCapturedCents: 1200000,
      currency: "USD",
    });
    expect(handoff.records[0]).toMatchObject({
      leadId: "lead-1",
      crmStage: "closed_won",
      latestMeetingStatus: "completed",
      actualValueCents: 1200000,
      nextAction: "Import as closed-won and reconcile value with billing or accounting when configured.",
    });
    expect(handoff.metrics.find((metric) => metric.id === "captured-value")).toMatchObject({
      value: "$12,000",
      tone: "good",
    });
    expect(handoff.csv.filename).toBe("growth-os-crm-handoff.csv");
    expect(handoff.csv.content).toContain('"Lead ID","Full name","Company"');
    expect(handoff.guardrails).toContain(
      "CRM handoff is a manual export; no external CRM records are created or mutated.",
    );
  });

  it("escapes formula-like CSV values before spreadsheet download", () => {
    const handoff = buildCrmHandoff({
      dashboard: dashboard({
        leads: [
          lead({
            fullName: "=IMPORTXML(\"https://example.com\")",
            company: "@Acme",
            email: undefined,
            phone: undefined,
          }),
        ],
      }),
      generatedAt: now,
    });

    expect(handoff.summary.missingContactCount).toBe(1);
    expect(handoff.records[0]).toMatchObject({
      crmStage: "qualified",
      nextAction: "Add reliable contact data before outreach or CRM import.",
    });
    expect(handoff.csv.content).toContain('"\'=IMPORTXML(""https://example.com"")"');
    expect(handoff.csv.content).toContain('"\'@Acme"');
  });

  it("maps new and lost leads to CRM-safe stages", () => {
    const handoff = buildCrmHandoff({
      dashboard: dashboard({
        leads: [
          lead({ id: "lead-new", status: "new", score: 30 }),
          lead({ id: "lead-lost", status: "lost", score: 90 }),
        ],
      }),
      generatedAt: now,
    });

    expect(handoff.records.map((record) => record.crmStage)).toEqual([
      "prospect",
      "closed_lost",
    ]);
    expect(handoff.summary.openPipelineCount).toBe(1);
  });
});
