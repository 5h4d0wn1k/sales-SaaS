import { z } from "zod";
import { outboundChannelSchema, subscriptionStatusSchema } from "./domain";

export const campaignPolicyInputSchema = z.object({
  approved: z.boolean(),
  firstAction: z.boolean(),
  highRiskChannel: z.boolean(),
  campaignStage: z.enum(["draft", "approved", "running", "paused"]),
  monthlyUsage: z.number().int().min(0),
  planLimit: z.number().int().positive(),
});

export type CampaignPolicyInput = z.infer<typeof campaignPolicyInputSchema>;

export type CampaignPolicyResult = {
  allowed: boolean;
  reason: string;
  nextStage: CampaignPolicyInput["campaignStage"];
};

export const usageEntitlementMetricSchema = z.enum([
  "leads_created",
  "outreach_dispatches",
  "voice_calls",
  "provider_cost_cents",
  "ai_worker_task_proposals",
  "ai_worker_execution_cents",
]);

export type UsageEntitlementMetric = z.infer<typeof usageEntitlementMetricSchema>;

const usageEntitlementMetricLabels: Record<UsageEntitlementMetric, string> = {
  leads_created: "leads created",
  outreach_dispatches: "outreach dispatches",
  voice_calls: "voice calls",
  provider_cost_cents: "provider cost budget",
  ai_worker_task_proposals: "AI worker task proposals",
  ai_worker_execution_cents: "AI worker execution budget",
};

export const usageEntitlementInputSchema = z.object({
  metric: usageEntitlementMetricSchema,
  planKey: z.string().min(1),
  subscriptionStatus: subscriptionStatusSchema,
  currentUsage: z.number().int().min(0),
  usageLimit: z.number().int().min(0),
  requestedQuantity: z.number().int().min(1).default(1),
  enforceLimit: z.boolean().default(true),
});

export type UsageEntitlementInput = z.infer<typeof usageEntitlementInputSchema>;

export type UsageEntitlementResult = {
  allowed: boolean;
  reason: string;
  metric: UsageEntitlementMetric;
  planKey: string;
  subscriptionStatus: UsageEntitlementInput["subscriptionStatus"];
  currentUsage: number;
  usageLimit: number;
  requestedQuantity: number;
  remainingQuantity: number;
};

export const channelEntitlementInputSchema = z.object({
  planKey: z.string().min(1),
  subscriptionStatus: subscriptionStatusSchema,
  channel: outboundChannelSchema,
  includedChannels: z.array(outboundChannelSchema),
});

export type ChannelEntitlementInput = z.infer<typeof channelEntitlementInputSchema>;

export type ChannelEntitlementResult = {
  allowed: boolean;
  reason: string;
  channel: ChannelEntitlementInput["channel"];
  planKey: string;
  subscriptionStatus: ChannelEntitlementInput["subscriptionStatus"];
  includedChannels: ChannelEntitlementInput["includedChannels"];
};

const channelLabels: Record<ChannelEntitlementInput["channel"], string> = {
  email: "Email",
  sms: "SMS",
  linkedin: "LinkedIn",
  call: "Call",
};

export function evaluateCampaignPolicy(input: CampaignPolicyInput): CampaignPolicyResult {
  if (input.monthlyUsage >= input.planLimit) {
    return {
      allowed: false,
      reason: "Monthly plan limit reached",
      nextStage: "paused",
    };
  }

  if (input.firstAction && !input.approved) {
    return {
      allowed: false,
      reason: "First outbound action requires approval",
      nextStage: "draft",
    };
  }

  if (input.highRiskChannel && !input.approved) {
    return {
      allowed: false,
      reason: "High-risk channels require approval",
      nextStage: "draft",
    };
  }

  return {
    allowed: true,
    reason: "Campaign execution permitted",
    nextStage: input.campaignStage === "draft" ? "running" : input.campaignStage,
  };
}

export function evaluateUsageEntitlement(input: UsageEntitlementInput): UsageEntitlementResult {
  const parsed = usageEntitlementInputSchema.parse(input);
  const remainingQuantity = Math.max(0, parsed.usageLimit - parsed.currentUsage);
  const base = {
    metric: parsed.metric,
    planKey: parsed.planKey,
    subscriptionStatus: parsed.subscriptionStatus,
    currentUsage: parsed.currentUsage,
    usageLimit: parsed.usageLimit,
    requestedQuantity: parsed.requestedQuantity,
    remainingQuantity,
  };

  if (parsed.subscriptionStatus === "past_due") {
    return {
      ...base,
      allowed: false,
      reason: "Subscription is past due. Resolve billing before creating new billable work.",
    };
  }

  if (parsed.subscriptionStatus === "canceled") {
    return {
      ...base,
      allowed: false,
      reason: "Subscription is canceled. Reactivate billing before creating new billable work.",
    };
  }

  if (parsed.enforceLimit && parsed.requestedQuantity > remainingQuantity) {
    return {
      ...base,
      allowed: false,
      reason: `Monthly ${usageEntitlementMetricLabels[parsed.metric]} limit reached for ${parsed.planKey}.`,
    };
  }

  return {
    ...base,
    allowed: true,
    reason: "Usage entitlement available.",
  };
}

export function evaluateChannelEntitlement(input: ChannelEntitlementInput): ChannelEntitlementResult {
  const parsed = channelEntitlementInputSchema.parse(input);
  const base = {
    channel: parsed.channel,
    planKey: parsed.planKey,
    subscriptionStatus: parsed.subscriptionStatus,
    includedChannels: parsed.includedChannels,
  };

  if (parsed.subscriptionStatus === "past_due") {
    return {
      ...base,
      allowed: false,
      reason: "Subscription is past due. Resolve billing before using outbound channels.",
    };
  }

  if (parsed.subscriptionStatus === "canceled") {
    return {
      ...base,
      allowed: false,
      reason: "Subscription is canceled. Reactivate billing before using outbound channels.",
    };
  }

  if (!parsed.includedChannels.includes(parsed.channel)) {
    return {
      ...base,
      allowed: false,
      reason: `${channelLabels[parsed.channel]} channel is not included in ${parsed.planKey}. Upgrade or choose an included channel.`,
    };
  }

  return {
    ...base,
    allowed: true,
    reason: `${channelLabels[parsed.channel]} channel is available for ${parsed.planKey}.`,
  };
}
