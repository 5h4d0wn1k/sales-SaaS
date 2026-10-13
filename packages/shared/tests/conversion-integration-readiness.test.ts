import { describe, expect, it } from "vitest";
import {
  buildConversionIntegrationReadiness,
  conversionIntegrationReadinessResponseSchema,
} from "../src/conversion-integration-readiness";
import type {
  DashboardResponse,
  LeadRecord,
  MeetingRecord,
} from "../src/domain";

const now = "2026-06-05T12:00:00.000Z";

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "lead-1",
    fullName: "Nina Carter",
    email: "nina@example.com",
    phone: "+15550101010",
    company: "VectrCloud",
    source: "manual",
    status: "won",
    score: 88,
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

function dashboard(
  overrides: Partial<DashboardResponse> = {},
): DashboardResponse {
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
    meetings: [
      meeting(),
      meeting({
        id: "meeting-2",
        status: "scheduled",
        scheduledFor: "2026-06-06T10:00:00.000Z",
        dealValueCents: 0,
      }),
    ],
    ...overrides,
  };
}

describe("conversion integration readiness", () => {
  it("keeps live conversion integrations guarded when only manual handoffs exist", () => {
    const readiness = conversionIntegrationReadinessResponseSchema.parse(
      buildConversionIntegrationReadiness({
        dashboard: dashboard(),
        generatedAt: now,
      }),
    );

    expect(readiness).toMatchObject({
      surface: "conversion-integration-readiness",
      posture: "guarded",
      summary: {
        crmRecords: 1,
        readyCalendarMeetings: 1,
        completedMeetings: 1,
        valuedMeetings: 1,
        actualValueCents: 1200000,
        configuredControls: 0,
      },
    });
    expect(
      readiness.controls.find((control) => control.id === "crm_sync"),
    ).toMatchObject({
      status: "needs_review",
      blockers: expect.arrayContaining([
        "External CRM sync is not configured for this deployment.",
        "CRM field mapping policy is not configured for this deployment.",
      ]),
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "invoice_payment_matching",
      ),
    ).toMatchObject({
      status: "needs_review",
      evidence: expect.arrayContaining(["$12,000 recorded closed value"]),
    });
    expect(readiness.unavailableClaims.join(" ")).toContain(
      "Live accounting sync",
    );
  });

  it("blocks sync readiness when contact and closed-value evidence is incomplete", () => {
    const readiness = buildConversionIntegrationReadiness({
      dashboard: dashboard({
        leads: [lead({ email: undefined, phone: undefined })],
        meetings: [meeting({ dealValueCents: 0 })],
      }),
      config: {
        crmSyncConfigured: true,
        crmFieldMappingConfigured: true,
        accountingSyncConfigured: true,
        revenueRecognitionPolicyConfigured: true,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("blocked");
    expect(
      readiness.controls.find((control) => control.id === "crm_sync"),
    ).toMatchObject({
      status: "blocked",
      blockers: expect.arrayContaining([
        "CRM handoff still contains records missing email and phone data.",
      ]),
    });
    expect(
      readiness.controls.find((control) => control.id === "accounting_sync"),
    ).toMatchObject({
      status: "blocked",
      blockers: expect.arrayContaining([
        "Completed meetings still need actual contract value before accounting sync.",
      ]),
    });
  });

  it("marks all controls ready when integration config and evidence are complete", () => {
    const readiness = buildConversionIntegrationReadiness({
      dashboard: dashboard(),
      config: {
        crmSyncConfigured: true,
        crmFieldMappingConfigured: true,
        calendarSyncConfigured: true,
        calendarAvailabilityConfigured: true,
        accountingSyncConfigured: true,
        revenueRecognitionPolicyConfigured: true,
        invoiceMatchingConfigured: true,
        paymentReconciliationConfigured: true,
      },
      generatedAt: now,
    });

    expect(readiness.posture).toBe("ready");
    expect(readiness.summary.configuredControls).toBe(4);
    expect(readiness.summary.blockedControls).toBe(0);
    expect(readiness.controls.map((control) => control.status)).toEqual([
      "ready",
      "ready",
      "ready",
      "ready",
    ]);
  });
});
