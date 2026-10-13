import { z } from "zod";
import {
  dashboardResponseSchema,
  leadStatusSchema,
  type DashboardResponse,
  type LeadRecord,
  type MeetingRecord,
} from "./domain";

export const conversionBriefToneSchema = z.enum(["good", "warn", "blocked", "neutral"]);
export const conversionBriefPostureSchema = z.enum([
  "blocked",
  "needs_follow_up",
  "pipeline_ready",
  "healthy",
]);

export const conversionBriefMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: conversionBriefToneSchema,
});

export const conversionBriefActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  urgency: conversionBriefToneSchema,
  href: z.string(),
  evidence: z.array(z.string()),
});

export const conversionBriefLeadFocusSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  company: z.string().nullable(),
  status: leadStatusSchema,
  score: z.number().int().min(0).max(100),
  contact: z.string(),
  reason: z.string(),
  recommendedAction: z.string(),
  href: z.string(),
});

export const conversionBriefResponseSchema = z.object({
  surface: z.literal("conversion-brief"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: conversionBriefPostureSchema,
  title: z.string(),
  summary: z.string(),
  metrics: z.array(conversionBriefMetricSchema),
  nextActions: z.array(conversionBriefActionSchema),
  leadFocus: z.array(conversionBriefLeadFocusSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ConversionBriefTone = z.infer<typeof conversionBriefToneSchema>;
export type ConversionBriefPosture = z.infer<typeof conversionBriefPostureSchema>;
export type ConversionBriefResponse = z.infer<typeof conversionBriefResponseSchema>;

const conversionReadyLeadStatuses = new Set<LeadRecord["status"]>([
  "qualified",
  "contacted",
  "meeting_booked",
]);
const openMeetingStatuses = new Set<MeetingRecord["status"]>(["pending", "scheduled"]);

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function leadContactLabel(lead: LeadRecord) {
  return lead.phone ?? lead.email ?? "No direct contact recorded";
}

function leadFocusReason(lead: LeadRecord) {
  if (lead.status === "meeting_booked") {
    return "Meeting intent exists but no open meeting is recorded.";
  }

  if (lead.status === "contacted") {
    return "Lead has outreach history and no open meeting is recorded.";
  }

  return "Qualified lead has no open meeting recorded.";
}

function leadRecommendedAction(lead: LeadRecord) {
  if (lead.phone) {
    return "Schedule a conversion meeting or review the call path.";
  }

  if (lead.email) {
    return "Schedule a manual meeting handoff after operator-reviewed follow-up.";
  }

  return "Complete contact data before outreach or meeting scheduling.";
}

function sortConversionLeads(a: LeadRecord, b: LeadRecord) {
  const statusRank: Record<LeadRecord["status"], number> = {
    meeting_booked: 0,
    contacted: 1,
    qualified: 2,
    new: 3,
    won: 4,
    lost: 5,
  };

  const statusDelta = statusRank[a.status] - statusRank[b.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  return b.score - a.score;
}

export function buildConversionBrief(input: {
  dashboard: DashboardResponse;
  generatedAt?: string;
}): ConversionBriefResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const openMeetingLeadIds = new Set(
    dashboard.meetings
      .filter((meeting) => openMeetingStatuses.has(meeting.status))
      .map((meeting) => meeting.leadId),
  );
  const meetingCandidateLeads = dashboard.leads
    .filter(
      (lead) => conversionReadyLeadStatuses.has(lead.status) && !openMeetingLeadIds.has(lead.id),
    )
    .sort(sortConversionLeads);
  const openMeetings = dashboard.meetings.filter((meeting) =>
    openMeetingStatuses.has(meeting.status),
  );
  const completedMeetings = dashboard.meetings.filter(
    (meeting) => meeting.status === "completed",
  );
  const canceledMeetings = dashboard.meetings.filter((meeting) => meeting.status === "canceled");
  const callsNeedingReview = dashboard.calls.filter(
    (call) => call.reviewRequired || call.status === "review_required",
  );
  const wonLeads = dashboard.leads.filter((lead) => lead.status === "won");
  const noDirectContactCandidates = meetingCandidateLeads.filter(
    (lead) => !lead.phone && !lead.email,
  );

  const nextActions: ConversionBriefResponse["nextActions"] = [
    ...(callsNeedingReview.length > 0
      ? [
          {
            id: "review-calls",
            label: "Review blocked calls",
            detail: `${pluralize(
              callsNeedingReview.length,
              "call",
            )} needs operator review before live voice follow-through.`,
            urgency: "blocked" as const,
            href: "/dashboard#calls-and-meetings",
            evidence: ["/v1/dashboard", "/v1/calls/:id/review"],
          },
        ]
      : []),
    ...(meetingCandidateLeads.length > 0
      ? [
          {
            id: "schedule-meetings",
            label: "Schedule manual meetings",
            detail: `${pluralize(
              meetingCandidateLeads.length,
              "lead",
            )} ready for a conversion handoff with no open meeting recorded.`,
            urgency: "warn" as const,
            href: "/dashboard#calls-and-meetings",
            evidence: ["/v1/dashboard", "/v1/meetings"],
          },
        ]
      : []),
    ...(openMeetings.length > 0
      ? [
          {
            id: "capture-meeting-outcomes",
            label: "Capture meeting outcomes",
            detail: `${pluralize(
              openMeetings.length,
              "meeting",
            )} is still pending or scheduled and should be resolved after the call.`,
            urgency: "warn" as const,
            href: "/dashboard#calls-and-meetings",
            evidence: ["/v1/dashboard", "/v1/meetings/:id"],
          },
        ]
      : []),
    ...(noDirectContactCandidates.length > 0
      ? [
          {
            id: "complete-contact-data",
            label: "Complete contact data",
            detail: `${pluralize(
              noDirectContactCandidates.length,
              "meeting candidate",
            )} missing email or phone data.`,
            urgency: "warn" as const,
            href: "/dashboard#leads",
            evidence: ["/v1/dashboard"],
          },
        ]
      : []),
  ];

  if (nextActions.length === 0) {
    nextActions.push({
      id: "grow-next-pipeline",
      label: "Grow next pipeline",
      detail:
        wonLeads.length > 0
          ? `${pluralize(wonLeads.length, "won lead")} is recorded. Reinvest outcomes into sourcing and outreach planning.`
          : "No conversion blockers are open. Add qualified leads before scheduling meetings.",
      urgency: "good",
      href: "/dashboard#lead-collection",
      evidence: ["/v1/dashboard"],
    });
  }

  const posture: ConversionBriefPosture =
    callsNeedingReview.length > 0
      ? "blocked"
      : openMeetings.length > 0
        ? "needs_follow_up"
        : meetingCandidateLeads.length > 0
          ? "pipeline_ready"
          : "healthy";
  const title =
    posture === "blocked"
      ? "Conversion follow-through blocked"
      : posture === "needs_follow_up"
        ? "Meeting outcomes need follow-through"
        : posture === "pipeline_ready"
          ? "Pipeline ready for meeting handoff"
          : "Conversion loop clear";

  return conversionBriefResponseSchema.parse({
    surface: "conversion-brief",
    version: "2026-06-04.conversion-brief",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title,
    summary:
      `${pluralize(meetingCandidateLeads.length, "meeting candidate")} ready, ` +
      `${pluralize(openMeetings.length, "open meeting")} active, ` +
      `${pluralize(callsNeedingReview.length, "call")} needing review.`,
    metrics: [
      {
        id: "meeting-candidates",
        label: "Meeting candidates",
        value: String(meetingCandidateLeads.length),
        detail: `${pluralize(
          meetingCandidateLeads.length,
          "lead",
        )} qualified, contacted, or meeting-booked without an open meeting.`,
        tone: meetingCandidateLeads.length > 0 ? "warn" : "good",
      },
      {
        id: "open-meetings",
        label: "Open meetings",
        value: String(openMeetings.length),
        detail: `${pluralize(openMeetings.length, "meeting")} pending or scheduled.`,
        tone: openMeetings.length > 0 ? "warn" : "good",
      },
      {
        id: "calls-needing-review",
        label: "Calls needing review",
        value: String(callsNeedingReview.length),
        detail: `${pluralize(callsNeedingReview.length, "call")} blocked from live follow-through.`,
        tone: callsNeedingReview.length > 0 ? "blocked" : "good",
      },
      {
        id: "closed-won",
        label: "Closed won",
        value: String(wonLeads.length),
        detail: `${pluralize(wonLeads.length, "won lead")} and ${pluralize(
          completedMeetings.length,
          "completed meeting",
        )}; ${pluralize(canceledMeetings.length, "canceled meeting")}.`,
        tone: wonLeads.length > 0 || completedMeetings.length > 0 ? "good" : "neutral",
      },
    ],
    nextActions,
    leadFocus: meetingCandidateLeads.slice(0, 5).map((lead) => ({
      id: lead.id,
      fullName: lead.fullName,
      company: lead.company ?? null,
      status: lead.status,
      score: lead.score,
      contact: leadContactLabel(lead),
      reason: leadFocusReason(lead),
      recommendedAction: leadRecommendedAction(lead),
      href: "/dashboard#leads",
    })),
    guardrails: [
      "Read-only conversion brief; no scheduling, outreach, or provider work is performed.",
      "Meeting creation and outcome changes stay operator-driven from the dashboard.",
      "Call review, suppression, entitlement, and role gates still apply before live outreach.",
      "Calendar-provider automation and autonomous conversion remain roadmap.",
    ],
    unavailableClaims: [
      "Autonomous calendar scheduling and guaranteed lead conversion are not available.",
      "The platform does not auto-contact leads or mark outcomes without operator action.",
      "Provider-specific CRM and calendar sync remains roadmap unless explicitly configured.",
    ],
  });
}
