import type {
  AiWorkerControlPlaneResponse,
  ConversionWorkQueueResponse,
  DashboardResponse,
  PlanGrowthReadinessResponse,
} from "@sales/shared";
import type { DashboardCockpitTone } from "./dashboard-cockpit";
import {
  buildManagedServiceContactUrl,
  getManagedServicePackage,
  type ManagedServicePackage,
  type ManagedServicePackageKey,
} from "./managed-services";
import type { OperationalHealthModel } from "./operational-health";

export type ManagedSupportFitPosture =
  | "self_serve_ready"
  | "setup_recommended"
  | "operator_assist_recommended"
  | "managed_revops_recommended";

export type ManagedSupportFitSignal = {
  id:
    | "workflow-load"
    | "approval-load"
    | "conversion-load"
    | "plan-economics"
    | "ops-posture";
  label: string;
  value: string;
  detail: string;
  tone: DashboardCockpitTone;
};

export type ManagedSupportFit = {
  posture: ManagedSupportFitPosture;
  tone: DashboardCockpitTone;
  title: string;
  summary: string;
  packageKey: ManagedServicePackageKey;
  package: ManagedServicePackage;
  contactHref: string;
  contactLabel: string;
  metrics: Array<{ label: string; value: string }>;
  signals: ManagedSupportFitSignal[];
  guardrails: string[];
};

