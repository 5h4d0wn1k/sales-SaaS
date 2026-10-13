import { z } from "zod";
import {
  actionProposalListResponseSchema,
  aiWorkerControlPlaneResponseSchema,
  contactIntakeBudgetRangeSchema,
  dashboardResponseSchema,
  type ActionProposalListResponse,
  type AiWorkerControlPlaneResponse,
  type DashboardResponse,
} from "./domain";
import {
  conversionWorkQueueResponseSchema,
  type ConversionWorkQueueResponse,
} from "./conversion-work-queue";
import {
  planGrowthReadinessResponseSchema,
  type PlanGrowthReadinessResponse,
} from "./plan-growth-readiness";

export const managedServicePackageKeySchema = z.enum([
  "setup-sprint",
  "operator-assist",
  "managed-revops",
]);

export const managedServiceBudgetRangeSchema = z.enum([
  "500_1500",
  "1500_5000",
  "5000_plus",
]);

export const managedServicePackageSchema = z.object({
  key: managedServicePackageKeySchema,
  tier: z.string(),
  bestFor: z.string(),
  includes: z.string(),
  outcome: z.string(),
  defaultBudgetRange: managedServiceBudgetRangeSchema,
  recommendedGoals: z.array(z.string()),
  operatingBoundary: z.string(),
});

export const managedServicePackages = [
  {
    key: "setup-sprint",
    tier: "Setup Sprint",
    bestFor: "Founder-led teams validating a first repeatable outbound motion",
    includes:
      "Blueprint setup, source strategy, approval policy review, and launch checklist",
    outcome: "Launch with a governed Sales Blueprint and source-review checklist",
    defaultBudgetRange: "500_1500",
    recommendedGoals: ["Build a Sales Blueprint", "Add managed rollout support"],
    operatingBoundary:
      "Setup support does not create live outreach, provider work, billing changes, or Telegram-controlled mutations.",
  },
  {
    key: "operator-assist",
    tier: "Operator Assist",
    bestFor:
      "Agencies or SMB teams that need review cadence while the product matures",
    includes:
      "Weekly workflow review, lead evidence checks, campaign approval support, and reporting rhythm",
    outcome:
      "Keep lead evidence, approvals, and reporting cadence moving with review support",
    defaultBudgetRange: "1500_5000",
    recommendedGoals: [
      "Launch approval-gated outreach",
      "Add managed rollout support",
    ],
    operatingBoundary:
      "Operator support can review and propose work, but customer-owned approvals and provider readiness still control execution.",
  },
  {
    key: "managed-revops",
    tier: "Managed RevOps",
    bestFor:
      "Higher-touch customers that need rollout planning across team, billing, and providers",
    includes:
      "Workspace governance, provider readiness planning, usage review, and optimization backlog",
    outcome:
      "Plan expansion across team workflow, provider readiness, usage, and conversion review",
    defaultBudgetRange: "5000_plus",
    recommendedGoals: [
      "Add managed rollout support",
      "Improve meetings and conversion",
    ],
    operatingBoundary:
      "Managed RevOps keeps software subscription, provider costs, and service scope commercially separate.",
  },
] satisfies z.infer<typeof managedServicePackageSchema>[];

export const managedServiceReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const managedServiceReadinessPostureSchema = z.enum([
  "ready_to_scope",
  "needs_operator_review",
  "blocked",
]);

export const managedServiceReadinessConfigSchema = z.object({
  scopePolicyConfigured: z.boolean().default(false),
  sowTemplateConfigured: z.boolean().default(false),
  pricingPolicyConfigured: z.boolean().default(false),
  deliveryOwner: z.string().trim().min(1).nullable().default(null),
  customerHandoffConfigured: z.boolean().default(false),
  providerCostPolicyConfigured: z.boolean().default(false),
  supportCapacityConfigured: z.boolean().default(false),
});

export const managedServiceReadinessMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: managedServiceReadinessToneSchema,
});

export const managedServiceReadinessControlSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  tone: managedServiceReadinessToneSchema,
  actionLabel: z.string(),
  href: z.string(),
  evidence: z.array(z.string()),
});

export const managedServiceReadinessNextActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  detail: z.string(),
  tone: managedServiceReadinessToneSchema,
});

