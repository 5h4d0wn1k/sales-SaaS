import { z } from "zod";
import {
  dashboardResponseSchema,
  outboundChannelSchema,
  subscriptionStatusSchema,
  type DashboardResponse,
  type OutboundChannel,
  type SalesBlueprint,
} from "./domain";
import {
  getPlanByKey,
  getPlanIncludedChannels,
  getPlanOutreachDispatchLimit,
  getPlanProviderCostBudgetCents,
  getPlanVoiceCallLimit,
  getUpgradeRecommendation,
} from "./billing/pricing";

export const planGrowthReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const planGrowthReadinessPostureSchema = z.enum([
  "healthy",
  "watch",
  "upgrade_recommended",
  "blocked",
]);

export const planGrowthReadinessSignalSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  tone: planGrowthReadinessToneSchema,
  current: z.number().int().min(0).optional(),
  limit: z.number().int().min(0).optional(),
  utilizationPct: z.number().int().min(0).max(999).optional(),
  actionLabel: z.string(),
  href: z.string(),
});

export const planGrowthReadinessMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: planGrowthReadinessToneSchema,
});

export const planGrowthReadinessNextActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  detail: z.string(),
  tone: planGrowthReadinessToneSchema,
});

export const planGrowthReadinessUpgradeSchema = z.object({
  planKey: z.string(),
  planName: z.string(),
  description: z.string(),
  price: z.object({
    usd: z.number().min(0),
    inr: z.number().min(0),
  }),
  usageLimit: z.number().int().min(0),
  outreachDispatchLimit: z.number().int().min(0).default(0),
  voiceCallLimit: z.number().int().min(0).default(0),
  providerCostBudgetCents: z.number().int().min(0),
  aiWorkerTaskProposalLimit: z.number().int().min(0).default(0),
  aiWorkerExecutionBudgetCents: z.number().int().min(0).default(0),
  includedChannels: z.array(outboundChannelSchema),
  checkoutPath: z.string(),
});

