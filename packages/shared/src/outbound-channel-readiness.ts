import { z } from "zod";
import {
  dashboardResponseSchema,
  outboundChannelSchema,
  providerSummarySchema,
  type DashboardResponse,
  type OutboundChannel,
  type ProviderSummary,
} from "./domain";
import type {
  ChannelEntitlementResult,
  UsageEntitlementResult,
} from "./policy";
import {
  getUpgradeRecommendation,
  type PlanUpgradeRecommendation,
} from "./billing/pricing";

export const outboundChannelReadinessPostureSchema = z.enum([
  "ready",
  "guarded",
  "blocked",
]);

export const outboundChannelReadinessStatusSchema = z.enum([
  "ready",
  "needs_review",
  "blocked",
  "roadmap",
]);

export const outboundChannelReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const outboundChannelReadinessControlStatusSchema = z.enum([
  "met",
  "missing",
  "not_applicable",
]);

export const outboundChannelReadinessConfigSchema = z.object({
  smsProviderConfigured: z.boolean().default(false),
  smsConsentPolicyConfigured: z.boolean().default(false),
  smsOptOutConfigured: z.boolean().default(false),
  smsCostCurveConfigured: z.boolean().default(false),
  socialProviderConfigured: z.boolean().default(false),
  socialPlatformPolicyConfigured: z.boolean().default(false),
  socialHumanReviewConfigured: z.boolean().default(false),
  socialCostCurveConfigured: z.boolean().default(false),
});

export const outboundChannelReadinessControlSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: outboundChannelReadinessControlStatusSchema,
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const outboundChannelReadinessMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: outboundChannelReadinessToneSchema,
});

export const outboundChannelReadinessChannelSchema = z.object({
  channel: outboundChannelSchema,
  label: z.string(),
  status: outboundChannelReadinessStatusSchema,
  tone: outboundChannelReadinessToneSchema,
  liveDispatchImplemented: z.boolean(),
  entitlementAllowed: z.boolean(),
  providerConfigured: z.boolean(),
  costCurveConfigured: z.boolean(),
  quotaMetric: z.string().nullable(),
  quotaRemaining: z.number().int().min(0).nullable(),
  detail: z.string(),
  controls: z.array(outboundChannelReadinessControlSchema),
  blockers: z.array(z.string()).default([]),
  recommendedPlan: z.object({
    planKey: z.string(),
    planName: z.string(),
    checkoutPath: z.string(),
  }).nullable(),
});