export const managedServiceReadinessResponseSchema = z.object({
  surface: z.literal("managed-service-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: managedServiceReadinessPostureSchema,
  title: z.string(),
  summary: z.string(),
  recommendedPackage: managedServicePackageSchema,
  metrics: z.array(managedServiceReadinessMetricSchema),
  controls: z.array(managedServiceReadinessControlSchema),
  nextActions: z.array(managedServiceReadinessNextActionSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ManagedServicePackageKey = z.infer<typeof managedServicePackageKeySchema>;
export type ManagedServiceBudgetRange = z.infer<typeof managedServiceBudgetRangeSchema>;
export type ManagedServicePackage = z.infer<typeof managedServicePackageSchema>;
export type ManagedServiceReadinessConfig = z.infer<
  typeof managedServiceReadinessConfigSchema
>;
export type ManagedServiceReadinessPosture = z.infer<
  typeof managedServiceReadinessPostureSchema
>;
export type ManagedServiceReadinessTone = z.infer<
  typeof managedServiceReadinessToneSchema
>;
export type ManagedServiceReadinessResponse = z.infer<
  typeof managedServiceReadinessResponseSchema
>;

type BuildManagedServiceReadinessInput = {
  dashboard: DashboardResponse;
  planGrowthReadiness?: PlanGrowthReadinessResponse | null;
  conversionWorkQueue?: ConversionWorkQueueResponse | null;
  proposals?: Pick<ActionProposalListResponse, "summary"> | null;
  aiWorkerSummary?: AiWorkerControlPlaneResponse["summary"] | null;
  config?: Partial<ManagedServiceReadinessConfig> | null;
  generatedAt?: string;
};

function getManagedServicePackage(packageKey: ManagedServicePackageKey) {
  const managedPackage = managedServicePackages.find(
    (candidate) => candidate.key === packageKey,
  );

  if (!managedPackage) {
    throw new Error(`Managed service package ${packageKey} is not configured.`);
  }

  return managedServicePackageSchema.parse(managedPackage);
}

function titleForPosture(posture: ManagedServiceReadinessPosture) {
  if (posture === "blocked") {
    return "Managed rollout is blocked";
  }

  if (posture === "needs_operator_review") {
    return "Managed rollout needs operator review";
  }

  return "Managed rollout can be scoped";
}

function summaryForPosture(input: {
  posture: ManagedServiceReadinessPosture;
  recommendedPackage: ManagedServicePackage;
  blockers: number;
  warnings: number;
}) {
  if (input.posture === "blocked") {
    return `${input.blockers} managed-service control ${input.blockers === 1 ? "is" : "are"} blocking a paid rollout until scope, ownership, billing, or workflow risk is resolved.`;
  }

  if (input.posture === "needs_operator_review") {
    return `${input.recommendedPackage.tier} is the likely fit, but ${input.warnings} operator ${input.warnings === 1 ? "control needs" : "controls need"} review before sales or delivery treats the workspace as ready.`;
  }

  return `${input.recommendedPackage.tier} is ready to scope with the current subscription, handoff, owner, and approval posture.`;
}

function toneForBoolean(value: boolean): ManagedServiceReadinessTone {
  return value ? "good" : "blocked";
}

function normalizeCount(value: number | undefined) {
  return Math.max(0, Math.trunc(value ?? 0));
}

function contactHrefFor(packageKey: ManagedServicePackageKey, posture: string) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: "dashboard",
    utm_medium: "managed_service_readiness",
    utm_campaign: packageKey,
    managedPackage: packageKey,
    managedIntent: posture.replace(/_/g, "-"),
  });

  return `/contact?${params.toString()}`;
}

function buildConfig(input: Partial<ManagedServiceReadinessConfig> | null | undefined) {
  const parsed = managedServiceReadinessConfigSchema.partial().parse(input ?? {});

  return managedServiceReadinessConfigSchema.parse({
    scopePolicyConfigured: parsed.scopePolicyConfigured ?? false,
    sowTemplateConfigured: parsed.sowTemplateConfigured ?? false,
    pricingPolicyConfigured: parsed.pricingPolicyConfigured ?? false,
    deliveryOwner: parsed.deliveryOwner ?? null,
    customerHandoffConfigured: parsed.customerHandoffConfigured ?? false,
    providerCostPolicyConfigured: parsed.providerCostPolicyConfigured ?? false,
    supportCapacityConfigured: parsed.supportCapacityConfigured ?? false,
  });
}

export function buildManagedServiceReadiness(
  input: BuildManagedServiceReadinessInput,
) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const planGrowthReadiness = input.planGrowthReadiness
    ? planGrowthReadinessResponseSchema.parse(input.planGrowthReadiness)
    : null;
  const conversionWorkQueue = input.conversionWorkQueue
    ? conversionWorkQueueResponseSchema.parse(input.conversionWorkQueue)
    : null;
  const proposals = input.proposals
    ? actionProposalListResponseSchema.pick({ summary: true }).parse(input.proposals)
    : null;
  const aiWorkerSummary = input.aiWorkerSummary
    ? aiWorkerControlPlaneResponseSchema.shape.summary.parse(input.aiWorkerSummary)
    : null;
  const config = buildConfig(input.config);
  const pendingProposals = normalizeCount(proposals?.summary.pending);
  const highRiskProposals = normalizeCount(proposals?.summary.highRisk);
  const aiWorkerPressure =
    normalizeCount(aiWorkerSummary?.pendingApproval) +
    normalizeCount(aiWorkerSummary?.blocked);
  const conversionItems = normalizeCount(conversionWorkQueue?.items.length);
  const blockedConversionItems = normalizeCount(
    conversionWorkQueue?.items.filter((item) => item.urgency === "blocked").length,
  );
  const highConversionItems = normalizeCount(
    conversionWorkQueue?.items.filter((item) => item.urgency === "high").length,
  );
  const subscriptionBlocked =
    dashboard.subscription.status === "past_due" ||
    dashboard.subscription.status === "canceled";
  const planBlocked = planGrowthReadiness?.posture === "blocked";
  const planNeedsReview =
    !planGrowthReadiness ||
    planGrowthReadiness.posture === "upgrade_recommended" ||
    planGrowthReadiness.posture === "watch";
  const conversionBlocked =
    conversionWorkQueue?.posture === "blocked" || blockedConversionItems > 0;
  const conversionNeedsReview =
    !conversionWorkQueue ||
    conversionWorkQueue.posture === "overdue" ||
    conversionWorkQueue.posture === "ready" ||
    highConversionItems > 0;
  const commercialControlsConfigured =
    config.scopePolicyConfigured &&
    config.sowTemplateConfigured &&
    config.pricingPolicyConfigured &&
    Boolean(config.deliveryOwner) &&
    config.customerHandoffConfigured;
  const boundaryControlsConfigured =
    config.providerCostPolicyConfigured && config.supportCapacityConfigured;
  const commercialBlocked = !commercialControlsConfigured;
  const workflowBlocked =
    subscriptionBlocked ||
    planBlocked ||
    conversionBlocked ||
    highRiskProposals > 0;
  const deliveryPressure =
    pendingProposals +
    highRiskProposals +
    aiWorkerPressure +
    conversionItems;
  const recommendedPackageKey: ManagedServicePackageKey =
    workflowBlocked || planBlocked || conversionBlocked || deliveryPressure >= 6
      ? "managed-revops"
      : deliveryPressure >= 2 || planNeedsReview || conversionNeedsReview
        ? "operator-assist"
        : "setup-sprint";
  const recommendedPackage = getManagedServicePackage(recommendedPackageKey);
  const controls: ManagedServiceReadinessResponse["controls"] = [
    {
      id: "commercial-scope",
      title: "Commercial scope",
      detail: commercialControlsConfigured
        ? "Scope policy, SOW template, pricing policy, delivery owner, and customer handoff are configured."
        : "Configure scope policy, SOW template, pricing policy, delivery owner, and customer handoff before selling managed work as launch-ready.",
      tone: commercialControlsConfigured ? "good" : "blocked",
      actionLabel: "Review managed services",
      href: "/managed-services",
      evidence: [
        "MANAGED_SERVICE_SCOPE_POLICY_CONFIGURED",
        "MANAGED_SERVICE_SOW_TEMPLATE_CONFIGURED",
        "MANAGED_SERVICE_PRICING_POLICY_CONFIGURED",
        "MANAGED_SERVICE_DELIVERY_OWNER",
        "MANAGED_SERVICE_HANDOFF_CONFIGURED",
      ],
    },
    {
      id: "subscription-state",
      title: "Subscription state",
      detail: subscriptionBlocked
        ? `Subscription is ${dashboard.subscription.status.replace(/_/g, " ")}; managed delivery should not create billable platform work.`
        : `Subscription is ${dashboard.subscription.status.replace(/_/g, " ")} on ${dashboard.subscription.planKey}.`,
      tone: subscriptionBlocked || planBlocked ? "blocked" : planNeedsReview ? "warn" : "good",
      actionLabel: "Open billing",
      href: "/billing",
      evidence: ["/v1/dashboard", "/v1/growth/plan-readiness"],
    },
    {
      id: "provider-cost-boundary",
      title: "Provider-cost boundary",
      detail: config.providerCostPolicyConfigured
        ? "Provider spend policy is configured separately from managed-service fees."
        : "Provider cost policy is missing, so support scope could blur software, service, and vendor spend.",
      tone: config.providerCostPolicyConfigured ? "good" : "warn",
      actionLabel: "Review pricing",
      href: "/pricing",
      evidence: [
        "MANAGED_SERVICE_PROVIDER_COST_POLICY_CONFIGURED",
        "/v1/growth/plan-readiness",
      ],
    },
    {
      id: "support-capacity",
      title: "Support capacity",
      detail: config.supportCapacityConfigured
        ? "Managed-service capacity is declared for this deployment."
        : "Capacity ownership is missing, so sales should not imply guaranteed implementation availability.",
      tone: config.supportCapacityConfigured ? "good" : "warn",
      actionLabel: "Open contact",
      href: contactHrefFor(recommendedPackage.key, "capacity-review"),
      evidence: ["MANAGED_SERVICE_CAPACITY_CONFIGURED"],
    },
    {
      id: "approval-workload",
      title: "Approval workload",
      detail:
        highRiskProposals > 0
          ? `${highRiskProposals} high-risk proposal ${highRiskProposals === 1 ? "requires" : "require"} review before managed delivery can advance.`
          : pendingProposals + aiWorkerPressure > 0
            ? `${pendingProposals} pending proposal ${pendingProposals === 1 ? "and" : "plus"} ${aiWorkerPressure} AI-worker pressure point ${pendingProposals + aiWorkerPressure === 1 ? "needs" : "need"} review cadence.`
            : "Approval and AI-worker pressure is clear enough for managed scoping.",
      tone:
        highRiskProposals > 0
          ? "blocked"
          : pendingProposals + aiWorkerPressure >= 2
            ? "warn"
            : "good",
      actionLabel: "Open approvals",
      href: "/dashboard#approval-inbox",
      evidence: ["/v1/action-proposals", "/v1/ai-workers"],
    },
    {
      id: "conversion-workload",
      title: "Conversion workload",
      detail:
        conversionWorkQueue === null
          ? "Conversion work queue was unavailable, so delivery readiness cannot inspect meeting and follow-up pressure."
          : conversionBlocked
            ? `${blockedConversionItems} blocked conversion item ${blockedConversionItems === 1 ? "is" : "are"} waiting.`
            : conversionItems > 0
              ? `${conversionItems} conversion item ${conversionItems === 1 ? "is" : "are"} visible for managed cadence.`
              : "Conversion follow-up queue is clear.",
      tone: conversionBlocked
        ? "blocked"
        : conversionNeedsReview
          ? "warn"
          : "good",
      actionLabel: "Review conversion",
      href: "/dashboard#calls-and-meetings",
      evidence: ["/v1/conversion/work-queue"],
    },
  ];

  const blockerCount = controls.filter((control) => control.tone === "blocked").length;
  const warningCount = controls.filter((control) => control.tone === "warn").length;
  const posture: ManagedServiceReadinessPosture =
    blockerCount > 0 || workflowBlocked || commercialBlocked
      ? "blocked"
      : warningCount > 0 || !boundaryControlsConfigured || planNeedsReview || conversionNeedsReview
        ? "needs_operator_review"
        : "ready_to_scope";
  const deliveryOwner = config.deliveryOwner ?? "Not assigned";
  const nextActions: ManagedServiceReadinessResponse["nextActions"] = [
    {
      id: "scope-managed-package",
      label: `Scope ${recommendedPackage.tier}`,
      href: contactHrefFor(recommendedPackage.key, posture),
      detail:
        "Send the current package fit into managed-services intake without changing billing or provider configuration.",
      tone: posture === "blocked" ? "blocked" : "good",
    },
    ...(subscriptionBlocked || planBlocked || planNeedsReview
      ? [
          {
            id: "review-plan-economics",
            label: "Review plan economics",
            href: "/billing",
            detail:
              "Inspect subscription status, usage, provider budget, and plan-fit before service work scales.",
            tone: subscriptionBlocked || planBlocked ? "blocked" as const : "warn" as const,
          },
        ]
      : []),
    ...(pendingProposals + highRiskProposals + aiWorkerPressure > 0
      ? [
          {
            id: "review-approval-load",
            label: "Review approval load",
            href: "/dashboard#approval-inbox",
            detail:
              "Clear high-risk proposals and AI-worker review pressure before managed work becomes execution pressure.",
            tone: highRiskProposals > 0 ? "blocked" as const : "warn" as const,
          },
        ]
      : []),
    {
      id: "review-managed-services",
      label: "Review managed services",
      href: "/managed-services",
      detail:
        "Compare Setup Sprint, Operator Assist, and Managed RevOps boundaries before a commercial handoff.",
      tone: "neutral",
    },
  ];

  return managedServiceReadinessResponseSchema.parse({
    surface: "managed-service-readiness",
    version: "2026-06-06.managed-service-readiness",
    generatedAt,
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title: titleForPosture(posture),
    summary: summaryForPosture({
      posture,
      recommendedPackage,
      blockers: blockerCount,
      warnings: warningCount,
    }),
    recommendedPackage,
    metrics: [
      {
        id: "recommended-package",
        label: "Recommended package",
        value: recommendedPackage.tier,
        detail: recommendedPackage.bestFor,
        tone: posture === "blocked" ? "blocked" : "good",
      },
      {
        id: "delivery-owner",
        label: "Delivery owner",
        value: deliveryOwner,
        detail: config.deliveryOwner
          ? "Managed-service delivery ownership is configured."
          : "Assign an owner before sales treats managed delivery as launch-ready.",
        tone: config.deliveryOwner ? "good" : "blocked",
      },
      {
        id: "approval-load",
        label: "Approval load",
        value: String(pendingProposals + highRiskProposals + aiWorkerPressure),
        detail: `${pendingProposals} pending proposals, ${highRiskProposals} high-risk proposals, and ${aiWorkerPressure} AI-worker pressure points.`,
        tone:
          highRiskProposals > 0
            ? "blocked"
            : pendingProposals + aiWorkerPressure >= 2
              ? "warn"
              : "good",
      },
      {
        id: "conversion-load",
        label: "Conversion load",
        value: String(conversionItems),
        detail: conversionWorkQueue?.summary ?? "Conversion queue was not available.",
        tone: conversionBlocked
          ? "blocked"
          : conversionNeedsReview
            ? "warn"
            : "good",
      },
      {
        id: "plan-posture",
        label: "Plan posture",
        value: planGrowthReadiness?.posture.replace(/_/g, " ") ?? "not loaded",
        detail:
          planGrowthReadiness?.summary ??
          "Plan growth readiness was not available for managed-service scoping.",
        tone: planBlocked
          ? "blocked"
          : planNeedsReview
            ? "warn"
            : "good",
      },
    ],
    controls,
    nextActions,
    guardrails: [
      "Managed-service readiness is read-only; it does not create a service contract, checkout, billing change, provider work, or Telegram-controlled mutation.",
      "Software subscription, provider costs, and managed-service scope must stay commercially separate.",
      "Managed support cannot bypass approval gates, suppression checks, provider readiness, audit evidence, or customer-owned compliance decisions.",
      "Readiness is based on current workspace evidence and does not guarantee leads, meetings, conversion, revenue, deliverability, or legal compliance.",
    ],
    unavailableClaims: [
      "No managed-service contract, SOW, checkout, invoice, or payment-provider mutation is created by this surface.",
      "No live source procurement, outreach dispatch, call dispatch, CRM/calendar sync, provider mutation, or Telegram-controlled execution is performed.",
      "No guaranteed revenue, meeting volume, conversion lift, deliverability, or compliance outcome is implied.",
      contactIntakeBudgetRangeSchema.parse(recommendedPackage.defaultBudgetRange) &&
        "Budget ranges are intake guidance only and do not authorize spend.",
    ].filter(Boolean),
  });
}
