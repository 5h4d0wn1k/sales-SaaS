import type { ConversionWorkQueueItem, ConversionWorkQueueResponse } from "@sales/shared";
import type { DashboardCockpitTone } from "./dashboard-cockpit";

export type ConversionFollowUpLane = {
  id: "review_gates" | "meeting_follow_up" | "handoff" | "value_capture";
  label: string;
  value: string;
  detail: string;
  tone: DashboardCockpitTone;
};

export type ConversionFollowUpInsight = {
  label: string;
  tone: DashboardCockpitTone;
  headline: string;
  detail: string;
  riskSummary: string;
  primaryAction: {
    label: string;
    title: string;
    detail: string;
    dueLabel: string;
    href: string;
  } | null;
  lanes: ConversionFollowUpLane[];
  guardrailSummary: string;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function labelForPosture(posture: ConversionWorkQueueResponse["posture"]) {
  return posture.replace(/_/g, " ");
}

function toneForQueue(queue: ConversionWorkQueueResponse): DashboardCockpitTone {
  return queue.posture === "blocked"
    ? "blocked"
    : queue.posture === "overdue" || queue.posture === "ready"
      ? "warn"
      : "good";
}

function actionLabel(item: ConversionWorkQueueItem) {
  const labels: Record<ConversionWorkQueueItem["type"], string> = {
    call_review: "Review call",
    meeting_outcome: "Save outcome",
    meeting_prep: "Prepare meeting",
    schedule_meeting: "Schedule meeting",
    recover_meeting: "Recover record",
    complete_contact: "Complete contact",
    record_value: "Record value",
  };

  return labels[item.type];
}

function laneTone(count: number, activeTone: DashboardCockpitTone, emptyTone: DashboardCockpitTone) {
  return count > 0 ? activeTone : emptyTone;
}

export function buildConversionFollowUpInsight(
  queue: ConversionWorkQueueResponse,
): ConversionFollowUpInsight {
  const reviewGateCount = queue.items.filter((item) => item.type === "call_review").length;
  const meetingOutcomeCount = queue.items.filter((item) => item.type === "meeting_outcome").length;
  const meetingPrepCount = queue.items.filter((item) => item.type === "meeting_prep").length;
  const handoffCount = queue.items.filter(
    (item) =>
      item.type === "schedule_meeting" ||
      item.type === "recover_meeting" ||
      item.type === "complete_contact",
  ).length;
  const valueCaptureCount = queue.items.filter((item) => item.type === "record_value").length;
  const blockedCount = queue.items.filter((item) => item.urgency === "blocked").length;
  const highCount = queue.items.filter((item) => item.urgency === "high").length;
  const topItem = queue.items[0] ?? null;

  const lanes: ConversionFollowUpLane[] = [
    {
      id: "review_gates",
      label: "Review gates",
      value: String(reviewGateCount),
      detail:
        reviewGateCount > 0
          ? `${pluralize(reviewGateCount, "call")} must be reviewed before live follow-through.`
          : "No call review blocker is holding the conversion path.",
      tone: laneTone(reviewGateCount, "blocked", "good"),
    },
    {
      id: "meeting_follow_up",
      label: "Meeting follow-up",
      value: String(meetingOutcomeCount + meetingPrepCount),
      detail:
        meetingOutcomeCount > 0
          ? `${pluralize(meetingOutcomeCount, "meeting outcome")} needs owner resolution.`
          : meetingPrepCount > 0
            ? `${pluralize(meetingPrepCount, "meeting")} should be prepared or confirmed.`
            : "No open meeting follow-up task is waiting.",
      tone: laneTone(meetingOutcomeCount + meetingPrepCount, "warn", "good"),
    },
    {
      id: "handoff",
      label: "Handoffs",
      value: String(handoffCount),
      detail:
        handoffCount > 0
          ? `${pluralize(handoffCount, "lead")} needs contact completion, scheduling, or record recovery.`
          : "No conversion-ready lead is waiting for a manual handoff.",
      tone: laneTone(handoffCount, "warn", "neutral"),
    },
    {
      id: "value_capture",
      label: "Value capture",
      value: String(valueCaptureCount),
      detail:
        valueCaptureCount > 0
          ? `${pluralize(valueCaptureCount, "closed meeting")} needs actual value recorded.`
          : "Closed value records are aligned with the visible conversion queue.",
      tone: laneTone(valueCaptureCount, "warn", "good"),
    },
  ];

  const headline =
    queue.posture === "blocked"
      ? "Resolve review gates before follow-up"
      : queue.posture === "overdue"
        ? "Meeting outcomes are aging"
        : queue.posture === "ready"
          ? "Next conversion move is ready"
          : "Conversion loop is clear";
  const detail =
    queue.posture === "blocked"
      ? "Operator review is required before calls, meetings, or value updates should advance."
      : queue.posture === "overdue"
        ? "Capture completed or canceled outcomes so the lead state and revenue forecast stay reliable."
        : queue.posture === "ready"
          ? "Use the first prioritized task as the next manual move; provider work remains gated."
          : "No conversion task is open. Keep source evidence and outreach feeding the next meeting path.";
  const riskSummary =
    queue.posture === "blocked"
      ? `${pluralize(blockedCount, "blocked task")} and ${pluralize(
          highCount,
          "high-priority task",
        )} require review.`
      : queue.posture === "overdue"
        ? `${pluralize(meetingOutcomeCount, "meeting outcome")} is overdue or missing a confirmed time.`
        : queue.posture === "ready"
          ? `${pluralize(queue.items.length, "operator task")} can move without autonomous outreach.`
          : "No visible conversion risk is open in the current queue.";

  return {
    label: labelForPosture(queue.posture),
    tone: toneForQueue(queue),
    headline,
    detail,
    riskSummary,
    primaryAction: topItem
      ? {
          label: actionLabel(topItem),
          title: topItem.title,
          detail: topItem.suggestedAction,
          dueLabel: topItem.dueLabel,
          href: topItem.href,
        }
      : null,
    lanes,
    guardrailSummary:
      queue.guardrails[0] ??
      "Conversion follow-up remains read-only until an operator uses the dashboard controls.",
  };
}