export const outboundChannelReadinessResponseSchema = z.object({
  surface: z.literal("outbound-channel-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: outboundChannelReadinessPostureSchema,
  summary: z.object({
    totalChannels: z.number().int().min(0),
    readyChannels: z.array(outboundChannelSchema),
    reviewOnlyChannels: z.array(outboundChannelSchema),
    blockedChannels: z.array(outboundChannelSchema),
    roadmapChannels: z.array(outboundChannelSchema),
    liveDispatchChannels: z.array(outboundChannelSchema),
  }),
  metrics: z.array(outboundChannelReadinessMetricSchema),
  channels: z.array(outboundChannelReadinessChannelSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type OutboundChannelReadinessPosture = z.infer<
  typeof outboundChannelReadinessPostureSchema
>;
export type OutboundChannelReadinessStatus = z.infer<
  typeof outboundChannelReadinessStatusSchema
>;
export type OutboundChannelReadinessTone = z.infer<
  typeof outboundChannelReadinessToneSchema
>;
export type OutboundChannelReadinessConfig = z.infer<
  typeof outboundChannelReadinessConfigSchema
>;
export type OutboundChannelReadinessResponse = z.infer<
  typeof outboundChannelReadinessResponseSchema
>;

type BuildOutboundChannelReadinessInput = {
  dashboard: DashboardResponse;
  providers: ProviderSummary;
  channelEntitlements: Record<OutboundChannel, ChannelEntitlementResult>;
  usage: {
    outreachDispatch: UsageEntitlementResult;
    voiceCall: UsageEntitlementResult;
    emailProviderCost: UsageEntitlementResult;
    voiceProviderCost: UsageEntitlementResult;
  };
  config?: Partial<OutboundChannelReadinessConfig>;
  generatedAt?: string;
};

const channelOrder: OutboundChannel[] = ["email", "call", "linkedin", "sms"];

const channelLabels: Record<OutboundChannel, string> = {
  email: "Email",
  call: "Voice",
  linkedin: "LinkedIn",
  sms: "SMS",
};

function toneForStatus(
  status: OutboundChannelReadinessStatus,
): OutboundChannelReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "needs_review") {
    return "warn";
  }

  return "blocked";
}

function control(input: {
  id: string;
  label: string;
  met?: boolean;
  status?: z.infer<typeof outboundChannelReadinessControlStatusSchema>;
  detail: string;
  evidence?: string[];
}) {
  return {
    id: input.id,
    label: input.label,
    status: input.status ?? (input.met ? "met" : "missing"),
    detail: input.detail,
    evidence: input.evidence ?? [],
  };
}

function blockersFromControls(
  controls: Array<z.infer<typeof outboundChannelReadinessControlSchema>>,
) {
  return controls
    .filter((entry) => entry.status === "missing")
    .map((entry) => entry.label);
}

function recommendedPlan(
  currentPlanKey: string,
  channel: OutboundChannel,
): Pick<PlanUpgradeRecommendation, "planKey" | "planName" | "checkoutPath"> | null {
  const recommendation = getUpgradeRecommendation({
    currentPlanKey,
    requiredChannel: channel,
  });

  return recommendation
    ? {
        planKey: recommendation.planKey,
        planName: recommendation.planName,
        checkoutPath: recommendation.checkoutPath,
      }
    : null;
}

function matchingProviderEntries(input: {
  providers: ProviderSummary;
  groups: Array<"outreach" | "voice">;
  channel: string;
  excludeProvider?: string;
}) {
  return input.groups
    .flatMap((group) => input.providers[group])
    .filter((provider) =>
      provider.provider !== input.excludeProvider &&
      provider.channels.includes(input.channel),
    );
}

function hasConfiguredProvider(input: {
  providers: ProviderSummary;
  groups: Array<"outreach" | "voice">;
  channel: string;
  excludeProvider?: string;
}) {
  return matchingProviderEntries(input).some(
    (provider) => provider.readiness === "configured",
  );
}

function usageDetail(
  usage: UsageEntitlementResult,
  unitLabel: string,
) {
  return usage.allowed
    ? `${usage.remainingQuantity.toLocaleString("en-US")} ${unitLabel} remaining.`
    : usage.reason;
}

function liveChannel(input: {
  channel: "email" | "call";
  entitlement: ChannelEntitlementResult;
  usage: UsageEntitlementResult;
  providerCost: UsageEntitlementResult;
  providerConfigured: boolean;
  quotaMetric: string;
  quotaUnitLabel: string;
  providerControlLabel: string;
  providerControlDetail: string;
  dispatchEndpoint: string;
  planKey: string;
}) {
  const label = channelLabels[input.channel];
  const controls = [
    control({
      id: "plan_channel",
      label: "Plan channel",
      met: input.entitlement.allowed,
      detail: input.entitlement.reason,
      evidence: ["included_channels"],
    }),
    control({
      id: "quota",
      label: input.quotaMetric,
      met: input.usage.allowed,
      detail: usageDetail(input.usage, input.quotaUnitLabel),
      evidence: [input.quotaMetric],
    }),
    control({
      id: "provider_cost_budget",
      label: "Provider-cost budget",
      met: input.providerCost.allowed,
      detail: usageDetail(input.providerCost, "provider-cost cents"),
      evidence: ["provider_cost_cents"],
    }),
    control({
      id: "provider",
      label: input.providerControlLabel,
      met: input.providerConfigured,
      detail: input.providerConfigured
        ? input.providerControlDetail
        : `${label} provider configuration is required before live dispatch.`,
      evidence: ["provider readiness"],
    }),
    control({
      id: "approval_suppression",
      label: "Approval and suppression gates",
      met: true,
      detail:
        "Verified-email, owner/admin approval, and workspace suppression checks run before live provider work.",
      evidence: ["campaign/call dispatch route", "suppression check"],
    }),
    control({
      id: "dispatch_endpoint",
      label: "Live dispatch endpoint",
      met: true,
      detail: `${label} dispatch is implemented at ${input.dispatchEndpoint}.`,
      evidence: [input.dispatchEndpoint],
    }),
  ];
  const blockers = blockersFromControls(controls);
  const status: OutboundChannelReadinessStatus =
    blockers.length === 0 ? "ready" : "blocked";

  return {
    channel: input.channel,
    label,
    status,
    tone: toneForStatus(status),
    liveDispatchImplemented: true,
    entitlementAllowed: input.entitlement.allowed,
    providerConfigured: input.providerConfigured,
    costCurveConfigured: true,
    quotaMetric: input.quotaMetric,
    quotaRemaining: input.usage.remainingQuantity,
    detail:
      status === "ready"
        ? `${label} can use the existing guarded dispatch path after approval and suppression checks.`
        : `${label} live dispatch is blocked until the missing controls are resolved.`,
    controls,
    blockers,
    recommendedPlan: input.entitlement.allowed
      ? null
      : recommendedPlan(input.planKey, input.channel),
  };
}

function buildLinkedInChannel(input: {
  entitlement: ChannelEntitlementResult;
  config: OutboundChannelReadinessConfig;
  planKey: string;
}) {
  const controls = [
    control({
      id: "plan_channel",
      label: "Plan channel",
      met: input.entitlement.allowed,
      detail: input.entitlement.reason,
      evidence: ["included_channels"],
    }),
    control({
      id: "platform_policy",
      label: "Platform policy review",
      met: input.config.socialPlatformPolicyConfigured,
      detail: input.config.socialPlatformPolicyConfigured
        ? "Deployment has a documented social-platform policy posture."
        : "Document platform-policy posture before expanding social workflows.",
      evidence: ["SOCIAL_PLATFORM_POLICY_URL"],
    }),
    control({
      id: "human_review",
      label: "Human review lane",
      met: input.config.socialHumanReviewConfigured,
      detail: input.config.socialHumanReviewConfigured
        ? "Human review is configured for social notes and channel decisions."
        : "Configure human review ownership before social-channel scale.",
      evidence: ["SOCIAL_HUMAN_REVIEW_CONFIGURED"],
    }),
    control({
      id: "social_provider",
      label: "Social provider integration",
      met: input.config.socialProviderConfigured,
      detail: input.config.socialProviderConfigured
        ? "A social provider readiness flag is present for future review."
        : "No live social provider is configured; LinkedIn remains review-only.",
      evidence: ["SOCIAL_PROVIDER_CONFIGURED"],
    }),
    control({
      id: "social_cost_curve",
      label: "Social cost curve",
      met: input.config.socialCostCurveConfigured,
      detail: input.config.socialCostCurveConfigured
        ? "A future social cost-curve policy is declared."
        : "Live social cost curves are still required before provider-backed scale.",
      evidence: ["SOCIAL_COST_CURVE_CONFIGURED"],
    }),
    control({
      id: "live_social_dispatch",
      label: "Live social dispatch endpoint",
      status: "not_applicable",
      detail:
        "No auto-connect, auto-DM, browser automation, scraping, or social-network mutation is implemented.",
      evidence: ["outreach sequence guardrails"],
    }),
  ];
  const status: OutboundChannelReadinessStatus = input.entitlement.allowed
    ? "needs_review"
    : "blocked";

  return {
    channel: "linkedin" as const,
    label: channelLabels.linkedin,
    status,
    tone: toneForStatus(status),
    liveDispatchImplemented: false,
    entitlementAllowed: input.entitlement.allowed,
    providerConfigured: input.config.socialProviderConfigured,
    costCurveConfigured: input.config.socialCostCurveConfigured,
    quotaMetric: null,
    quotaRemaining: null,
    detail: input.entitlement.allowed
      ? "LinkedIn is available only as a human-reviewed planning lane; no live social mutation is supported."
      : input.entitlement.reason,
    controls,
    blockers: blockersFromControls(controls),
    recommendedPlan: input.entitlement.allowed
      ? null
      : recommendedPlan(input.planKey, "linkedin"),
  };
}

function buildSmsChannel(input: {
  entitlement: ChannelEntitlementResult;
  config: OutboundChannelReadinessConfig;
  planKey: string;
}) {
  const controls = [
    control({
      id: "plan_channel",
      label: "Plan channel",
      met: input.entitlement.allowed,
      detail: input.entitlement.reason,
      evidence: ["included_channels"],
    }),
    control({
      id: "sms_provider",
      label: "SMS provider",
      met: input.config.smsProviderConfigured,
      detail: input.config.smsProviderConfigured
        ? "An SMS provider readiness flag is present for future implementation."
        : "No SMS provider integration is configured.",
      evidence: ["SMS_PROVIDER_CONFIGURED"],
    }),
    control({
      id: "sms_consent",
      label: "SMS consent policy",
      met: input.config.smsConsentPolicyConfigured,
      detail: input.config.smsConsentPolicyConfigured
        ? "SMS consent policy is declared for future implementation."
        : "SMS consent policy is required before any SMS workflow can scale.",
      evidence: ["SMS_CONSENT_POLICY_URL"],
    }),
    control({
      id: "sms_opt_out",
      label: "SMS opt-out handling",
      met: input.config.smsOptOutConfigured,
      detail: input.config.smsOptOutConfigured
        ? "SMS opt-out handling is declared for future implementation."
        : "SMS opt-out handling is required before any SMS workflow can scale.",
      evidence: ["SMS_OPT_OUT_CONFIGURED"],
    }),
    control({
      id: "sms_cost_curve",
      label: "SMS cost curve",
      met: input.config.smsCostCurveConfigured,
      detail: input.config.smsCostCurveConfigured
        ? "SMS cost-curve policy is declared for future implementation."
        : "SMS provider cost curves and quota policy are required before live SMS.",
      evidence: ["SMS_COST_CURVE_CONFIGURED"],
    }),
    control({
      id: "live_sms_dispatch",
      label: "Live SMS dispatch endpoint",
      met: false,
      detail:
        "No live SMS dispatch endpoint, provider adapter, quota meter, or SMS suppression workflow is implemented.",
      evidence: ["outreach sequence guardrails"],
    }),
  ];

  return {
    channel: "sms" as const,
    label: channelLabels.sms,
    status: "roadmap" as const,
    tone: toneForStatus("roadmap"),
    liveDispatchImplemented: false,
    entitlementAllowed: input.entitlement.allowed,
    providerConfigured: input.config.smsProviderConfigured,
    costCurveConfigured: input.config.smsCostCurveConfigured,
    quotaMetric: null,
    quotaRemaining: null,
    detail:
      "SMS remains roadmap even when readiness flags are present because live SMS dispatch and quota enforcement are not implemented.",
    controls,
    blockers: blockersFromControls(controls),
    recommendedPlan: input.entitlement.allowed
      ? null
      : recommendedPlan(input.planKey, "sms"),
  };
}

export function buildOutboundChannelReadiness(
  input: BuildOutboundChannelReadinessInput,
) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const providers = providerSummarySchema.parse(input.providers);
  const config = outboundChannelReadinessConfigSchema.parse(input.config ?? {});
  const planKey = dashboard.subscription.planKey;
  const emailProviderConfigured = hasConfiguredProvider({
    providers,
    groups: ["outreach"],
    channel: "email",
    excludeProvider: "linkedin-outreach",
  });
  const voiceProviderConfigured = hasConfiguredProvider({
    providers,
    groups: ["voice"],
    channel: "call",
  });
  const channelMap = {
    email: liveChannel({
      channel: "email",
      entitlement: input.channelEntitlements.email,
      usage: input.usage.outreachDispatch,
      providerCost: input.usage.emailProviderCost,
      providerConfigured: emailProviderConfigured,
      quotaMetric: "outreach_dispatches",
      quotaUnitLabel: "dispatches",
      providerControlLabel: "Email provider",
      providerControlDetail: "Configured SMTP or Resend delivery is available.",
      dispatchEndpoint: "/v1/campaigns/:id/dispatch",
      planKey,
    }),
    call: liveChannel({
      channel: "call",
      entitlement: input.channelEntitlements.call,
      usage: input.usage.voiceCall,
      providerCost: input.usage.voiceProviderCost,
      providerConfigured: voiceProviderConfigured,
      quotaMetric: "voice_calls",
      quotaUnitLabel: "voice calls",
      providerControlLabel: "Voice provider",
      providerControlDetail: "Configured Twilio voice delivery is available.",
      dispatchEndpoint: "/v1/calls/:id/dispatch",
      planKey,
    }),
    linkedin: buildLinkedInChannel({
      entitlement: input.channelEntitlements.linkedin,
      config,
      planKey,
    }),
    sms: buildSmsChannel({
      entitlement: input.channelEntitlements.sms,
      config,
      planKey,
    }),
  };
  const channels = channelOrder.map((channel) => channelMap[channel]);
  const readyChannels = channels
    .filter((channel) => channel.status === "ready")
    .map((channel) => channel.channel);
  const reviewOnlyChannels = channels
    .filter((channel) => channel.status === "needs_review")
    .map((channel) => channel.channel);
  const blockedChannels = channels
    .filter((channel) => channel.status === "blocked")
    .map((channel) => channel.channel);
  const roadmapChannels = channels
    .filter((channel) => channel.status === "roadmap")
    .map((channel) => channel.channel);
  const liveDispatchChannels = channels
    .filter((channel) => channel.status === "ready" && channel.liveDispatchImplemented)
    .map((channel) => channel.channel);
  const posture: OutboundChannelReadinessPosture =
    readyChannels.length === 0 && reviewOnlyChannels.length === 0
      ? "blocked"
      : blockedChannels.length > 0 || roadmapChannels.length > 0
        ? "guarded"
        : "ready";

  return outboundChannelReadinessResponseSchema.parse({
    surface: "outbound-channel-readiness",
    version: "2026-06-05.outbound-channel-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey,
    },
    posture,
    summary: {
      totalChannels: channels.length,
      readyChannels,
      reviewOnlyChannels,
      blockedChannels,
      roadmapChannels,
      liveDispatchChannels,
    },
    metrics: [
      {
        id: "live-dispatch",
        label: "Live dispatch",
        value: String(liveDispatchChannels.length),
        detail: `${liveDispatchChannels.length} channel${liveDispatchChannels.length === 1 ? "" : "s"} pass plan, quota, provider, and cost checks.`,
        tone: liveDispatchChannels.length > 0 ? "good" : "blocked",
      },
      {
        id: "review-only",
        label: "Review-only",
        value: String(reviewOnlyChannels.length),
        detail:
          "Review-only channels can guide operators but cannot mutate external networks.",
        tone: reviewOnlyChannels.length > 0 ? "warn" : "neutral",
      },
      {
        id: "blocked-or-roadmap",
        label: "Blocked or roadmap",
        value: String(blockedChannels.length + roadmapChannels.length),
        detail:
          "Missing entitlements, deployment controls, or unsupported endpoints stay visible before scale.",
        tone: blockedChannels.length + roadmapChannels.length > 0
          ? "blocked"
          : "good",
      },
    ],
    channels,
    guardrails: [
      "Outbound channel readiness is read-only and does not create campaigns, activities, calls, SMS, social actions, or provider work.",
      "Email and voice readiness mirrors the same plan-channel, quota, provider-cost, provider-readiness, approval, and suppression controls used by live dispatch routes.",
      "LinkedIn/social remains a human-reviewed planning lane; SMS remains roadmap until consent, opt-out, provider, quota, cost-curve, suppression, audit, and live-dispatch controls are implemented.",
    ],
    unavailableClaims: [
      "Live SMS dispatch, SMS quota enforcement, and SMS provider cost curves are not implemented.",
      "LinkedIn or social-network auto-connect, auto-DM, scraping, browser automation, and provider mutation are not implemented.",
      "Per-channel live quota enforcement beyond email outreach dispatches and voice calls is not implemented.",
    ],
  });
}