type ManagedSupportFitInput = {
  dashboard: Pick<
    DashboardResponse,
    "subscription" | "sourcePlan" | "sourceRuns" | "leads" | "campaigns" | "calls" | "meetings"
  >;
  planGrowthReadiness: PlanGrowthReadinessResponse | null;
  conversionWorkQueue: ConversionWorkQueueResponse | null;
  operationalHealth: OperationalHealthModel;
  pendingProposalCount: number;
  highRiskProposalCount: number;
  aiWorkerSummary?: AiWorkerControlPlaneResponse["summary"] | null;
};

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function pct(current: number, limit: number) {
  if (limit <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round((current / limit) * 100);
}

function toneForCount(count: number, warnAt: number, blockedAt: number): DashboardCockpitTone {
  if (count >= blockedAt) {
    return "blocked";
  }

  if (count >= warnAt) {
    return "warn";
  }

  return "good";
}

function packageForKey(packageKey: ManagedServicePackageKey) {
  const managedPackage = getManagedServicePackage(packageKey);

  if (!managedPackage) {
    throw new Error(`Managed service package ${packageKey} is not configured.`);
  }

  return managedPackage;
}

export function buildManagedSupportFit(input: ManagedSupportFitInput): ManagedSupportFit {
  const leadUtilization = pct(
    input.dashboard.subscription.monthlyUsage,
    input.dashboard.subscription.usageLimit,
  );
  const workflowLoad =
    input.dashboard.campaigns.length +
    input.dashboard.calls.length +
    input.dashboard.meetings.length;
  const conversionItems = input.conversionWorkQueue?.items.length ?? 0;
  const blockedConversionItems =
    input.conversionWorkQueue?.items.filter((item) => item.urgency === "blocked").length ?? 0;
  const highConversionItems =
    input.conversionWorkQueue?.items.filter((item) => item.urgency === "high").length ?? 0;
  const workerPressure =
    (input.aiWorkerSummary?.pendingApproval ?? 0) + (input.aiWorkerSummary?.blocked ?? 0);
  const setupIncomplete =
    !input.dashboard.sourcePlan ||
    input.dashboard.sourceRuns.length === 0 ||
    input.dashboard.leads.length === 0;
  const approvalLoad = input.pendingProposalCount + input.highRiskProposalCount + workerPressure;
  const opsBlocked = input.operationalHealth.posture === "blocked";
  const planBlocked = input.planGrowthReadiness?.posture === "blocked";
  const planUpgrade = input.planGrowthReadiness?.posture === "upgrade_recommended";
  const planWatch = input.planGrowthReadiness?.posture === "watch";
  const conversionBlocked =
    input.conversionWorkQueue?.posture === "blocked" ||
    blockedConversionItems > 0;
  const conversionNeedsHelp =
    conversionBlocked ||
    input.conversionWorkQueue?.posture === "overdue" ||
    input.conversionWorkQueue?.posture === "ready" ||
    highConversionItems > 0;
  const revopsPressure =
    planBlocked ||
    (planUpgrade && (workflowLoad >= 3 || approvalLoad >= 2 || leadUtilization >= 75)) ||
    (opsBlocked && (approvalLoad >= 2 || conversionItems >= 3)) ||
    leadUtilization >= 90;
  const operatorPressure =
    input.highRiskProposalCount > 0 ||
    input.pendingProposalCount >= 2 ||
    conversionNeedsHelp ||
    input.operationalHealth.posture === "warn" ||
    opsBlocked ||
    workerPressure > 0;

  const packageKey: ManagedServicePackageKey = revopsPressure
    ? "managed-revops"
    : operatorPressure
      ? "operator-assist"
      : "setup-sprint";
  const posture: ManagedSupportFitPosture = revopsPressure
    ? "managed_revops_recommended"
    : operatorPressure
      ? "operator_assist_recommended"
      : setupIncomplete
        ? "setup_recommended"
        : "self_serve_ready";
  const tone: DashboardCockpitTone =
    posture === "managed_revops_recommended"
      ? planBlocked || opsBlocked || conversionBlocked
        ? "blocked"
        : "warn"
      : posture === "operator_assist_recommended" || posture === "setup_recommended"
        ? "warn"
        : "good";
  const managedPackage = packageForKey(packageKey);
  const contactHref = buildManagedServiceContactUrl(
    packageKey,
    posture.replace(/_/g, "-"),
  );

  const signals: ManagedSupportFitSignal[] = [
    {
      id: "workflow-load",
      label: "Workflow load",
      value: String(workflowLoad),
      detail:
        workflowLoad > 0
          ? `${pluralize(workflowLoad, "active workflow record")} across campaigns, calls, and meetings.`
          : "No active campaign, call, or meeting workload is visible yet.",
      tone: toneForCount(workflowLoad, 3, 8),
    },
    {
      id: "approval-load",
      label: "Approval load",
      value: String(approvalLoad),
      detail:
        approvalLoad > 0
          ? `${pluralize(input.pendingProposalCount, "proposal")} plus ${pluralize(workerPressure, "AI-worker pressure point")} need review discipline.`
          : "Approval and AI-worker pressure is low enough for self-serve operation.",
      tone:
        input.highRiskProposalCount > 0 || workerPressure >= 2
          ? "blocked"
          : toneForCount(approvalLoad, 1, 4),
    },
    {
      id: "conversion-load",
      label: "Conversion load",
      value: String(conversionItems),
      detail:
        conversionItems > 0
          ? `${pluralize(conversionItems, "conversion task")} visible in the work queue.`
          : "No conversion follow-up queue is loaded or waiting.",
      tone: conversionBlocked ? "blocked" : toneForCount(conversionItems, 1, 5),
    },
    {
      id: "plan-economics",
      label: "Plan economics",
      value: input.planGrowthReadiness?.posture.replace(/_/g, " ") ?? "not loaded",
      detail:
        input.planGrowthReadiness?.summary ??
        "Plan growth readiness was unavailable, so managed support fit cannot inspect plan pressure.",
      tone:
        input.planGrowthReadiness?.posture === "blocked"
          ? "blocked"
          : input.planGrowthReadiness?.posture === "upgrade_recommended" ||
              input.planGrowthReadiness?.posture === "watch"
            ? "warn"
            : input.planGrowthReadiness
              ? "good"
              : "neutral",
    },
    {
      id: "ops-posture",
      label: "Operational posture",
      value: input.operationalHealth.label,
      detail: input.operationalHealth.summary,
      tone: input.operationalHealth.posture,
    },
  ];

  const title =
    posture === "managed_revops_recommended"
      ? "Managed RevOps should be scoped"
      : posture === "operator_assist_recommended"
        ? "Operator Assist is a strong fit"
        : posture === "setup_recommended"
          ? "Setup Sprint can speed launch"
          : "Self-serve looks reasonable";
  const summary =
    posture === "managed_revops_recommended"
      ? "Plan pressure, operational blockers, or multi-lane workload justify a paid managed rollout conversation before scaling."
      : posture === "operator_assist_recommended"
        ? "Approvals, conversion follow-up, or AI-worker review pressure suggest weekly operator support can protect quality."
        : posture === "setup_recommended"
          ? "The workspace is still early; a short setup sprint can tighten blueprint, source evidence, and launch discipline."
          : "Current pressure is low enough to keep operating self-serve while monitoring plan and workflow signals.";

  return {
    posture,
    tone,
    title,
    summary,
    packageKey,
    package: managedPackage,
    contactHref,
    contactLabel: `Scope ${managedPackage.tier}`,
    metrics: [
      { label: "Lead usage", value: `${leadUtilization}%` },
      { label: "Pending proposals", value: String(input.pendingProposalCount) },
      { label: "Conversion tasks", value: String(conversionItems) },
      { label: "Recommended support", value: managedPackage.tier },
    ],
    signals,
    guardrails: [
      "Managed-support fit is advisory and does not create a service contract, checkout, provider work, or billing change.",
      "Software subscription, provider costs, and managed-service scope must stay commercially separate.",
      "Managed support does not bypass approval gates, suppression checks, provider readiness, or customer-owned compliance decisions.",
    ],
  };
}
