import { z } from "zod";
import {
  aiWorkerControlPlaneResponseSchema,
  roleSchema,
  type AiWorker,
  type AiWorkerControlPlaneResponse,
  type AiWorkerRun,
} from "./domain";

export const aiWorkerExecutionReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const aiWorkerExecutionReadinessPostureSchema = z.enum([
  "dry_run_ready",
  "needs_approval",
  "needs_task",
  "blocked",
]);

export const aiWorkerExecutionReadinessCheckStatusSchema = z.enum([
  "met",
  "missing",
  "blocked",
]);

export const aiWorkerExecutionReadinessCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: aiWorkerExecutionReadinessCheckStatusSchema,
  detail: z.string(),
  tone: aiWorkerExecutionReadinessToneSchema,
  evidence: z.array(z.string()).default([]),
});

export const aiWorkerExecutionReadinessCandidateSchema = z.object({
  runId: z.string(),
  workerId: z.string(),
  workerName: z.string(),
  title: z.string(),
  expectedCostCents: z.number().int().min(0),
  allowedTools: z.array(z.string()),
  fallback: z.string(),
});

export const aiWorkerExecutionReadinessResponseSchema = z.object({
  surface: z.literal("ai-worker-execution-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: aiWorkerExecutionReadinessPostureSchema,
  tone: aiWorkerExecutionReadinessToneSchema,
  title: z.string(),
  summary: z.string(),
  liveExecution: z.object({
    enabled: z.literal(false),
    status: z.literal("blocked"),
    detail: z.string(),
  }),
  metrics: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
    detail: z.string(),
    tone: aiWorkerExecutionReadinessToneSchema,
  })),
  checks: z.array(aiWorkerExecutionReadinessCheckSchema),
  dryRunCandidates: z.array(aiWorkerExecutionReadinessCandidateSchema),
  toolScopeViolations: z.array(z.object({
    workerId: z.string(),
    workerName: z.string(),
    tool: z.string(),
    detail: z.string(),
  })),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type AiWorkerExecutionReadinessTone = z.infer<
  typeof aiWorkerExecutionReadinessToneSchema
>;
export type AiWorkerExecutionReadinessPosture = z.infer<
  typeof aiWorkerExecutionReadinessPostureSchema
>;
export type AiWorkerExecutionReadinessResponse = z.infer<
  typeof aiWorkerExecutionReadinessResponseSchema
>;

type BuildAiWorkerExecutionReadinessInput = {
  controlPlane: AiWorkerControlPlaneResponse;
  actorRole: z.infer<typeof roleSchema> | string;
  emailVerified?: boolean;
  aiExecutionBudgetUsage?: {
    currentUsage: number;
    usageLimit: number;
    remainingQuantity: number;
  };
  generatedAt?: string;
};

const version = "2026-06-05.ai-worker-execution-readiness";

const riskyToolMatchers = [
  "send",
  "write",
  "billing",
  "payment",
  "provider-secret",
  "team-admin",
  "voice-call",
  "calendar-write",
  "crm-write",
  "linkedin-send",
  "sms-send",
  "email-send",
];

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function roleCanReview(role: z.infer<typeof roleSchema>) {
  return role === "owner" || role === "admin";
}

function riskyTool(tool: string) {
  const normalized = tool.toLowerCase();
  return riskyToolMatchers.some((matcher) => normalized.includes(matcher));
}

function workerRemainingBudget(worker: Pick<AiWorker, "monthlyBudgetCents" | "budgetUsedCents">) {
  return Math.max(0, worker.monthlyBudgetCents - worker.budgetUsedCents);
}

function check(input: {
  id: string;
  label: string;
  status: z.infer<typeof aiWorkerExecutionReadinessCheckStatusSchema>;
  detail: string;
  evidence?: string[];
}): z.infer<typeof aiWorkerExecutionReadinessCheckSchema> {
  return {
    ...input,
    tone:
      input.status === "met"
        ? "good"
        : input.status === "blocked"
          ? "blocked"
          : "warn",
    evidence: input.evidence ?? [],
  };
}

function titleForPosture(posture: AiWorkerExecutionReadinessPosture) {
  if (posture === "dry_run_ready") {
    return "AI worker dry run is ready";
  }

  if (posture === "needs_approval") {
    return "AI worker execution needs approval";
  }

  if (posture === "needs_task") {
    return "AI worker execution needs a task";
  }

  return "AI worker execution is blocked";
}

function summaryForPosture(input: {
  posture: AiWorkerExecutionReadinessPosture;
  candidateCount: number;
  proposedCount: number;
}) {
  if (input.posture === "dry_run_ready") {
    return `${input.candidateCount} approved worker task${input.candidateCount === 1 ? "" : "s"} can be rehearsed in a dry-run harness; no external tool will run automatically.`;
  }

  if (input.posture === "needs_approval") {
    return `${input.proposedCount} worker task${input.proposedCount === 1 ? "" : "s"} must be reviewed before any dry-run rehearsal can start.`;
  }

  if (input.posture === "needs_task") {
    return "Create a guarded worker task proposal before testing future executor behavior.";
  }

  return "Resolve worker activation, reviewer authority, budget, or unsafe tool-scope issues before any executor work is considered.";
}

