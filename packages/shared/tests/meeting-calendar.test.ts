import { describe, expect, it } from "vitest";
import {
  buildMeetingCalendarHandoff,
  meetingCalendarHandoffResponseSchema,
} from "../src/meeting-calendar";
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
    status: "meeting_booked",
    score: 82,
    lastTouchpoint: "Meeting created",
    rejectionReason: null,
    ...overrides,
  };
}

function meeting(overrides: Partial<MeetingRecord> = {}): MeetingRecord {
  return {
    id: "meeting-1",
    leadId: "lead-1",
    status: "scheduled",
    scheduledFor: "2026-06-05T10:00:00.000Z",
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

describe("meeting calendar handoff", () => {
  it("builds provider links and an ICS handoff for a scheduled meeting", () => {
    const handoff = meetingCalendarHandoffResponseSchema.parse(
      buildMeetingCalendarHandoff({
        dashboard: dashboard(),
        meetingId: "meeting-1",
        generatedAt: now,
      }),
    );

    expect(handoff.ready).toBe(true);
    expect(handoff.blockers).toEqual([]);
    expect(handoff.meeting).toMatchObject({
      id: "meeting-1",
      leadName: "Nina Carter",
      attendeeEmail: "nina@example.com",
      attendeePhone: "+15550101010",
      title: "Sales meeting: Nina Carter - Growth OS",
      location: "Phone: +15550101010",
    });
    expect(handoff.links.map((link) => link.provider)).toEqual([
      "google",
      "outlook",
      "office365",
    ]);
    expect(handoff.links[0].href).toContain("calendar.google.com/calendar/render");
    expect(handoff.ics?.filename).toBe("nina-carter-meeting-1.ics");
    expect(handoff.ics?.content).toContain("BEGIN:VCALENDAR");
    expect(handoff.ics?.content).toContain("DTSTART:20260605T100000Z");
    expect(handoff.ics?.content).toContain("DTEND:20260605T103000Z");
    expect(handoff.ics?.content).toContain("SUMMARY:Sales meeting: Nina Carter - Growth OS");
    expect(handoff.guardrails).toContain(
      "Calendar handoff is operator-triggered and does not auto-contact the lead.",
    );
  });

  it("blocks calendar links for completed meetings", () => {
    const handoff = buildMeetingCalendarHandoff({
      dashboard: dashboard({
        meetings: [
          meeting({
            status: "completed",
            dealValueCents: 1200000,
          }),
        ],
      }),
      meetingId: "meeting-1",
      generatedAt: now,
    });

    expect(handoff?.ready).toBe(false);
    expect(handoff?.links).toEqual([]);
    expect(handoff?.ics).toBeNull();
    expect(handoff?.blockers[0]).toContain("Meeting status is completed");
  });

  it("returns null when the meeting is not in the active dashboard snapshot", () => {
    expect(
      buildMeetingCalendarHandoff({
        dashboard: dashboard(),
        meetingId: "missing",
        generatedAt: now,
      }),
    ).toBeNull();
  });
});
