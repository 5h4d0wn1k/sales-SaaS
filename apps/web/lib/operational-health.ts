import type { AuditLogEvent, AuditLogResponse, DashboardResponse } from "@sales/shared";
import type { DashboardCockpitTone } from "./dashboard-cockpit";

export type OperationalHealthSignalId =
  | "dispatch-review"
  | "provider-webhooks"
  | "approval-queue"
  | "api-failures";

export type OperationalHealthSignal = {
  id: OperationalHealthSignalId;
  label: string;
  value: string;
  detail: string;
  tone: DashboardCockpitTone;
  href: string;
  evidence: string[];
};

export type OperationalHealthMetric = {
  label: string;
  value: string;
};

export type OperationalHealthModel = {
  posture: DashboardCockpitTone;
  label: string;
  title: string;
  summary: string;
  latestEvidenceAt: string | null;
  metrics: OperationalHealthMetric[];
  signals: OperationalHealthSignal[];
  guardrails: string[];
};

type OperationalHealthInput = {
  dashboard: Pick<DashboardResponse, "activities" | "calls" | "campaigns" | "meetings">;
  auditLog: AuditLogResponse | null;
  pendingProposalCount: number;
  highRiskProposalCount: number;
  canReviewProposals: boolean;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function textForEvent(event: AuditLogEvent) {
  return [event.eventType, event.summary, ...event.evidence].join(" ").toLowerCase();
}

function statusCodeForEvent(event: AuditLogEvent) {
  for (const item of event.evidence) {
    const match = /^status\s+(\d{3})$/i.exec(item.trim());

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

function eventEvidenceLabel(event: AuditLogEvent) {
  const statusCode = statusCodeForEvent(event);
  const status = statusCode ? `status ${statusCode}` : event.severity;

  return `${event.eventType} (${status})`;
}

function providerEvents(events: AuditLogEvent[]) {
  return events.filter((event) =>
    /provider|webhook|stripe|razorpay|resend|twilio|telegram/.test(textForEvent(event)),
  );
}

function worstTone(signals: OperationalHealthSignal[], auditLog: AuditLogResponse | null) {
  if (signals.some((signal) => signal.tone === "blocked")) {
    return "blocked" as const;
  }

  if (signals.some((signal) => signal.tone === "warn")) {
    return "warn" as const;
  }

  if (!auditLog || signals.some((signal) => signal.tone === "neutral")) {
    return "neutral" as const;
  }

  return "good" as const;
}

export function buildOperationalHealth(input: OperationalHealthInput): OperationalHealthModel {
  const events = input.auditLog?.events ?? [];
  const reviewActivities = input.dashboard.activities.filter(
    (activity) => activity.status === "review_required",
  ).length;
  const reviewCalls = input.dashboard.calls.filter(
    (call) => call.reviewRequired || call.status === "review_required",
  ).length;
  const dispatchReviewBlockers = reviewActivities + reviewCalls;
  const readyCampaigns = input.dashboard.campaigns.filter(
    (campaign) =>
      (campaign.stage === "approved" || campaign.stage === "running") &&
      campaign.approved &&
      !campaign.firstActionCompleted,
  ).length;
  const openMeetings = input.dashboard.meetings.filter(
    (meeting) => meeting.status === "pending" || meeting.status === "scheduled",
  ).length;

  const integrationEvents = providerEvents(events);
  const providerFailureEvents = integrationEvents.filter((event) => {
    const code = statusCodeForEvent(event);

    return code !== null && code >= 400;
  });
  const unverifiedProviderEvents = integrationEvents.filter((event) =>
    event.evidence.some((item) => item.toLowerCase() === "unverified provider event"),
  );
  const verifiedProviderEvents = integrationEvents.filter((event) =>
    event.evidence.some((item) => item.toLowerCase() === "verified provider event"),
  );
  const providerIssueEvents = Array.from(
    new Map(
      [...providerFailureEvents, ...unverifiedProviderEvents].map((event) => [
        event.id,
        event,
      ]),
    ).values(),
  );

  const apiEvents = events.filter((event) => event.eventType.startsWith("api."));
  const apiFailureEvents = apiEvents.filter((event) => {
    const code = statusCodeForEvent(event);

    return code !== null && code >= 400;
  });
  const apiServerFailureEvents = apiFailureEvents.filter((event) => {
    const code = statusCodeForEvent(event);

    return code !== null && code >= 500;
  });

  const signals: OperationalHealthSignal[] = [
    {
      id: "dispatch-review",
      label: "Dispatch review",
      value: String(dispatchReviewBlockers),
      tone:
        dispatchReviewBlockers > 0
          ? "blocked"
          : readyCampaigns > 0 || openMeetings > 0
            ? "good"
            : "neutral",
      href: "/dashboard#outreach-operations",
      detail:
        dispatchReviewBlockers > 0
          ? `${pluralize(dispatchReviewBlockers, "review gate")} must be resolved before live follow-through.`
          : readyCampaigns > 0
            ? `${pluralize(readyCampaigns, "approved campaign")} can move only through guarded dispatch controls.`
            : openMeetings > 0
              ? "Meeting follow-through is visible and no dispatch review blocker is open."
              : "No live dispatch lane is active in the current dashboard sample.",
      evidence: [
        `${pluralize(reviewActivities, "activity")} requiring review`,
        `${pluralize(reviewCalls, "call")} requiring review`,
      ],
    },
    {
      id: "provider-webhooks",
      label: "Provider and webhooks",
      value: String(providerIssueEvents.length),
      tone:
        providerIssueEvents.length > 0
          ? "blocked"
          : verifiedProviderEvents.length > 0 || integrationEvents.length > 0
            ? "good"
            : input.auditLog
              ? "neutral"
              : "warn",
      href: "/settings#integrations",
      detail:
        providerIssueEvents.length > 0
          ? `${pluralize(providerIssueEvents.length, "provider/webhook issue")} appears in recent sanitized audit evidence.`
          : verifiedProviderEvents.length > 0
            ? `${pluralize(verifiedProviderEvents.length, "verified provider event")} is visible in recent audit evidence.`
            : integrationEvents.length > 0
              ? "Provider-related evidence is visible without a recorded failure status."
              : "No recent provider or webhook evidence is visible in the sanitized audit sample.",
      evidence: providerIssueEvents.slice(0, 3).map(eventEvidenceLabel),
    },
    {
      id: "approval-queue",
      label: "Approval queue",
      value: String(input.pendingProposalCount),
      tone:
        input.pendingProposalCount === 0
          ? "good"
          : input.highRiskProposalCount > 0 || !input.canReviewProposals
            ? "blocked"
            : "warn",
      href: "/dashboard#approval-inbox",
      detail:
        input.pendingProposalCount === 0
          ? "No action proposal is waiting for an owner decision."
          : input.canReviewProposals
            ? `${pluralize(input.pendingProposalCount, "proposal")} needs review before sensitive work can proceed.`
            : "Owner/admin access with verified email is required before pending proposals can move.",
      evidence: [
        `${pluralize(input.highRiskProposalCount, "high-risk proposal")}`,
        input.canReviewProposals ? "reviewer eligible" : "reviewer not eligible",
      ],
    },
    {
      id: "api-failures",
      label: "API failures",
      value: String(apiFailureEvents.length),
      tone:
        apiServerFailureEvents.length > 0
          ? "blocked"
          : apiFailureEvents.length > 0
            ? "warn"
            : apiEvents.length > 0 || (input.auditLog?.summary.requestCount ?? 0) > 0
              ? "good"
              : input.auditLog
                ? "neutral"
                : "warn",
      href: "/dashboard",
      detail:
        apiServerFailureEvents.length > 0
          ? `${pluralize(apiServerFailureEvents.length, "server failure")} is present in the recent API audit sample.`
          : apiFailureEvents.length > 0
            ? `${pluralize(apiFailureEvents.length, "API request")} returned a non-success status and needs review.`
            : apiEvents.length > 0 || (input.auditLog?.summary.requestCount ?? 0) > 0
              ? "Recent API audit evidence is present without a recorded failure status."
              : "No API request evidence is visible in the recent audit sample.",
      evidence: apiFailureEvents.slice(0, 3).map(eventEvidenceLabel),
    },
  ];

  const posture = worstTone(signals, input.auditLog);
  const blockedCount = signals.filter((signal) => signal.tone === "blocked").length;
  const warningCount = signals.filter((signal) => signal.tone === "warn").length;
  const label =
    posture === "blocked"
      ? "blocked"
      : posture === "warn"
        ? "needs review"
        : posture === "neutral"
          ? "needs evidence"
          : "healthy";
  const title =
    posture === "blocked"
      ? "Operational blockers visible"
      : posture === "warn"
        ? "Operational health needs review"
        : posture === "neutral"
          ? "Operational evidence is thin"
          : "Operational health is clear";
  const summary =
    posture === "blocked"
      ? `${pluralize(blockedCount, "blocked lane")} found across dispatch, provider, approval, or API evidence.`
      : posture === "warn"
        ? `${pluralize(warningCount, "lane")} needs operator review from the recent evidence sample.`
        : posture === "neutral"
          ? "Recent sanitized evidence is not broad enough to confirm every operational lane."
          : "Recent workflow, approval, provider, and API evidence does not show an open blocker.";

  return {
    posture,
    label,
    title,
    summary,
    latestEvidenceAt: input.auditLog?.summary.latestEventAt ?? null,
    metrics: [
      { label: "Dispatch blockers", value: String(dispatchReviewBlockers) },
      {
        label: "Webhook/provider issues",
        value: String(providerIssueEvents.length),
      },
      { label: "Pending approvals", value: String(input.pendingProposalCount) },
      { label: "API failures", value: String(apiFailureEvents.length) },
    ],
    signals,
    guardrails: [
      "Health is based on recent sanitized dashboard and audit evidence only.",
      "Provider consoles, logs, billing systems, and database monitoring remain the systems of record for incidents.",
      "This panel does not retry provider work, mutate approvals, or replace production alerting.",
    ],
  };
}
