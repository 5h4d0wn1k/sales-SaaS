import type {
  AiWorker,
  AiWorkerControlPlaneResponse,
  DashboardResponse,
  PlanGrowthReadinessResponse,
} from "@sales/shared";
import type { DashboardCockpitTone } from "./dashboard-cockpit";

export type AiWorkerBudgetReadinessPosture =
  | "ready"
  | "needs_review"
  | "plan_review"
  | "blocked";

export type AiWorkerBudgetReadinessSignal = {
  id:
    | "workspace-budget"
    | "selected-worker"
    | "approval-authority"
    | "worker-ledger"
    | "plan-fit";
  label: string;
  value: string;
  detail: string;
  tone: DashboardCockpitTone;
};

export type AiWorkerBudgetReadinessModel = {
  posture: AiWorkerBudgetReadinessPosture;
  tone: DashboardCockpitTone;
  title: string;
  summary: string;
  canProposeNextTask: boolean;
  minimumTaskBudgetCents: number;
  remainingBudgetCents: number;
  utilizationPct: number;
  metrics: Array<{ label: string; value: string }>;
  signals: AiWorkerBudgetReadinessSignal[];
  guardrails: string[];
};

type AiWorkerBudgetReadinessInput = {
  subscription: Pick<
    DashboardResponse["subscription"],
    "planKey" | "status" | "monthlyUsage" | "usageLimit"
  >;
  aiWorkerSummary: AiWorkerControlPlaneResponse["summary"] | null;
  selectedWorker?: Pick<
    AiWorker,
    "name" | "status" | "monthlyBudgetCents" | "budgetUsedCents" | "riskLevel"
  > | null;
  pendingProposalCount: number;
  highRiskProposalCount: number;
  canReviewProposals: boolean;
  planGrowthReadiness?: Pick<
    PlanGrowthReadinessResponse,
    "posture" | "summary" | "recommendedPlan"
  > | null;
  minimumTaskBudgetCents?: number;
};

