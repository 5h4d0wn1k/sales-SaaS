import { z } from "zod";
import {
  dashboardResponseSchema,
  leadStatusSchema,
  type CallRecord,
  type DashboardResponse,
  type LeadRecord,
  type MeetingRecord,
} from "./domain";

export const conversionWorkQueueUrgencySchema = z.enum(["blocked", "high", "medium", "low"]);
export const conversionWorkQueuePostureSchema = z.enum([
  "blocked",
  "overdue",
  "ready",
  "clear",
]);
export const conversionWorkQueueItemTypeSchema = z.enum([
  "call_review",
  "meeting_outcome",
  "meeting_prep",
  "schedule_meeting",
  "recover_meeting",
  "complete_contact",
  "record_value",
]);
export const conversionWorkQueueToneSchema = z.enum(["good", "warn", "blocked", "neutral"]);

export const conversionWorkQueueMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: conversionWorkQueueToneSchema,
});

export const conversionWorkQueueLeadSubjectSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  company: z.string().nullable(),
  status: leadStatusSchema,
  score: z.number().int().min(0).max(100),
  contact: z.string(),
});

export const conversionWorkQueueItemSchema = z.object({
  id: z.string(),
  type: conversionWorkQueueItemTypeSchema,
  title: z.string(),
  detail: z.string(),
  urgency: conversionWorkQueueUrgencySchema,
  dueAt: z.string().nullable(),
  dueLabel: z.string(),
  owner: z.string().nullable(),
  suggestedAction: z.string(),
  href: z.string(),
  lead: conversionWorkQueueLeadSubjectSchema.nullable(),
  relatedRecord: z.object({
    kind: z.enum(["lead", "meeting", "call"]),
    id: z.string(),
  }),
  evidence: z.array(z.string()),
});