export function buildAiWorkerExecutionReadiness(
  input: BuildAiWorkerExecutionReadinessInput,
): AiWorkerExecutionReadinessResponse {
  const controlPlane = aiWorkerControlPlaneResponseSchema.parse(input.controlPlane);
  const actorRole = roleSchema.catch("member").parse(input.actorRole);
  const emailVerified = input.emailVerified === true;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workersById = new Map(controlPlane.workers.map((worker) => [worker.id, worker]));
  const activeWorkers = controlPlane.workers.filter((worker) => worker.status === "active");
  const approvedRuns = controlPlane.runs.filter((run) => run.status === "approved");
  const proposedRuns = controlPlane.runs.filter((run) => run.status === "proposed");
  const blockedRuns = controlPlane.runs.filter((run) => run.status === "blocked");
  const reviewerReady = roleCanReview(actorRole) && emailVerified;
  const remainingBudgetCents = Math.max(
    0,
    controlPlane.summary.budgetLimitCents - controlPlane.summary.budgetUsedCents,
  );
  const aiExecutionBudgetLimitCents = Math.max(
    0,
    Math.trunc(input.aiExecutionBudgetUsage?.usageLimit ?? remainingBudgetCents),
  );
  const aiExecutionBudgetUsageCents = Math.max(
    0,
    Math.trunc(input.aiExecutionBudgetUsage?.currentUsage ?? 0),
  );
  const aiExecutionBudgetRemainingCents = Math.max(
    0,
    Math.trunc(
      input.aiExecutionBudgetUsage?.remainingQuantity ??
        aiExecutionBudgetLimitCents - aiExecutionBudgetUsageCents,
    ),
  );
  const toolScopeViolations = activeWorkers.flatMap((worker) =>
    worker.allowedTools
      .filter((tool) => riskyTool(tool) && !worker.blockedTools.includes(tool))
      .map((tool) => ({
        workerId: worker.id,
        workerName: worker.name,
        tool,
        detail: `${worker.name} exposes ${tool} as an allowed tool without a matching blocked-tool guardrail.`,
      })),
  );
  const activeWorkersWithFallback = activeWorkers.filter((worker) => worker.guardrails.length > 0);
  const dryRunCandidates = approvedRuns.flatMap((run: AiWorkerRun) => {
    const worker = workersById.get(run.workerId);

    if (!worker || worker.status !== "active") {
      return [];
    }

    if (
      run.expectedCostCents > workerRemainingBudget(worker) ||
      run.expectedCostCents > aiExecutionBudgetRemainingCents
    ) {
      return [];
    }

    if (toolScopeViolations.some((violation) => violation.workerId === worker.id)) {
      return [];
    }

    return [{
      runId: run.id,
      workerId: worker.id,
      workerName: worker.name,
      title: run.title,
      expectedCostCents: run.expectedCostCents,
      allowedTools: worker.allowedTools.filter((tool) => !worker.blockedTools.includes(tool)),
      fallback: worker.guardrails[0] ?? "Pause the task and return to operator review.",
    }];
  });

  const checks = [
    check({
      id: "active-worker",
      label: "Active worker",
      status: activeWorkers.length > 0 ? "met" : "missing",
      detail:
        activeWorkers.length > 0
          ? `${activeWorkers.length} active worker${activeWorkers.length === 1 ? "" : "s"} can receive governed work.`
          : "No active worker is available for governed execution rehearsal.",
      evidence: ["/v1/ai-workers"],
    }),
    check({
      id: "approved-ledger",
      label: "Approved ledger",
      status: approvedRuns.length > 0 ? "met" : "missing",
      detail:
        approvedRuns.length > 0
          ? `${approvedRuns.length} approved run${approvedRuns.length === 1 ? "" : "s"} are ready for dry-run rehearsal.`
          : proposedRuns.length > 0
            ? `${proposedRuns.length} proposed run${proposedRuns.length === 1 ? "" : "s"} still need approval.`
            : "No worker task proposal has been approved yet.",
      evidence: ["/v1/action-proposals", "/v1/ai-workers"],
    }),
    check({
      id: "reviewer-authority",
      label: "Reviewer authority",
      status: reviewerReady ? "met" : "blocked",
      detail: reviewerReady
        ? "Current actor can review high-impact worker proposals."
        : "Owner/admin access with verified email is required before worker execution can be rehearsed.",
      evidence: ["session.role", "session.emailVerified"],
    }),
    check({
      id: "budget-ledger",
      label: "Budget ledger",
      status: remainingBudgetCents > 0 ? "met" : "blocked",
      detail:
        remainingBudgetCents > 0
          ? `${formatCents(remainingBudgetCents)} remains in the workspace worker budget.`
          : "Workspace worker budget is exhausted or unavailable.",
      evidence: ["/v1/ai-workers"],
    }),
    check({
      id: "plan-execution-budget",
      label: "Plan execution budget",
      status: aiExecutionBudgetRemainingCents > 0 ? "met" : "blocked",
      detail:
        aiExecutionBudgetRemainingCents > 0
          ? `${formatCents(aiExecutionBudgetRemainingCents)} remains in the plan-level AI dry-run execution budget.`
          : "Plan-level AI dry-run execution budget is exhausted or unavailable.",
      evidence: ["usage.ai_worker_execution_cents"],
    }),
    check({
      id: "tool-scope",
      label: "Tool scope",
      status: toolScopeViolations.length === 0 ? "met" : "blocked",
      detail:
        toolScopeViolations.length === 0
          ? "Active workers expose only review-safe tools or keep mutation tools blocked."
          : `${toolScopeViolations.length} active-worker tool scope issue${toolScopeViolations.length === 1 ? "" : "s"} must be fixed before executor work.`,
      evidence: ["/v1/ai-workers"],
    }),
    check({
      id: "manual-fallback",
      label: "Manual fallback",
      status:
        activeWorkers.length > 0 && activeWorkersWithFallback.length === activeWorkers.length
          ? "met"
          : "missing",
      detail:
        activeWorkers.length > 0 && activeWorkersWithFallback.length === activeWorkers.length
          ? "Every active worker has guardrails that can route failure back to an operator."
          : "Each active worker needs at least one explicit fallback guardrail.",
      evidence: ["/v1/ai-workers"],
    }),
  ];

  const hardBlocked = checks.some((item) => item.status === "blocked") ||
    activeWorkers.length === 0;
  const posture: AiWorkerExecutionReadinessPosture = hardBlocked
    ? "blocked"
    : dryRunCandidates.length > 0
      ? "dry_run_ready"
      : proposedRuns.length > 0
        ? "needs_approval"
        : "needs_task";
  const tone: AiWorkerExecutionReadinessTone =
    posture === "dry_run_ready" ? "good" : posture === "blocked" ? "blocked" : "warn";

  return aiWorkerExecutionReadinessResponseSchema.parse({
    surface: "ai-worker-execution-readiness",
    version,
    generatedAt,
    posture,
    tone,
    title: titleForPosture(posture),
    summary: summaryForPosture({
      posture,
      candidateCount: dryRunCandidates.length,
      proposedCount: proposedRuns.length,
    }),
    liveExecution: {
      enabled: false,
      status: "blocked",
      detail:
        "Live external tool execution is intentionally disabled until provider-specific runners, result ingestion, entitlement enforcement, and rollback tests exist.",
    },
    metrics: [
      {
        id: "active-workers",
        label: "Active workers",
        value: String(activeWorkers.length),
        detail: `${controlPlane.summary.paused} paused and ${controlPlane.summary.disabled} disabled worker${controlPlane.summary.disabled === 1 ? "" : "s"} are excluded from dry-run candidates.`,
        tone: activeWorkers.length > 0 ? "good" : "blocked",
      },
      {
        id: "approved-runs",
        label: "Approved runs",
        value: String(approvedRuns.length),
        detail: "Only approved worker runs can enter a dry-run execution harness.",
        tone: approvedRuns.length > 0 ? "good" : "warn",
      },
      {
        id: "pending-approvals",
        label: "Pending approvals",
        value: String(proposedRuns.length),
        detail: "Pending worker proposals stay in the approval path.",
        tone: proposedRuns.length > 0 ? "warn" : "good",
      },
      {
        id: "blocked-runs",
        label: "Blocked runs",
        value: String(blockedRuns.length),
        detail: "Blocked runs are evidence for budget, policy, or provider-readiness review.",
        tone: blockedRuns.length > 0 ? "blocked" : "good",
      },
      {
        id: "remaining-budget",
        label: "Remaining budget",
        value: formatCents(remainingBudgetCents),
        detail: "Budget is checked before dry-run candidates are listed.",
        tone: remainingBudgetCents > 0 ? "good" : "blocked",
      },
      {
        id: "plan-execution-budget",
        label: "Plan AI budget",
        value: `${formatCents(aiExecutionBudgetUsageCents)} / ${formatCents(aiExecutionBudgetLimitCents)}`,
        detail: "Plan-level dry-run execution budget is checked before result ingestion.",
        tone: aiExecutionBudgetRemainingCents > 0 ? "good" : "blocked",
      },
    ],
    checks,
    dryRunCandidates,
    toolScopeViolations,
    guardrails: [
      "This readiness report is deterministic and read-only; it never executes worker tools.",
      "Approved worker runs can be dry-run rehearsed only after role, email, budget, tool-scope, and fallback checks pass.",
      "Live provider actions, CRM writes, calendar writes, billing changes, and Telegram mutations remain blocked until separately implemented and tested.",
    ],
    unavailableClaims: [
      "Live external AI-worker tool execution",
      "Provider-specific worker task runners",
      "Automatic execution-result ingestion",
      "Live external AI execution billing",
    ],
  });
}
