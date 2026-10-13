import { z } from "zod";
import {
  aiWorkerControlPlaneResponseSchema,
  dashboardResponseSchema,
  outboundChannelSchema,
  subscriptionStatusSchema,
  type AiWorkerControlPlaneResponse,
  type DashboardResponse,
} from "./domain";
import {
  getPlanAiWorkerExecutionBudgetCents,
  getPlanAiWorkerTaskProposalLimit,
  getPlanByKey,
  getPlanProviderCostBudgetCents,
  type PlanUpgradeRecommendation,
} from "./billing/pricing";
import {
  planGrowthReadinessResponseSchema,
  planGrowthReadinessUpgradeSchema,
  type PlanGrowthReadinessResponse,
} from "./plan-growth-readiness";

export const aiWorkerMarginReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const aiWorkerMarginReadinessPostureSchema = z.enum([
  "advisory_ready",
  "margin_watch",
  "upgrade_recommended",
  "blocked",
]);

export const aiWorkerMarginReadinessCheckStatusSchema = z.enum([
  "met",
  "watch",
  "missing",
  "blocked",
]);

export const aiWorkerMarginReadinessCapabilitySchema = z.object({
  id: z.string(),
  label: z.string(),
  status: aiWorkerMarginReadinessCheckStatusSchema,
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const aiWorkerMarginReadinessCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: aiWorkerMarginReadinessCheckStatusSchema,
  detail: z.string(),
  tone: aiWorkerMarginReadinessToneSchema,
  evidence: z.array(z.string()).default([]),
});

export const aiWorkerMarginReadinessMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: aiWorkerMarginReadinessToneSchema,
});