export const conversionWorkQueueResponseSchema = z.object({
  surface: z.literal("conversion-work-queue"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: conversionWorkQueuePostureSchema,
  title: z.string(),
  summary: z.string(),
  metrics: z.array(conversionWorkQueueMetricSchema),
  items: z.array(conversionWorkQueueItemSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ConversionWorkQueueUrgency = z.infer<typeof conversionWorkQueueUrgencySchema>;
export type ConversionWorkQueuePosture = z.infer<typeof conversionWorkQueuePostureSchema>;
export type ConversionWorkQueueItemType = z.infer<typeof conversionWorkQueueItemTypeSchema>;
export type ConversionWorkQueueItem = z.infer<typeof conversionWorkQueueItemSchema>;
export type ConversionWorkQueueResponse = z.infer<typeof conversionWorkQueueResponseSchema>;

const openMeetingStatuses = new Set<MeetingRecord["status"]>(["pending", "scheduled"]);
const meetingCandidateStatuses = new Set<LeadRecord["status"]>([
  "qualified",
  "contacted",
  "meeting_booked",
]);
const oneDayMs = 24 * 60 * 60 * 1000;
const oneWeekMs = 7 * oneDayMs;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function verbForCount(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function parseTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function leadContactLabel(lead: LeadRecord | undefined) {
  if (!lead) {
    return "No lead record found";
  }

  return lead.phone ?? lead.email ?? "No direct contact recorded";
}

function leadName(lead: LeadRecord | undefined) {
  return lead?.fullName ?? "Unknown lead";
}

function leadSubject(lead: LeadRecord | undefined) {
  if (!lead) {
    return null;
  }

  return {
    id: lead.id,
    fullName: lead.fullName,
    company: lead.company ?? null,
    status: lead.status,
    score: lead.score,
    contact: leadContactLabel(lead),
  };
}

function formatDueLabel(timestamp: number | null, nowMs: number) {
  if (timestamp === null) {
    return "Confirm time";
  }

  const delta = timestamp - nowMs;
  const absoluteDays = Math.max(1, Math.ceil(Math.abs(delta) / oneDayMs));

  if (delta < 0) {
    return absoluteDays === 1 ? "Overdue today" : `Overdue ${absoluteDays} days`;
  }

  if (delta <= oneDayMs) {
    return "Due within 24h";
  }

  if (delta <= oneWeekMs) {
    return `Due in ${Math.ceil(delta / oneDayMs)} days`;
  }

  return "Scheduled later";
}

function urgencyRank(urgency: ConversionWorkQueueUrgency) {
  return urgency === "blocked" ? 0 : urgency === "high" ? 1 : urgency === "medium" ? 2 : 3;
}

function sortQueueItems(a: ConversionWorkQueueItem, b: ConversionWorkQueueItem) {
  const urgencyDelta = urgencyRank(a.urgency) - urgencyRank(b.urgency);
  if (urgencyDelta !== 0) {
    return urgencyDelta;
  }

  const aDue = a.dueAt ? parseTimestamp(a.dueAt) : null;
  const bDue = b.dueAt ? parseTimestamp(b.dueAt) : null;

  if (aDue !== null || bDue !== null) {
    if (aDue === null) {
      return 1;
    }
    if (bDue === null) {
      return -1;
    }
    if (aDue !== bDue) {
      return aDue - bDue;
    }
  }

  return (b.lead?.score ?? 0) - (a.lead?.score ?? 0);
}

export function buildConversionWorkQueue(input: {
  dashboard: DashboardResponse;
  generatedAt?: string;
}): ConversionWorkQueueResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const nowMs = parseTimestamp(generatedAt) ?? Date.now();
  const leadById = new Map(dashboard.leads.map((lead) => [lead.id, lead]));
  const openMeetings = dashboard.meetings.filter((meeting) =>
    openMeetingStatuses.has(meeting.status),
  );
  const openMeetingLeadIds = new Set(openMeetings.map((meeting) => meeting.leadId));
  const callsNeedingReview = dashboard.calls.filter(
    (call) => call.reviewRequired || call.status === "review_required",
  );
  const completedMeetingsWithoutValue = dashboard.meetings.filter(
    (meeting) => meeting.status === "completed" && meeting.dealValueCents === 0,
  );
  const meetingCandidateLeads = dashboard.leads
    .filter(
      (lead) => meetingCandidateStatuses.has(lead.status) && !openMeetingLeadIds.has(lead.id),
    )
    .sort((a, b) => {
      const statusRank: Record<LeadRecord["status"], number> = {
        meeting_booked: 0,
        contacted: 1,
        qualified: 2,
        new: 3,
        won: 4,
        lost: 5,
      };
      const statusDelta = statusRank[a.status] - statusRank[b.status];
      return statusDelta !== 0 ? statusDelta : b.score - a.score;
    });

  const meetingTiming = openMeetings.map((meeting) => {
    const timestamp = parseTimestamp(meeting.scheduledFor);
    return {
      meeting,
      timestamp,
      overdue: timestamp !== null && timestamp < nowMs,
      upcoming: timestamp !== null && timestamp >= nowMs && timestamp - nowMs <= oneDayMs,
    };
  });
  const overdueMeetingCount = meetingTiming.filter((item) => item.overdue).length;
  const upcomingMeetingCount = meetingTiming.filter((item) => item.upcoming).length;

  const items: ConversionWorkQueueItem[] = [
    ...callsNeedingReview.map((call: CallRecord) => {
      const lead = leadById.get(call.leadId);

      return {
        id: `call-review-${call.id}`,
        type: "call_review" as const,
        title: "Review call before follow-up",
        detail: `${leadName(lead)} has a call in review state: ${call.disposition}.`,
        urgency: "blocked" as const,
        dueAt: null,
        dueLabel: "Review required",
        owner: null,
        suggestedAction: "Resolve the call review before any next voice or meeting follow-through.",
        href: "/dashboard#calls-and-meetings",
        lead: leadSubject(lead),
        relatedRecord: {
          kind: "call" as const,
          id: call.id,
        },
        evidence: ["/v1/dashboard", "/v1/calls/:id/review"],
      };
    }),
    ...meetingTiming.map(({ meeting, timestamp, overdue, upcoming }) => {
      const lead = leadById.get(meeting.leadId);
      const needsTimeConfirmation = timestamp === null;
      const urgency: ConversionWorkQueueUrgency =
        overdue || needsTimeConfirmation ? "high" : upcoming ? "medium" : "low";
      const type: ConversionWorkQueueItemType =
        overdue || needsTimeConfirmation ? "meeting_outcome" : "meeting_prep";

      return {
        id: `${type}-${meeting.id}`,
        type,
        title:
          overdue || needsTimeConfirmation
            ? "Capture meeting outcome"
            : "Prepare upcoming meeting",
        detail:
          overdue || needsTimeConfirmation
            ? `${leadName(lead)} has an open meeting that needs an outcome or schedule confirmation.`
            : `${leadName(lead)} is scheduled with ${meeting.owner}; prepare context before the call.`,
        urgency,
        dueAt: timestamp === null ? null : meeting.scheduledFor,
        dueLabel: formatDueLabel(timestamp, nowMs),
        owner: meeting.owner,
        suggestedAction:
          overdue || needsTimeConfirmation
            ? "Record completed or canceled status, notes, and actual value when applicable."
            : "Review lead context, last touchpoint, and qualification notes before the meeting.",
        href: "/dashboard#calls-and-meetings",
        lead: leadSubject(lead),
        relatedRecord: {
          kind: "meeting" as const,
          id: meeting.id,
        },
        evidence: ["/v1/dashboard", "/v1/meetings/:id"],
      };
    }),
    ...completedMeetingsWithoutValue.map((meeting) => {
      const lead = leadById.get(meeting.leadId);

      return {
        id: `record-value-${meeting.id}`,
        type: "record_value" as const,
        title: "Record closed contract value",
        detail: `${leadName(lead)} is marked won, but the actual contract value is not recorded yet.`,
        urgency: "medium" as const,
        dueAt: meeting.scheduledFor,
        dueLabel: "Value missing",
        owner: meeting.owner,
        suggestedAction: "Enter the actual contract value so revenue forecast-to-actual stays useful.",
        href: "/dashboard#revenue-forecast",
        lead: leadSubject(lead),
        relatedRecord: {
          kind: "meeting" as const,
          id: meeting.id,
        },
        evidence: ["/v1/dashboard", "/v1/revenue/forecast", "/v1/meetings/:id"],
      };
    }),
    ...meetingCandidateLeads.map((lead) => {
      const missingContact = !lead.phone && !lead.email;
      const recoverMeeting = lead.status === "meeting_booked";
      const type: ConversionWorkQueueItemType = recoverMeeting
        ? "recover_meeting"
        : missingContact
          ? "complete_contact"
          : "schedule_meeting";
      const urgency: ConversionWorkQueueUrgency = recoverMeeting
        ? "high"
        : lead.status === "contacted" || lead.score >= 80
          ? "medium"
          : "low";

      return {
        id: `${type}-${lead.id}`,
        type,
        title: recoverMeeting
          ? "Recover missing meeting record"
          : missingContact
            ? "Complete contact data"
            : "Schedule conversion meeting",
        detail: recoverMeeting
          ? `${lead.fullName} is marked meeting booked, but no open meeting exists.`
          : missingContact
            ? `${lead.fullName} is ready for conversion work but lacks email or phone.`
            : `${lead.fullName} is ready for a manual conversion handoff.`,
        urgency,
        dueAt: null,
        dueLabel: recoverMeeting ? "Record needed" : "Ready now",
        owner: null,
        suggestedAction: recoverMeeting
          ? "Create or confirm the meeting record before the conversion state drifts."
          : missingContact
            ? "Add reliable contact details before outreach, calling, or scheduling."
            : "Schedule a manual meeting from the dashboard after operator review.",
        href: missingContact ? "/dashboard#leads" : "/dashboard#calls-and-meetings",
        lead: leadSubject(lead),
        relatedRecord: {
          kind: "lead" as const,
          id: lead.id,
        },
        evidence: ["/v1/dashboard", "/v1/meetings"],
      };
    }),
  ].sort(sortQueueItems);

  const posture: ConversionWorkQueuePosture =
    callsNeedingReview.length > 0
      ? "blocked"
      : overdueMeetingCount > 0
        ? "overdue"
        : items.length > 0
          ? "ready"
          : "clear";

  const title =
    posture === "blocked"
      ? "Conversion queue blocked"
      : posture === "overdue"
        ? "Meeting follow-up overdue"
        : posture === "ready"
          ? "Conversion work queue ready"
          : "Conversion queue clear";

  return conversionWorkQueueResponseSchema.parse({
    surface: "conversion-work-queue",
    version: "2026-06-04.conversion-work-queue",
    generatedAt,
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title,
    summary:
      `${pluralize(items.length, "conversion task")} prioritized from ` +
      `${pluralize(callsNeedingReview.length, "call blocker")}, ` +
      `${pluralize(openMeetings.length, "open meeting")}, and ` +
      `${pluralize(meetingCandidateLeads.length, "handoff candidate")}.`,
    metrics: [
      {
        id: "call-blockers",
        label: "Call blockers",
        value: String(callsNeedingReview.length),
        detail: `${pluralize(callsNeedingReview.length, "call")} ${verbForCount(
          callsNeedingReview.length,
          "requires",
          "require",
        )} review before live follow-through.`,
        tone: callsNeedingReview.length > 0 ? "blocked" : "good",
      },
      {
        id: "overdue-meetings",
        label: "Overdue outcomes",
        value: String(overdueMeetingCount),
        detail: `${pluralize(overdueMeetingCount, "meeting")} ${verbForCount(
          overdueMeetingCount,
          "is",
          "are",
        )} past scheduled time without a final outcome.`,
        tone: overdueMeetingCount > 0 ? "warn" : "good",
      },
      {
        id: "upcoming-meetings",
        label: "Due within 24h",
        value: String(upcomingMeetingCount),
        detail: `${pluralize(upcomingMeetingCount, "meeting")} should be prepared or confirmed within 24 hours.`,
        tone: upcomingMeetingCount > 0 ? "warn" : "neutral",
      },
      {
        id: "handoff-candidates",
        label: "Ready handoffs",
        value: String(meetingCandidateLeads.length),
        detail: `${pluralize(meetingCandidateLeads.length, "lead")} can move toward meeting follow-through.`,
        tone: meetingCandidateLeads.length > 0 ? "warn" : "good",
      },
      {
        id: "value-gaps",
        label: "Value gaps",
        value: String(completedMeetingsWithoutValue.length),
        detail: `${pluralize(completedMeetingsWithoutValue.length, "completed meeting")} ${verbForCount(
          completedMeetingsWithoutValue.length,
          "needs",
          "need",
        )} actual value for forecast accuracy.`,
        tone: completedMeetingsWithoutValue.length > 0 ? "warn" : "good",
      },
    ],
    items: items.slice(0, 12),
    guardrails: [
      "Read-only conversion work queue; no meeting, call, outreach, or provider state changes are performed.",
      "Dashboard forms still enforce owner/admin, verified-email, entitlement, suppression, and provider gates.",
      "Actual value capture remains operator-entered until CRM, billing, or accounting integrations are configured.",
      "Calendar-provider automation and autonomous scheduling remain roadmap.",
    ],
    unavailableClaims: [
      "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
      "CRM, calendar, billing, and accounting attribution sync remains roadmap unless separately configured.",
    ],
  });
}
