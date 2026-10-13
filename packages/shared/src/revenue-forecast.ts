import { z } from "zod";
import {
  dashboardResponseSchema,
  salesBlueprintSchema,
  type DashboardResponse,
  type LeadRecord,
  type SalesBlueprint,
} from "./domain";

export const revenueForecastToneSchema = z.enum(["good", "warn", "blocked", "neutral"]);
export const revenueForecastPostureSchema = z.enum([
  "blueprint_required",
  "target_gap",
  "needs_conversion",
  "on_track",
]);

export const revenueForecastMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: revenueForecastToneSchema,
});

export const revenueForecastStageSchema = z.object({
  id: z.string(),
  label: z.string(),
  leadCount: z.number().int().min(0),
  weight: z.number().min(0).max(1),
  estimatedValue: z.number().min(0),
  detail: z.string(),
  tone: revenueForecastToneSchema,
});

export const revenueForecastActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  urgency: revenueForecastToneSchema,
  href: z.string(),
  evidence: z.array(z.string()),
});

export const revenueForecastResponseSchema = z.object({
  surface: z.literal("revenue-forecast"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: revenueForecastPostureSchema,
  title: z.string(),
  summary: z.string(),
  assumptions: z.object({
    blueprintId: z.string().nullable(),
    averageContractValue: z.number().min(0),
    monthlyLeadTarget: z.number().int().min(0),
    meetingTarget: z.number().int().min(0),
    weightedPipelineValue: z.number().min(0),
    actualClosedValue: z.number().min(0),
    targetPipelineValue: z.number().min(0),
    targetCoveragePercent: z.number().int().min(0),
    model: z.string(),
  }),
  metrics: z.array(revenueForecastMetricSchema),
  stages: z.array(revenueForecastStageSchema),
  nextActions: z.array(revenueForecastActionSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type RevenueForecastTone = z.infer<typeof revenueForecastToneSchema>;
export type RevenueForecastPosture = z.infer<typeof revenueForecastPostureSchema>;
export type RevenueForecastResponse = z.infer<typeof revenueForecastResponseSchema>;

const stageWeights: Record<LeadRecord["status"], number> = {
  new: 0.05,
  qualified: 0.2,
  contacted: 0.35,
  meeting_booked: 0.55,
  won: 1,
  lost: 0,
};

const stageLabels: Record<LeadRecord["status"], string> = {
  new: "New",
  qualified: "Qualified",
  contacted: "Contacted",
  meeting_booked: "Meeting booked",
  won: "Closed won",
  lost: "Lost",
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.max(0, Math.round((numerator / denominator) * 100));
}

function stageTone(status: LeadRecord["status"], count: number): RevenueForecastTone {
  if (count === 0) {
    return "neutral";
  }

  if (status === "won") {
    return "good";
  }

  if (status === "lost") {
    return "blocked";
  }

  return status === "meeting_booked" || status === "contacted" ? "warn" : "neutral";
}

export function buildRevenueForecast(input: {
  dashboard: DashboardResponse;
  blueprint?: SalesBlueprint | null;
  generatedAt?: string;
}): RevenueForecastResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const blueprint = input.blueprint ? salesBlueprintSchema.parse(input.blueprint) : null;
  const averageContractValue = blueprint?.averageContractValue ?? 0;
  const monthlyLeadTarget = blueprint?.monthlyLeadTarget ?? 0;
  const meetingTarget = blueprint?.meetingTarget ?? 0;

  const leadCounts = dashboard.leads.reduce<Record<LeadRecord["status"], number>>(
    (counts, lead) => {
      counts[lead.status] += 1;
      return counts;
    },
    {
      new: 0,
      qualified: 0,
      contacted: 0,
      meeting_booked: 0,
      won: 0,
      lost: 0,
    },
  );
  const openMeetings = dashboard.meetings.filter(
    (meeting) => meeting.status === "pending" || meeting.status === "scheduled",
  ).length;
  const completedMeetings = dashboard.meetings.filter(
    (meeting) => meeting.status === "completed",
  );
  const valuedCompletedMeetings = completedMeetings.filter(
    (meeting) => meeting.dealValueCents > 0,
  );
  const actualClosedValue = valuedCompletedMeetings.reduce(
    (total, meeting) => total + meeting.dealValueCents / 100,
    0,
  );
  const unvaluedWonLeadCount = Math.max(0, leadCounts.won - valuedCompletedMeetings.length);
  const closedWonForecastValue = actualClosedValue + unvaluedWonLeadCount * averageContractValue;
  const callsNeedingReview = dashboard.calls.filter(
    (call) => call.reviewRequired || call.status === "review_required",
  ).length;
  const conversionReadyLeads =
    leadCounts.qualified + leadCounts.contacted + leadCounts.meeting_booked;
  const qualifiedPipelineLeads = conversionReadyLeads + leadCounts.won;
  const meetingProgress = openMeetings + completedMeetings.length + leadCounts.won;
  const weightedPipelineValue = dashboard.leads.reduce(
    (total, lead) =>
      lead.status === "won" ? total : total + averageContractValue * stageWeights[lead.status],
    0,
  ) + closedWonForecastValue;
  const targetPipelineValue = meetingTarget > 0 ? meetingTarget * averageContractValue * 0.55 : 0;
  const targetCoveragePercent = percent(weightedPipelineValue, targetPipelineValue);
  const leadTargetCoveragePercent = percent(qualifiedPipelineLeads, monthlyLeadTarget);
  const meetingTargetCoveragePercent = percent(meetingProgress, meetingTarget);
  const pipelineGapValue = Math.max(0, targetPipelineValue - weightedPipelineValue);
  const blueprintMissing = !blueprint || averageContractValue <= 0;
  const targetGap =
    !blueprintMissing &&
    (targetCoveragePercent < 75 ||
      leadTargetCoveragePercent < 50 ||
      meetingTargetCoveragePercent < 50);

  const stages = (["new", "qualified", "contacted", "meeting_booked", "won", "lost"] as const).map(
    (status) => ({
      id: status,
      label: stageLabels[status],
      leadCount: leadCounts[status],
      weight: stageWeights[status],
      estimatedValue:
        status === "won"
          ? closedWonForecastValue
          : leadCounts[status] * averageContractValue * stageWeights[status],
      detail:
        status === "won"
          ? actualClosedValue > 0
            ? "Uses recorded actual deal value first, then average contract value for unvalued wins."
            : "Uses average contract value until actual deal value is recorded."
          : status === "lost"
            ? "Excluded from forecast value after loss/cancelation."
            : `${pluralize(leadCounts[status], "lead")} at ${Math.round(
                stageWeights[status] * 100,
              )}% deterministic stage confidence.`,
      tone: stageTone(status, leadCounts[status]),
    }),
  );

  const nextActions: RevenueForecastResponse["nextActions"] = [];

  if (!blueprint) {
    nextActions.push({
      id: "save-blueprint",
      label: "Save Sales Blueprint",
      detail: "Forecasting needs lead targets, meeting targets, and contract value from the workspace blueprint.",
      urgency: "blocked",
      href: "/settings#sales-blueprint",
      evidence: ["/v1/sales-blueprint"],
    });
  } else if (averageContractValue <= 0) {
    nextActions.push({
      id: "set-contract-value",
      label: "Set contract value",
      detail: "Average contract value is 0, so revenue forecast value cannot be estimated.",
      urgency: "blocked",
      href: "/settings#sales-blueprint",
      evidence: ["/v1/sales-blueprint"],
    });
  }

  if (callsNeedingReview > 0) {
    nextActions.push({
      id: "review-call-blockers",
      label: "Review call blockers",
      detail: `${pluralize(callsNeedingReview, "call")} needs operator review before conversion value can move forward.`,
      urgency: "blocked",
      href: "/dashboard#calls-and-meetings",
      evidence: ["/v1/dashboard", "/v1/calls/:id/review"],
    });
  }

  if (blueprint && conversionReadyLeads < Math.ceil(Math.max(1, monthlyLeadTarget) * 0.25)) {
    nextActions.push({
      id: "increase-qualified-pipeline",
      label: "Increase qualified pipeline",
      detail: `${pluralize(conversionReadyLeads, "conversion-ready lead")} is below 25% of the monthly lead target.`,
      urgency: "warn",
      href: "/dashboard#lead-collection",
      evidence: ["/v1/dashboard", "/v1/leads/discover"],
    });
  }

  if (blueprint && meetingProgress < Math.ceil(Math.max(1, meetingTarget) * 0.5)) {
    nextActions.push({
      id: "move-leads-to-meetings",
      label: "Move leads toward meetings",
      detail: `${pluralize(meetingProgress, "meeting signal")} is below 50% of the monthly meeting target.`,
      urgency: "warn",
      href: "/dashboard#calls-and-meetings",
      evidence: ["/v1/dashboard", "/v1/meetings"],
    });
  }

  if (blueprint && pipelineGapValue > 0 && targetCoveragePercent < 75) {
    nextActions.push({
      id: "close-pipeline-gap",
      label: "Close weighted pipeline gap",
      detail: `${formatCurrency(pipelineGapValue)} more weighted pipeline is needed to reach 75% target coverage.`,
      urgency: "warn",
      href: "/dashboard#lead-collection",
      evidence: ["/v1/dashboard", "/v1/revenue/forecast"],
    });
  }

  if (nextActions.length === 0) {
    nextActions.push({
      id: "review-next-growth-experiment",
      label: "Review next growth experiment",
      detail: "Forecast blockers are clear. Use source quality and conversion outcomes to choose the next channel test.",
      urgency: "good",
      href: "/dashboard#content-demand",
      evidence: ["/v1/dashboard", "/v1/content/opportunities"],
    });
  }

  const posture: RevenueForecastPosture = blueprintMissing
    ? "blueprint_required"
    : callsNeedingReview > 0
      ? "needs_conversion"
      : targetGap
        ? "target_gap"
        : "on_track";
  const title =
    posture === "blueprint_required"
      ? "Revenue assumptions required"
      : posture === "needs_conversion"
        ? "Conversion blockers affect forecast"
        : posture === "target_gap"
          ? "Pipeline target gap visible"
          : "Forecast coverage on track";

  return revenueForecastResponseSchema.parse({
    surface: "revenue-forecast",
    version: "2026-06-04.revenue-forecast",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title,
    summary: blueprintMissing
      ? "Save Sales Blueprint targets and average contract value before relying on forecast value."
      : `${formatCurrency(weightedPipelineValue)} weighted pipeline against ${formatCurrency(
          targetPipelineValue,
        )} target coverage model.`,
    assumptions: {
      blueprintId: blueprint?.id ?? null,
      averageContractValue,
      monthlyLeadTarget,
      meetingTarget,
      weightedPipelineValue,
      actualClosedValue,
      targetPipelineValue,
      targetCoveragePercent,
      model:
        "Deterministic stage-weight model: new 5%, qualified 20%, contacted 35%, meeting booked 55%, won 100%, lost 0%.",
    },
    metrics: [
      {
        id: "weighted-pipeline",
        label: "Weighted pipeline",
        value: formatCurrency(weightedPipelineValue),
        detail: `${targetCoveragePercent}% of target-weighted meeting pipeline.`,
        tone: blueprintMissing ? "neutral" : targetCoveragePercent >= 75 ? "good" : "warn",
      },
      {
        id: "actual-closed",
        label: "Actual closed",
        value: formatCurrency(actualClosedValue),
        detail: `${pluralize(
          valuedCompletedMeetings.length,
          "completed meeting",
        )} with recorded contract value.`,
        tone: actualClosedValue > 0 ? "good" : "neutral",
      },
      {
        id: "pipeline-gap",
        label: "Pipeline gap",
        value: formatCurrency(pipelineGapValue),
        detail: `${formatCurrency(targetPipelineValue)} target based on meeting target and stage confidence.`,
        tone: pipelineGapValue > 0 ? "warn" : "good",
      },
      {
        id: "lead-coverage",
        label: "Lead target coverage",
        value: `${leadTargetCoveragePercent}%`,
        detail: `${pluralize(qualifiedPipelineLeads, "qualified pipeline lead")} against ${pluralize(
          monthlyLeadTarget,
          "target lead",
        )}.`,
        tone: leadTargetCoveragePercent >= 50 ? "good" : "warn",
      },
      {
        id: "meeting-coverage",
        label: "Meeting target coverage",
        value: `${meetingTargetCoveragePercent}%`,
        detail: `${pluralize(meetingProgress, "meeting signal")} against ${pluralize(
          meetingTarget,
          "target meeting",
        )}.`,
        tone: meetingTargetCoveragePercent >= 50 ? "good" : "warn",
      },
    ],
    stages,
    nextActions,
    guardrails: [
      "Forecast is deterministic planning guidance, not guaranteed revenue.",
      "Average contract value, lead target, and meeting target come from the Sales Blueprint.",
      "No outreach, scheduling, billing, or provider work is triggered by this forecast.",
      "Operator review is required before acting on risky sales workflow changes.",
    ],
    unavailableClaims: [
      "Guaranteed revenue, guaranteed meetings, and autonomous close-rate optimization are not available.",
      "CRM, accounting, and calendar provider revenue attribution remains roadmap unless explicitly integrated.",
    ],
  });
}