const DEFAULT_MINIMUM_TASK_BUDGET_CENTS = 1500;

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function pct(current: number, limit: number) {
  if (limit <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round((current / limit) * 100);
}

function toneForBudget(input: {
  remainingBudgetCents: number;
  limitCents: number;
  utilizationPct: number;
  minimumTaskBudgetCents: number;
}): DashboardCockpitTone {
  if (input.limitCents <= 0 || input.remainingBudgetCents < input.minimumTaskBudgetCents) {
    return "blocked";
  }

  if (input.utilizationPct >= 85) {
    return "warn";
  }

  return "good";
}

function planSignalTone(
  subscriptionStatus: DashboardResponse["subscription"]["status"],
  planGrowthReadiness: AiWorkerBudgetReadinessInput["planGrowthReadiness"],
): DashboardCockpitTone {
  if (subscriptionStatus === "past_due" || subscriptionStatus === "canceled") {
    return "blocked";
  }

  if (planGrowthReadiness?.posture === "blocked") {
    return "blocked";
  }

  if (
    planGrowthReadiness?.posture === "upgrade_recommended" ||
    planGrowthReadiness?.posture === "watch"
  ) {
    return "warn";
  }

  return planGrowthReadiness ? "good" : "neutral";
}

function titleForPosture(posture: AiWorkerBudgetReadinessPosture) {
  if (posture === "blocked") {
    return "AI worker task is blocked";
  }

  if (posture === "plan_review") {
    return "Review plan fit before AI worker scale";
  }

  if (posture === "needs_review") {
    return "AI worker budget needs review";
  }

  return "AI worker budget is ready";
}

function summaryForPosture(input: {
  posture: AiWorkerBudgetReadinessPosture;
  planKey: string;
  recommendedPlanName?: string | null;
}) {
  if (input.posture === "blocked") {
    return "Resolve subscription status, worker availability, reviewer authority, blocked runs, or monthly budget before proposing the next worker task.";
  }

  if (input.posture === "plan_review") {
    const recommendedPlan = input.recommendedPlanName ?? "a higher plan";
    return `The ${input.planKey} plan can continue cautiously, but ${recommendedPlan} should be reviewed before scaling worker-driven volume.`;
  }

  if (input.posture === "needs_review") {
    return "Budget can support a task, but pending approvals, blocked-ledger history, or high utilization should be reviewed before scaling.";
  }

  return "The selected worker has enough monthly budget and reviewer authority for the next approval-gated task proposal.";
}

export function buildAiWorkerBudgetReadiness(
  input: AiWorkerBudgetReadinessInput,
): AiWorkerBudgetReadinessModel {
  const minimumTaskBudgetCents =
    input.minimumTaskBudgetCents ?? DEFAULT_MINIMUM_TASK_BUDGET_CENTS;
  const summary = input.aiWorkerSummary;
  const selectedWorker = input.selectedWorker ?? null;
  const remainingBudgetCents = summary
    ? Math.max(0, summary.budgetLimitCents - summary.budgetUsedCents)
    : 0;
  const utilizationPct = summary ? pct(summary.budgetUsedCents, summary.budgetLimitCents) : 0;
  const selectedWorkerRemainingBudgetCents = selectedWorker
    ? Math.max(0, selectedWorker.monthlyBudgetCents - selectedWorker.budgetUsedCents)
    : 0;
  const selectedWorkerUtilizationPct = selectedWorker
    ? pct(selectedWorker.budgetUsedCents, selectedWorker.monthlyBudgetCents)
    : 0;
  const workspaceBudgetTone = summary
    ? toneForBudget({
        remainingBudgetCents,
        limitCents: summary.budgetLimitCents,
        utilizationPct,
        minimumTaskBudgetCents,
      })
    : "blocked";
  const selectedWorkerTone: DashboardCockpitTone = !selectedWorker
    ? "blocked"
    : selectedWorker.status !== "active" ||
        selectedWorkerRemainingBudgetCents < minimumTaskBudgetCents
      ? "blocked"
      : selectedWorkerUtilizationPct >= 85
        ? "warn"
        : "good";
  const approvalTone: DashboardCockpitTone = !input.canReviewProposals
    ? "blocked"
    : input.highRiskProposalCount > 0
      ? "blocked"
      : input.pendingProposalCount > 0
        ? "warn"
        : "good";
  const ledgerTone: DashboardCockpitTone = !summary
    ? "blocked"
    : summary.active === 0
      ? "blocked"
      : summary.blocked > 0
        ? "blocked"
        : summary.pendingApproval > 0
          ? "warn"
          : "good";
  const planTone = planSignalTone(input.subscription.status, input.planGrowthReadiness);

  const signals: AiWorkerBudgetReadinessSignal[] = [
    {
      id: "workspace-budget",
      label: "Workspace AI budget",
      value: summary ? `${formatCents(remainingBudgetCents)} left` : "not loaded",
      detail: !summary
        ? "The AI worker control plane did not return a budget ledger."
        : workspaceBudgetTone === "blocked"
          ? `Remaining budget must be at least ${formatCents(minimumTaskBudgetCents)} before another worker proposal can be created.`
          : workspaceBudgetTone === "warn"
            ? `Workspace worker budget is ${utilizationPct}% used; review cost-to-serve before heavier AI work.`
            : "Workspace worker budget has enough headroom for the next guarded task proposal.",
      tone: workspaceBudgetTone,
    },
    {
      id: "selected-worker",
      label: "Selected worker",
      value: selectedWorker ? selectedWorker.name : "none",
      detail: !selectedWorker
        ? "No worker is available for a task proposal."
        : selectedWorker.status !== "active"
          ? `${selectedWorker.name} is ${selectedWorker.status}; only active workers can receive task proposals.`
          : selectedWorkerRemainingBudgetCents < minimumTaskBudgetCents
            ? `${selectedWorker.name} has ${formatCents(selectedWorkerRemainingBudgetCents)} remaining, below the ${formatCents(minimumTaskBudgetCents)} task floor.`
            : `${selectedWorker.name} has ${formatCents(selectedWorkerRemainingBudgetCents)} remaining this month.`,
      tone: selectedWorkerTone,
    },
    {
      id: "approval-authority",
      label: "Approval authority",
      value: input.canReviewProposals ? "verified reviewer" : "missing",
      detail: !input.canReviewProposals
        ? "Owner or admin access with verified email is required before worker actions can move."
        : input.highRiskProposalCount > 0
          ? `${input.highRiskProposalCount} high-risk proposal${input.highRiskProposalCount === 1 ? "" : "s"} should be reviewed before new worker tasks.`
          : input.pendingProposalCount > 0
            ? `${input.pendingProposalCount} proposal${input.pendingProposalCount === 1 ? "" : "s"} already waiting for review.`
            : "Reviewer authority is present and the approval queue is clear.",
      tone: approvalTone,
    },
    {
      id: "worker-ledger",
      label: "Worker ledger",
      value: summary
        ? `${summary.pendingApproval} pending / ${summary.blocked} blocked`
        : "not loaded",
      detail: !summary
        ? "Worker status, pending approvals, and blocked runs are unavailable."
        : summary.active === 0
          ? "At least one active worker is required before proposing a task."
          : summary.blocked > 0
            ? `${summary.blocked} blocked worker run${summary.blocked === 1 ? "" : "s"} need operator review.`
            : summary.pendingApproval > 0
              ? `${summary.pendingApproval} worker task${summary.pendingApproval === 1 ? "" : "s"} already waiting for approval.`
              : "No blocked worker runs are visible in the current ledger.",
      tone: ledgerTone,
    },
    {
      id: "plan-fit",
      label: "Plan fit",
      value: input.planGrowthReadiness?.posture.replace(/_/g, " ") ?? input.subscription.status,
      detail:
        input.subscription.status === "past_due" || input.subscription.status === "canceled"
          ? `Subscription status is ${input.subscription.status}; resolve billing before creating more billable worker work.`
          : input.planGrowthReadiness?.summary ??
            "Plan growth readiness was unavailable, so worker scale is shown without a plan-fit advisory.",
      tone: planTone,
    },
  ];

  const blockedSignals = signals.filter((signal) => signal.tone === "blocked");
  const warningSignals = signals.filter((signal) => signal.tone === "warn");
  const posture: AiWorkerBudgetReadinessPosture =
    blockedSignals.length > 0
      ? "blocked"
      : planTone === "warn"
        ? "plan_review"
        : warningSignals.length > 0
          ? "needs_review"
          : "ready";
  const tone: DashboardCockpitTone =
    posture === "blocked" ? "blocked" : posture === "ready" ? "good" : "warn";
  const canProposeNextTask =
    blockedSignals.length === 0 &&
    Boolean(selectedWorker) &&
    selectedWorkerTone !== "blocked" &&
    approvalTone !== "blocked" &&
    ledgerTone !== "blocked" &&
    planTone !== "blocked";

  return {
    posture,
    tone,
    title: titleForPosture(posture),
    summary: summaryForPosture({
      posture,
      planKey: input.subscription.planKey,
      recommendedPlanName: input.planGrowthReadiness?.recommendedPlan?.planName ?? null,
    }),
    canProposeNextTask,
    minimumTaskBudgetCents,
    remainingBudgetCents,
    utilizationPct,
    metrics: [
      {
        label: "Task floor",
        value: formatCents(minimumTaskBudgetCents),
      },
      {
        label: "Workspace remaining",
        value: summary ? formatCents(remainingBudgetCents) : "not loaded",
      },
      {
        label: "Budget used",
        value: summary ? `${utilizationPct}%` : "not loaded",
      },
      {
        label: "Worker approvals",
        value: summary ? String(summary.pendingApproval) : "not loaded",
      },
    ],
    signals,
    guardrails: [
      "AI-worker budget readiness is advisory and read-only; it does not mutate subscription, provider spend, usage, or worker execution state.",
      "Worker tasks remain approval-gated and do not run external tools automatically from this dashboard card.",
      "Plan growth recommendations are guidance until billing entitlements, metering, and provider-cost enforcement are implemented end to end.",
    ],
  };
}