export const planGrowthReadinessResponseSchema = z.object({
  surface: z.literal("plan-growth-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: planGrowthReadinessPostureSchema,
  title: z.string(),
  summary: z.string(),
  metrics: z.array(planGrowthReadinessMetricSchema),
  signals: z.array(planGrowthReadinessSignalSchema),
  recommendedPlan: planGrowthReadinessUpgradeSchema.nullable(),
  nextActions: z.array(planGrowthReadinessNextActionSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type PlanGrowthReadinessPosture = z.infer<typeof planGrowthReadinessPostureSchema>;
export type PlanGrowthReadinessTone = z.infer<typeof planGrowthReadinessToneSchema>;
export type PlanGrowthReadinessResponse = z.infer<typeof planGrowthReadinessResponseSchema>;

type BuildPlanGrowthReadinessInput = {
  dashboard: DashboardResponse;
  blueprint?: SalesBlueprint | null;
  outreachDispatchUsage?: number;
  voiceCallUsage?: number;
  providerCostUsageCents?: number;
  generatedAt?: string;
};

const channelAliases: Array<{ channel: OutboundChannel; matchers: string[] }> = [
  { channel: "email", matchers: ["email", "mail", "inbox"] },
  { channel: "sms", matchers: ["sms", "text", "whatsapp"] },
  { channel: "linkedin", matchers: ["linkedin", "linked in"] },
  { channel: "call", matchers: ["call", "phone", "voice", "dial"] },
];

function pct(current: number, limit: number) {
  if (limit <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round((current / limit) * 100);
}

function capacityTone(current: number, limit: number): PlanGrowthReadinessTone {
  if (limit <= 0) {
    return current > 0 ? "blocked" : "warn";
  }

  const utilization = current / limit;
  if (utilization >= 1) {
    return "blocked";
  }

  if (utilization >= 0.85) {
    return "warn";
  }

  return "good";
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function channelLabel(channel: OutboundChannel) {
  return channel === "sms"
    ? "SMS"
    : channel === "linkedin"
      ? "LinkedIn"
      : channel.charAt(0).toUpperCase() + channel.slice(1);
}

function compactChannels(channels: OutboundChannel[]) {
  return channels.length > 0 ? channels.map(channelLabel).join(", ") : "None";
}

function inferChannels(values: string[]) {
  const channels = new Set<OutboundChannel>();

  for (const value of values) {
    const normalized = value.toLowerCase();
    for (const { channel, matchers } of channelAliases) {
      if (matchers.some((matcher) => normalized.includes(matcher))) {
        channels.add(channel);
      }
    }
  }

  return [...channels];
}

function uniqueActions(
  actions: PlanGrowthReadinessResponse["nextActions"],
): PlanGrowthReadinessResponse["nextActions"] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) {
      return false;
    }

    seen.add(action.id);
    return true;
  });
}

function titleForPosture(posture: PlanGrowthReadinessPosture) {
  if (posture === "blocked") {
    return "Plan growth is blocked";
  }

  if (posture === "upgrade_recommended") {
    return "Upgrade before the next scale push";
  }

  if (posture === "watch") {
    return "Plan fit needs operator review";
  }

  return "Plan fit is healthy";
}

function summaryForPosture(input: {
  posture: PlanGrowthReadinessPosture;
  recommendedPlanName?: string | null;
  missingChannels: OutboundChannel[];
}) {
  if (input.posture === "blocked") {
    return "Resolve billing status or exhausted capacity before creating more billable sales work.";
  }

  if (input.posture === "upgrade_recommended") {
    const plan = input.recommendedPlanName ?? "the next plan";
    const channelDetail = input.missingChannels.length > 0
      ? ` and unlock ${compactChannels(input.missingChannels)}`
      : "";
    return `Move to ${plan} before scaling usage${channelDetail}.`;
  }

  if (input.posture === "watch") {
    return "The workspace can keep operating, but plan fit, blueprint readiness, or provider budget deserves review before heavier execution.";
  }

  return "Usage, provider budget, channel access, and blueprint readiness are aligned for the current operating level.";
}

export function buildPlanGrowthReadiness(input: BuildPlanGrowthReadinessInput) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const subscription = dashboard.subscription;
  const currentPlan = getPlanByKey(subscription.planKey);
  const includedChannels = getPlanIncludedChannels(subscription.planKey);
  const outreachDispatchLimit = getPlanOutreachDispatchLimit(subscription.planKey);
  const voiceCallLimit = getPlanVoiceCallLimit(subscription.planKey);
  const outreachDispatchUsage = Math.max(0, Math.trunc(input.outreachDispatchUsage ?? 0));
  const voiceCallUsage = Math.max(0, Math.trunc(input.voiceCallUsage ?? 0));
  const providerBudgetCents = getPlanProviderCostBudgetCents(subscription.planKey);
  const providerUsageCents = Math.max(0, Math.trunc(input.providerCostUsageCents ?? 0));
  const leadUsage = subscription.monthlyUsage;
  const leadLimit = subscription.usageLimit;
  const leadUtilizationPct = pct(leadUsage, leadLimit);
  const outreachUtilizationPct = pct(outreachDispatchUsage, outreachDispatchLimit);
  const voiceUtilizationPct = pct(voiceCallUsage, voiceCallLimit);
  const providerUtilizationPct = pct(providerUsageCents, providerBudgetCents);
  const blueprint = input.blueprint ?? null;
  const requestedChannels = inferChannels([
    dashboard.workspace.primaryChannel,
    ...dashboard.campaigns.map((campaign) => campaign.channel),
    ...(blueprint?.businessProfile.channels ?? []),
    ...(blueprint?.outreachChannels ?? []),
  ]);
  const missingChannels = requestedChannels.filter((channel) => !includedChannels.includes(channel));
  const blueprintTone: PlanGrowthReadinessTone = !blueprint
    ? "warn"
    : blueprint.readinessScore >= 80 && blueprint.readinessGaps.length === 0
      ? "good"
      : "warn";
  const leadTone = capacityTone(leadUsage, leadLimit);
  const outreachTone = capacityTone(outreachDispatchUsage, outreachDispatchLimit);
  const voiceTone = capacityTone(voiceCallUsage, voiceCallLimit);
  const providerTone = capacityTone(providerUsageCents, providerBudgetCents);
  const subscriptionBlocked = subscription.status === "past_due" || subscription.status === "canceled";
  const leadBlocked = leadUsage >= leadLimit;
  const outreachBlocked = outreachDispatchLimit > 0
    ? outreachDispatchUsage >= outreachDispatchLimit
    : outreachDispatchUsage > 0;
  const voiceBlocked = voiceCallLimit > 0
    ? voiceCallUsage >= voiceCallLimit
    : voiceCallUsage > 0;
  const providerBlocked = providerBudgetCents > 0
    ? providerUsageCents >= providerBudgetCents
    : providerUsageCents > 0;
  const hasGrowthIntent = Boolean(
    blueprint ||
      dashboard.sourcePlan ||
      dashboard.campaigns.length > 0 ||
      dashboard.sourceRuns.length > 0 ||
      requestedChannels.length > 0,
  );
  const needsProviderBudget = providerBudgetCents === 0 && hasGrowthIntent;
  const needsUsageUpgrade = leadUtilizationPct >= 85 || (blueprint?.monthlyLeadTarget ?? 0) > leadLimit;
  const hasOutreachIntent = Boolean(
    dashboard.campaigns.length > 0 ||
      requestedChannels.some((channel) => channel === "email" || channel === "linkedin" || channel === "sms" || channel === "call"),
  );
  const hasVoiceIntent = requestedChannels.includes("call");
  const needsOutreachUpgrade =
    outreachUtilizationPct >= 85 ||
    outreachBlocked ||
    (outreachDispatchLimit === 0 && hasOutreachIntent);
  const needsVoiceUpgrade =
    voiceUtilizationPct >= 85 ||
    voiceBlocked ||
    (voiceCallLimit === 0 && hasVoiceIntent);
  const needsProviderUpgrade =
    providerUtilizationPct >= 85 ||
    providerBlocked ||
    needsProviderBudget;
  const needsChannelUpgrade = missingChannels.length > 0;
  const recommendedPlan = getUpgradeRecommendation({
    currentPlanKey: subscription.planKey,
    minUsageLimit: needsUsageUpgrade
      ? Math.max(leadLimit + 1, blueprint?.monthlyLeadTarget ?? 0)
      : undefined,
    minOutreachDispatchLimit: needsOutreachUpgrade
      ? Math.max(outreachDispatchLimit + 1, outreachDispatchUsage + 1, 1)
      : undefined,
    minVoiceCallLimit: needsVoiceUpgrade
      ? Math.max(voiceCallLimit + 1, voiceCallUsage + 1, hasVoiceIntent ? 1 : 0)
      : undefined,
    minProviderCostBudgetCents: needsProviderUpgrade
      ? Math.max(providerBudgetCents + 1, providerUsageCents + 1, 1)
      : undefined,
    requiredChannels: missingChannels,
  });

  const posture: PlanGrowthReadinessPosture = subscriptionBlocked || leadBlocked || outreachBlocked || voiceBlocked || providerBlocked
    ? "blocked"
    : needsUsageUpgrade || needsOutreachUpgrade || needsVoiceUpgrade || needsProviderUpgrade || needsChannelUpgrade
      ? "upgrade_recommended"
      : leadUtilizationPct >= 65 || outreachUtilizationPct >= 65 || voiceUtilizationPct >= 65 || blueprintTone === "warn"
        ? "watch"
        : "healthy";

  const signals: PlanGrowthReadinessResponse["signals"] = [
    {
      id: "lead-capacity",
      title: "Lead usage capacity",
      detail:
        leadTone === "blocked"
          ? "Monthly lead capacity is exhausted for the current plan."
          : needsUsageUpgrade
            ? "Lead usage or blueprint target is approaching the current plan limit."
            : "Lead usage is inside the current monthly allowance.",
      tone: leadTone,
      current: leadUsage,
      limit: leadLimit,
      utilizationPct: leadUtilizationPct,
      actionLabel: "Review billing",
      href: "/billing",
    },
    {
      id: "outreach-quota",
      title: "Outreach dispatch quota",
      detail:
        outreachDispatchLimit === 0
          ? "The current plan has no live campaign dispatch quota."
          : outreachTone === "blocked"
            ? "Monthly campaign dispatch quota is exhausted for this plan."
            : outreachTone === "warn"
              ? "Campaign dispatch quota is nearing the monthly limit."
              : "Campaign dispatch quota is inside the current monthly allowance.",
      tone: outreachDispatchLimit === 0 && hasOutreachIntent ? "warn" : outreachTone,
      current: outreachDispatchUsage,
      limit: outreachDispatchLimit,
      utilizationPct: outreachUtilizationPct,
      actionLabel: "Review pricing",
      href: "/pricing",
    },
    {
      id: "voice-quota",
      title: "Voice call quota",
      detail:
        voiceCallLimit === 0
          ? "The current plan has no live voice-call quota."
          : voiceTone === "blocked"
            ? "Monthly voice-call quota is exhausted for this plan."
            : voiceTone === "warn"
              ? "Voice-call quota is nearing the monthly limit."
              : "Voice-call quota is inside the current monthly allowance.",
      tone: voiceCallLimit === 0 && hasVoiceIntent ? "warn" : voiceTone,
      current: voiceCallUsage,
      limit: voiceCallLimit,
      utilizationPct: voiceUtilizationPct,
      actionLabel: "Review pricing",
      href: "/pricing",
    },
    {
      id: "provider-budget",
      title: "Provider-cost budget",
      detail:
        providerBudgetCents === 0
          ? "The current plan has no provider-cost budget for live configured execution."
          : providerTone === "blocked"
            ? "Provider-cost budget is exhausted for this plan."
            : providerTone === "warn"
              ? "Provider-cost budget is nearing the monthly limit."
              : "Provider-cost budget is inside the current monthly allowance.",
      tone: needsProviderBudget ? "warn" : providerTone,
      current: providerUsageCents,
      limit: providerBudgetCents,
      utilizationPct: providerUtilizationPct,
      actionLabel: "Review billing",
      href: "/billing",
    },
    {
      id: "channel-fit",
      title: "Outbound channel fit",
      detail:
        missingChannels.length > 0
          ? `${compactChannels(missingChannels)} requested by the workspace is not included in ${subscription.planKey}.`
          : `Included channels cover current workspace intent: ${compactChannels(includedChannels)}.`,
      tone: missingChannels.length > 0 ? "warn" : "good",
      actionLabel: missingChannels.length > 0 ? "Compare plans" : "View plans",
      href: "/pricing",
    },
    {
      id: "blueprint-readiness",
      title: "Sales Blueprint readiness",
      detail: !blueprint
        ? "Save a Sales Blueprint before using plan pressure as a scale decision."
        : blueprint.readinessGaps[0] ??
          `${blueprint.status.replace("_", " ")} blueprint is ready at ${blueprint.readinessScore}/100.`,
      tone: blueprintTone,
      current: blueprint?.readinessScore,
      limit: 100,
      utilizationPct: blueprint?.readinessScore,
      actionLabel: "Open blueprint",
      href: "/sales-blueprint",
    },
    {
      id: "billing-state",
      title: "Subscription state",
      detail: subscriptionBlocked
        ? `Subscription is ${subscription.status.replace("_", " ")}; billable work should stay paused.`
        : `Subscription is ${subscription.status.replace("_", " ")} on ${currentPlan?.name ?? subscription.planKey}.`,
      tone: subscriptionBlocked ? "blocked" : "good",
      actionLabel: "Open billing",
      href: "/billing",
    },
  ];

  const metrics: PlanGrowthReadinessResponse["metrics"] = [
    {
      id: "lead-usage",
      label: "Lead usage",
      value: `${leadUsage.toLocaleString("en-US")} / ${leadLimit.toLocaleString("en-US")}`,
      detail: `${leadUtilizationPct}% of monthly lead capacity used.`,
      tone: leadTone,
    },
    {
      id: "outreach-quota",
      label: "Dispatch quota",
      value: `${outreachDispatchUsage.toLocaleString("en-US")} / ${outreachDispatchLimit.toLocaleString("en-US")}`,
      detail: outreachDispatchLimit === 0
        ? "No live campaign dispatch quota is included on this plan."
        : `${outreachUtilizationPct}% of monthly campaign dispatch quota used.`,
      tone: outreachDispatchLimit === 0 && hasOutreachIntent ? "warn" : outreachTone,
    },
    {
      id: "voice-quota",
      label: "Voice quota",
      value: `${voiceCallUsage.toLocaleString("en-US")} / ${voiceCallLimit.toLocaleString("en-US")}`,
      detail: voiceCallLimit === 0
        ? "No live voice-call quota is included on this plan."
        : `${voiceUtilizationPct}% of monthly voice-call quota used.`,
      tone: voiceCallLimit === 0 && hasVoiceIntent ? "warn" : voiceTone,
    },
    {
      id: "provider-budget",
      label: "Provider budget",
      value: `${formatCents(providerUsageCents)} / ${formatCents(providerBudgetCents)}`,
      detail: providerBudgetCents === 0
        ? "No provider-cost budget is included on this plan."
        : `${providerUtilizationPct}% of monthly provider budget used.`,
      tone: needsProviderBudget ? "warn" : providerTone,
    },
    {
      id: "channels",
      label: "Included channels",
      value: compactChannels(includedChannels),
      detail: missingChannels.length > 0
        ? `Missing ${compactChannels(missingChannels)} for current workspace intent.`
        : "Current workspace channels fit the plan catalog.",
      tone: missingChannels.length > 0 ? "warn" : "good",
    },
    {
      id: "recommended-plan",
      label: "Recommended plan",
      value: recommendedPlan?.planName ?? "None",
      detail: recommendedPlan
        ? `${recommendedPlan.planName} expands capacity before the next scale push.`
        : "No upgrade is recommended from current usage and channel intent.",
      tone: recommendedPlan ? "warn" : "good",
    },
  ];

  const nextActions = uniqueActions([
    ...(recommendedPlan
      ? [
          {
            id: "review-upgrade",
            label: `Review ${recommendedPlan.planName}`,
            href: recommendedPlan.checkoutPath,
            detail: "Compare the recommended plan against expected source volume and configured provider usage.",
            tone: "warn" as const,
          },
        ]
      : []),
    ...(blueprintTone === "warn"
      ? [
          {
            id: "complete-blueprint",
            label: "Complete Sales Blueprint",
            href: "/sales-blueprint",
            detail: "Tighten ICP, source channels, outreach channels, and approval rules before scaling.",
            tone: "warn" as const,
          },
        ]
      : []),
    ...(needsProviderUpgrade || subscriptionBlocked
      ? [
          {
            id: "review-billing",
            label: "Review billing",
            href: "/billing",
            detail: "Inspect subscription status, dispatch quota, voice quota, provider-cost budget, and payment state.",
            tone: subscriptionBlocked ? "blocked" as const : "warn" as const,
          },
        ]
      : []),
    {
      id: "review-pricing",
      label: "Compare plan limits",
      href: "/pricing",
      detail: "Keep the public plan catalog aligned with expected usage, channel access, and cost-to-serve.",
      tone: "neutral",
    },
  ]);

  return planGrowthReadinessResponseSchema.parse({
    surface: "plan-growth-readiness",
    version: "2026-06-04.plan-growth-readiness",
    generatedAt,
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: subscription.planKey,
    },
    posture,
    title: titleForPosture(posture),
    summary: summaryForPosture({
      posture,
      recommendedPlanName: recommendedPlan?.planName ?? null,
      missingChannels,
    }),
    metrics,
    signals,
    recommendedPlan,
    nextActions,
    guardrails: [
      "Plan growth readiness is read-only; no subscription, payment provider, provider configuration, or usage record is mutated.",
      "Upgrade guidance is based on the shared plan catalog, workspace usage, dispatch/call quotas, and Sales Blueprint intent; it is not guaranteed revenue.",
      "Provider-cost usage reflects platform budget posture and is not an accounting, invoice, or payment reconciliation record.",
    ],
    unavailableClaims: [
      "No automatic billing upgrade, checkout completion, or payment provider mutation is performed.",
      "No revenue lift, meeting volume, provider deliverability, or compliance outcome is guaranteed.",
      "No live provider procurement, legal approval, or channel-policy bypass is included in this readiness surface.",
    ],
  });
}