export const aiWorkerMarginReadinessResponseSchema = z.object({
  surface: z.literal("ai-worker-margin-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: aiWorkerMarginReadinessPostureSchema,
  tone: aiWorkerMarginReadinessToneSchema,
  title: z.string(),
  summary: z.string(),
  revenueModel: z.object({
    model: z.literal("subscription_with_usage_controls"),
    planKey: z.string(),
    planName: z.string(),
    billableUnits: z.array(z.string()),
  }),
  planBoundary: z.object({
    subscriptionStatus: subscriptionStatusSchema,
    usageLimit: z.number().int().min(0),
    monthlyUsage: z.number().int().min(0),
    providerCostBudgetCents: z.number().int().min(0),
    aiTaskProposalLimit: z.number().int().min(0),
    aiTaskProposalUsage: z.number().int().min(0),
    aiTaskProposalRemaining: z.number().int().min(0),
    aiExecutionBudgetCents: z.number().int().min(0),
    aiExecutionBudgetUsageCents: z.number().int().min(0),
    aiExecutionBudgetRemainingCents: z.number().int().min(0),
    includedChannels: z.array(outboundChannelSchema),
    seats: z.number().int().min(0),
  }),
  liveScale: z.object({
    enabled: z.literal(false),
    status: z.literal("blocked"),
    detail: z.string(),
  }),
  metrics: z.array(aiWorkerMarginReadinessMetricSchema),
  checks: z.array(aiWorkerMarginReadinessCheckSchema),
  requiredCapabilities: z.array(aiWorkerMarginReadinessCapabilitySchema),
  recommendedPlan: planGrowthReadinessUpgradeSchema.nullable(),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type AiWorkerMarginReadinessTone = z.infer<
  typeof aiWorkerMarginReadinessToneSchema
>;
export type AiWorkerMarginReadinessPosture = z.infer<
  typeof aiWorkerMarginReadinessPostureSchema
>;
export type AiWorkerMarginReadinessResponse = z.infer<
  typeof aiWorkerMarginReadinessResponseSchema
>;

type BuildAiWorkerMarginReadinessInput = {
  dashboard: DashboardResponse;
  controlPlane: AiWorkerControlPlaneResponse;
  planGrowthReadiness?: PlanGrowthReadinessResponse | null;
  providerCostUsageCents?: number;
  aiTaskProposalUsage?: {
    currentUsage: number;
    usageLimit: number;
    remainingQuantity: number;
  };
  aiExecutionBudgetUsage?: {
    currentUsage: number;
    usageLimit: number;
    remainingQuantity: number;
  };
  minimumTaskBudgetCents?: number;
  aiTaskMeteringEnforced?: boolean;
  aiExecutionBudgetEnforced?: boolean;
  providerCostCurvesConfigured?: boolean;
  generatedAt?: string;
};

const version = "2026-06-05.ai-worker-margin-readiness";
const defaultMinimumTaskBudgetCents = 1500;

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

function toneForStatus(
  status: z.infer<typeof aiWorkerMarginReadinessCheckStatusSchema>,
): AiWorkerMarginReadinessTone {
  if (status === "met") {
    return "good";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "warn";
}

function check(input: {
  id: string;
  label: string;
  status: z.infer<typeof aiWorkerMarginReadinessCheckStatusSchema>;
  detail: string;
  evidence?: string[];
}): z.infer<typeof aiWorkerMarginReadinessCheckSchema> {
  return {
    ...input,
    tone: toneForStatus(input.status),
    evidence: input.evidence ?? [],
  };
}

function capability(input: {
  id: string;
  label: string;
  status: z.infer<typeof aiWorkerMarginReadinessCheckStatusSchema>;
  detail: string;
  evidence?: string[];
}): z.infer<typeof aiWorkerMarginReadinessCapabilitySchema> {
  return {
    ...input,
    evidence: input.evidence ?? [],
  };
}

function titleForPosture(posture: AiWorkerMarginReadinessPosture) {
  if (posture === "blocked") {
    return "AI worker scale is financially blocked";
  }

  if (posture === "upgrade_recommended") {
    return "Upgrade before scaling AI workers";
  }

  if (posture === "margin_watch") {
    return "AI worker margin needs controls";
  }

  return "AI worker margin is advisory-ready";
}

function summaryForPosture(input: {
  posture: AiWorkerMarginReadinessPosture;
  recommendedPlan?: PlanUpgradeRecommendation | null;
}) {
  if (input.posture === "blocked") {
    return "Resolve subscription status, worker availability, provider budget, or workspace AI budget before increasing AI-worker volume.";
  }

  if (input.posture === "upgrade_recommended") {
    const plan = input.recommendedPlan?.planName ?? "a higher plan";
    return `Move to ${plan} or reduce planned AI-worker work before expanding governed automation.`;
  }

  if (input.posture === "margin_watch") {
    return "The workspace can continue in advisory mode, but live AI-worker scale needs metering, quota enforcement, dry-run cost curves, and audit coverage.";
  }

  return "Current plan status, provider-cost boundary, worker budget, and approval posture support the next advisory worker proposal.";
}

export function buildAiWorkerMarginReadiness(
  input: BuildAiWorkerMarginReadinessInput,
): AiWorkerMarginReadinessResponse {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const controlPlane = aiWorkerControlPlaneResponseSchema.parse(input.controlPlane);
  const planGrowthReadiness = input.planGrowthReadiness
    ? planGrowthReadinessResponseSchema.parse(input.planGrowthReadiness)
    : null;
  const subscription = dashboard.subscription;
  const plan = getPlanByKey(subscription.planKey);
  const minimumTaskBudgetCents =
    input.minimumTaskBudgetCents ?? defaultMinimumTaskBudgetCents;
  const providerCostBudgetCents = getPlanProviderCostBudgetCents(subscription.planKey);
  const providerCostUsageCents = Math.max(0, Math.trunc(input.providerCostUsageCents ?? 0));
  const aiTaskProposalLimit = Math.max(
    0,
    Math.trunc(input.aiTaskProposalUsage?.usageLimit ?? getPlanAiWorkerTaskProposalLimit(subscription.planKey)),
  );
  const aiTaskProposalUsage = Math.max(
    0,
    Math.trunc(input.aiTaskProposalUsage?.currentUsage ?? 0),
  );
  const aiTaskProposalRemaining = Math.max(
    0,
    Math.trunc(input.aiTaskProposalUsage?.remainingQuantity ?? aiTaskProposalLimit - aiTaskProposalUsage),
  );
  const aiExecutionBudgetCents = Math.max(
    0,
    Math.trunc(input.aiExecutionBudgetUsage?.usageLimit ?? getPlanAiWorkerExecutionBudgetCents(subscription.planKey)),
  );
  const aiExecutionBudgetUsageCents = Math.max(
    0,
    Math.trunc(input.aiExecutionBudgetUsage?.currentUsage ?? 0),
  );
  const aiExecutionBudgetRemainingCents = Math.max(
    0,
    Math.trunc(input.aiExecutionBudgetUsage?.remainingQuantity ?? aiExecutionBudgetCents - aiExecutionBudgetUsageCents),
  );
  const workerBudgetLimitCents = controlPlane.summary.budgetLimitCents;
  const workerBudgetUsedCents = controlPlane.summary.budgetUsedCents;
  const workerBudgetRemainingCents = Math.max(0, workerBudgetLimitCents - workerBudgetUsedCents);
  const providerCostUtilizationPct = pct(providerCostUsageCents, providerCostBudgetCents);
  const workerBudgetUtilizationPct = pct(workerBudgetUsedCents, workerBudgetLimitCents);
  const hasActiveWorker = controlPlane.summary.active > 0;
  const hasBlockedRuns = controlPlane.summary.blocked > 0;
  const subscriptionBlocked =
    subscription.status === "past_due" || subscription.status === "canceled";
  const providerBudgetBlocked =
    providerCostBudgetCents > 0
      ? providerCostUsageCents >= providerCostBudgetCents
      : hasActiveWorker || providerCostUsageCents > 0;
  const providerBudgetWatch =
    providerCostBudgetCents > 0 && providerCostUtilizationPct >= 85;
  const workerBudgetBlocked = workerBudgetRemainingCents < minimumTaskBudgetCents;
  const meteringEnforced = input.aiTaskMeteringEnforced === true;
  const aiExecutionBudgetEnforced = input.aiExecutionBudgetEnforced === true;
  const providerCostCurvesConfigured = input.providerCostCurvesConfigured === true;

  const checks = [
    check({
      id: "subscription-state",
      label: "Subscription state",
      status: subscriptionBlocked ? "blocked" : "met",
      detail: subscriptionBlocked
        ? `Subscription is ${subscription.status.replace("_", " ")}; billable worker work should stay paused.`
        : `Subscription is ${subscription.status.replace("_", " ")} on ${plan?.name ?? subscription.planKey}.`,
      evidence: ["dashboard.subscription"],
    }),
    check({
      id: "provider-cost-boundary",
      label: "Provider-cost boundary",
      status: providerBudgetBlocked ? "blocked" : providerBudgetWatch ? "watch" : "met",
      detail:
        providerCostBudgetCents === 0
          ? "The current plan has no provider-cost budget, so live AI-worker scale should stay blocked."
          : providerBudgetBlocked
            ? "Provider-cost budget is exhausted for the current plan."
            : providerBudgetWatch
              ? "Provider-cost budget is approaching the monthly limit."
              : "Provider-cost budget has headroom for configured execution.",
      evidence: ["pricing.providerCostBudgetCents", "usage.provider_cost_cents"],
    }),
    check({
      id: "workspace-worker-budget",
      label: "Workspace worker budget",
      status: workerBudgetBlocked ? "blocked" : workerBudgetUtilizationPct >= 85 ? "watch" : "met",
      detail: workerBudgetBlocked
        ? `${formatCents(workerBudgetRemainingCents)} remains, below the ${formatCents(minimumTaskBudgetCents)} task floor.`
        : workerBudgetUtilizationPct >= 85
          ? `Workspace AI-worker budget is ${workerBudgetUtilizationPct}% used.`
          : `${formatCents(workerBudgetRemainingCents)} remains in the AI-worker budget ledger.`,
      evidence: ["/v1/ai-workers"],
    }),
    check({
      id: "plan-ai-execution-budget",
      label: "Plan AI execution budget",
      status: aiExecutionBudgetRemainingCents <= 0 ? "blocked" : pct(aiExecutionBudgetUsageCents, aiExecutionBudgetCents) >= 85 ? "watch" : "met",
      detail:
        aiExecutionBudgetCents === 0
          ? "The current plan has no AI dry-run execution budget."
          : `${formatCents(aiExecutionBudgetRemainingCents)} remains in the plan-level AI dry-run execution budget.`,
      evidence: ["pricing.aiWorkerExecutionBudgetCents", "usage.ai_worker_execution_cents"],
    }),
    check({
      id: "worker-ledger",
      label: "Worker ledger",
      status: !hasActiveWorker ? "blocked" : hasBlockedRuns ? "watch" : "met",
      detail: !hasActiveWorker
        ? "At least one active worker is required before AI-worker scale can be evaluated."
        : hasBlockedRuns
          ? `${controlPlane.summary.blocked} blocked worker run${controlPlane.summary.blocked === 1 ? "" : "s"} should be reviewed before scaling.`
          : "Active worker ledger has no blocked runs.",
      evidence: ["/v1/ai-workers"],
    }),
    check({
      id: "plan-fit",
      label: "Plan fit",
      status:
        planGrowthReadiness?.posture === "blocked"
          ? "blocked"
          : planGrowthReadiness?.posture === "upgrade_recommended"
            ? "watch"
            : planGrowthReadiness
              ? "met"
              : "missing",
      detail:
        planGrowthReadiness?.summary ??
        "Plan growth readiness is unavailable, so margin posture cannot compare usage, channels, and provider budget.",
      evidence: ["/v1/growth/plan-readiness"],
    }),
  ];

  const requiredCapabilities = [
    capability({
      id: "ai-task-metering",
      label: "AI task metering",
      status: meteringEnforced ? "met" : "missing",
      detail: meteringEnforced
        ? "AI worker task proposals are enforced by a metered plan quota."
        : "AI worker task proposal metering must be enabled before AI-worker margin claims are safe.",
      evidence: ["usage.ai_worker_task_proposals"],
    }),
    capability({
      id: "ai-execution-budget",
      label: "AI execution budget",
      status: aiExecutionBudgetEnforced ? "met" : "missing",
      detail: aiExecutionBudgetEnforced
        ? "Approved dry-run result cost is bounded by a metered plan-level AI execution budget."
        : "AI dry-run execution cost is not yet bounded by a plan-level metered budget.",
      evidence: ["usage.ai_worker_execution_cents"],
    }),
    capability({
      id: "provider-cost-curves",
      label: "AI-worker cost curves",
      status: providerCostCurvesConfigured ? "met" : "missing",
      detail: providerCostCurvesConfigured
        ? "AI-worker dry-run cost curves are standardized for approved result capture."
        : "AI-worker dry-run cost curves are required before worker margin can be priced confidently.",
      evidence: ["ai_worker_execution_cents", "/v1/providers/cost-curves"],
    }),
    capability({
      id: "audit-coverage",
      label: "Audit coverage",
      status: "met",
      detail: "Worker proposal, approval, and dry-run result paths are represented in the audit/control-plane surfaces.",
      evidence: ["/v1/audit/recent", "/v1/ai-workers"],
    }),
    capability({
      id: "admin-controls",
      label: "Admin controls",
      status: "met",
      detail: "Owner/admin review with verified email is required before worker proposals and dry-run result ingestion.",
      evidence: ["requireRole(owner, admin)", "requireVerifiedEmail"],
    }),
  ];

  const hardBlocked = checks.some((item) => item.status === "blocked");
  const upgradeRecommended =
    !hardBlocked &&
    (planGrowthReadiness?.posture === "upgrade_recommended" ||
      providerBudgetWatch ||
      providerCostBudgetCents === 0);
  const missingProductionCapability = requiredCapabilities.some(
    (item) => item.status === "missing",
  );
  const watched = checks.some((item) => item.status === "watch" || item.status === "missing");
  const posture: AiWorkerMarginReadinessPosture = hardBlocked
    ? "blocked"
    : upgradeRecommended
      ? "upgrade_recommended"
      : missingProductionCapability || watched
        ? "margin_watch"
        : "advisory_ready";
  const tone: AiWorkerMarginReadinessTone =
    posture === "blocked"
      ? "blocked"
      : posture === "advisory_ready"
        ? "good"
        : "warn";

  return aiWorkerMarginReadinessResponseSchema.parse({
    surface: "ai-worker-margin-readiness",
    version,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    posture,
    tone,
    title: titleForPosture(posture),
    summary: summaryForPosture({
      posture,
      recommendedPlan: planGrowthReadiness?.recommendedPlan ?? null,
    }),
    revenueModel: {
      model: "subscription_with_usage_controls",
      planKey: subscription.planKey,
      planName: plan?.name ?? subscription.planKey,
      billableUnits: [
        "monthly lead capacity",
        "provider-cost budget",
        "approval-gated AI worker task proposals",
        "plan-level AI dry-run execution budget",
      ],
    },
    planBoundary: {
      subscriptionStatus: subscription.status,
      usageLimit: subscription.usageLimit,
      monthlyUsage: subscription.monthlyUsage,
      providerCostBudgetCents,
      aiTaskProposalLimit,
      aiTaskProposalUsage,
      aiTaskProposalRemaining,
      aiExecutionBudgetCents,
      aiExecutionBudgetUsageCents,
      aiExecutionBudgetRemainingCents,
      includedChannels: plan?.includedChannels ?? [],
      seats: plan?.seats ?? 0,
    },
    liveScale: {
      enabled: false,
      status: "blocked",
      detail:
        "Live AI-worker scale remains blocked until external-tool execution billing, live execution cost curves, and rollback-tested execution runners exist.",
    },
    metrics: [
      {
        id: "plan",
        label: "Plan",
        value: plan?.name ?? subscription.planKey,
        detail: `${subscription.status.replace("_", " ")} subscription with ${subscription.usageLimit.toLocaleString("en-US")} monthly leads.`,
        tone: subscriptionBlocked ? "blocked" : "good",
      },
      {
        id: "provider-cost",
        label: "Provider budget",
        value: `${formatCents(providerCostUsageCents)} / ${formatCents(providerCostBudgetCents)}`,
        detail:
          providerCostBudgetCents === 0
            ? "No provider-cost budget is included on this plan."
            : `${providerCostUtilizationPct}% of provider-cost budget is used.`,
        tone: providerBudgetBlocked ? "blocked" : providerBudgetWatch ? "warn" : "good",
      },
      {
        id: "worker-budget",
        label: "Worker budget",
        value: `${formatCents(workerBudgetUsedCents)} / ${formatCents(workerBudgetLimitCents)}`,
        detail: `${workerBudgetUtilizationPct}% of the workspace AI-worker budget ledger is used.`,
        tone: workerBudgetBlocked ? "blocked" : workerBudgetUtilizationPct >= 85 ? "warn" : "good",
      },
      {
        id: "ai-task-proposals",
        label: "AI proposals",
        value: `${aiTaskProposalUsage.toLocaleString("en-US")} / ${aiTaskProposalLimit.toLocaleString("en-US")}`,
        detail:
          aiTaskProposalLimit === 0
            ? "This plan does not include AI worker task proposals."
            : `${aiTaskProposalRemaining.toLocaleString("en-US")} approval-gated AI worker proposal${aiTaskProposalRemaining === 1 ? "" : "s"} remain this month.`,
        tone: aiTaskProposalLimit === 0 || aiTaskProposalRemaining === 0 ? "blocked" : aiTaskProposalRemaining <= 2 ? "warn" : "good",
      },
      {
        id: "ai-execution-budget",
        label: "AI dry-run budget",
        value: `${formatCents(aiExecutionBudgetUsageCents)} / ${formatCents(aiExecutionBudgetCents)}`,
        detail:
          aiExecutionBudgetCents === 0
            ? "This plan does not include AI dry-run execution budget."
            : `${formatCents(aiExecutionBudgetRemainingCents)} remains for approved dry-run result capture this month.`,
        tone: aiExecutionBudgetRemainingCents <= 0 ? "blocked" : pct(aiExecutionBudgetUsageCents, aiExecutionBudgetCents) >= 85 ? "warn" : "good",
      },
      {
        id: "worker-ledger",
        label: "Worker ledger",
        value: `${controlPlane.summary.active} active / ${controlPlane.summary.blocked} blocked`,
        detail: `${controlPlane.summary.pendingApproval} worker task${controlPlane.summary.pendingApproval === 1 ? "" : "s"} awaiting approval.`,
        tone: !hasActiveWorker ? "blocked" : hasBlockedRuns ? "warn" : "good",
      },
      {
        id: "production-capabilities",
        label: "Production controls",
        value: `${requiredCapabilities.filter((item) => item.status === "met").length} / ${requiredCapabilities.length}`,
        detail: "Task metering, AI dry-run budget, dry-run cost curves, audit coverage, and admin controls required for production AI-worker economics.",
        tone: missingProductionCapability ? "warn" : "good",
      },
    ],
    checks,
    requiredCapabilities,
    recommendedPlan: planGrowthReadiness?.recommendedPlan ?? null,
    guardrails: [
      "AI-worker margin readiness is read-only and does not mutate billing, plan keys, usage events, provider spend, or worker state.",
      "Provider-cost usage and AI dry-run budget usage are based on entitlement ledgers; worker budget is shown separately because it is a workspace control ledger.",
      "Live AI-worker execution, automatic outreach, CRM writes, calendar writes, and Telegram mutations remain disabled until production controls are implemented.",
    ],
    unavailableClaims: [
      "Live external AI-worker execution billing",
      "Live external AI-worker execution cost curves",
      "Live AI-worker execution economics",
    ],
  });
}
