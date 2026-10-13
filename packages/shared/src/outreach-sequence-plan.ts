import { z } from "zod";
import {
  dashboardResponseSchema,
  leadStatusSchema,
  outboundChannelSchema,
  type DashboardResponse,
  type LeadRecord,
  type OutboundChannel,
  type SalesBlueprint,
} from "./domain";
import {
  getPlanIncludedChannels,
  getUpgradeRecommendation,
  type PlanUpgradeRecommendation,
} from "./billing/pricing";

export const outreachSequencePlanToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const outreachSequencePlanPostureSchema = z.enum([
  "blueprint_required",
  "lead_required",
  "review_ready",
  "channel_review",
]);

export const outreachSequenceChannelStatusSchema = z.enum([
  "included",
  "requires_upgrade",
  "roadmap",
]);

export const outreachSequenceCandidateSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  company: z.string().nullable(),
  status: leadStatusSchema,
  score: z.number().int().min(0).max(100),
  source: z.string(),
  lastTouchpoint: z.string(),
  contactability: z.array(outboundChannelSchema),
  personalizationSignals: z.array(z.string()),
});

export const outreachSequenceChannelSchema = z.object({
  channel: outboundChannelSchema,
  label: z.string(),
  status: outreachSequenceChannelStatusSchema,
  tone: outreachSequencePlanToneSchema,
  detail: z.string(),
  recommendedPlan: z.object({
    planKey: z.string(),
    planName: z.string(),
    checkoutPath: z.string(),
  }).nullable(),
});

export const outreachSequenceStepSchema = z.object({
  id: z.string(),
  dayOffset: z.number().int().min(0),
  channel: outboundChannelSchema,
  title: z.string(),
  objective: z.string(),
  leadSegment: z.string(),
  sampleSubject: z.string().nullable(),
  sampleBody: z.string(),
  personalizationSignals: z.array(z.string()),
  approvalRequired: z.boolean(),
  riskLevel: z.enum(["low", "medium", "high"]),
  providerWork: z.literal(false),
  gatedBy: z.array(z.string()),
});

export const outreachSequenceMetricSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  detail: z.string(),
  tone: outreachSequencePlanToneSchema,
});

export const outreachSequenceNextActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  detail: z.string(),
  tone: outreachSequencePlanToneSchema,
});

export const outreachSequencePlanResponseSchema = z.object({
  surface: z.literal("outreach-sequence-plan"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: outreachSequencePlanPostureSchema,
  title: z.string(),
  summary: z.string(),
  metrics: z.array(outreachSequenceMetricSchema),
  channels: z.array(outreachSequenceChannelSchema),
  candidates: z.array(outreachSequenceCandidateSchema),
  steps: z.array(outreachSequenceStepSchema),
  nextActions: z.array(outreachSequenceNextActionSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type OutreachSequencePlanPosture = z.infer<typeof outreachSequencePlanPostureSchema>;
export type OutreachSequencePlanTone = z.infer<typeof outreachSequencePlanToneSchema>;
export type OutreachSequencePlanResponse = z.infer<typeof outreachSequencePlanResponseSchema>;

type BuildOutreachSequencePlanInput = {
  dashboard: DashboardResponse;
  blueprint?: SalesBlueprint | null;
  generatedAt?: string;
  maxCandidates?: number;
};

const candidateStatuses = new Set<LeadRecord["status"]>([
  "new",
  "qualified",
  "contacted",
  "meeting_booked",
]);

const channelAliases: Array<{ channel: OutboundChannel; matchers: string[] }> = [
  { channel: "email", matchers: ["email", "mail", "inbox"] },
  { channel: "sms", matchers: ["sms", "text", "whatsapp"] },
  { channel: "linkedin", matchers: ["linkedin", "linked in"] },
  { channel: "call", matchers: ["call", "phone", "voice", "dial"] },
];

const channelCopy: Record<
  OutboundChannel,
  {
    label: string;
    dayOffset: number;
    title: string;
    objective: string;
    subject: string | null;
    riskLevel: "low" | "medium" | "high";
  }
> = {
  email: {
    label: "Email",
    dayOffset: 0,
    title: "First-touch value hypothesis",
    objective: "Open a relevant business problem with evidence from the lead record.",
    subject: "Relevant outbound operating gap",
    riskLevel: "medium",
  },
  linkedin: {
    label: "LinkedIn",
    dayOffset: 2,
    title: "Social review touch",
    objective: "Prepare a short human-reviewed social note without automated posting or scraping.",
    subject: null,
    riskLevel: "high",
  },
  call: {
    label: "Call",
    dayOffset: 3,
    title: "Consultative call attempt",
    objective: "Use the reviewed lead evidence to qualify timing, owner, and next meeting fit.",
    subject: null,
    riskLevel: "high",
  },
  sms: {
    label: "SMS",
    dayOffset: 5,
    title: "Consent-sensitive short follow-up",
    objective: "Hold as a roadmap or explicitly approved channel where consent and policy allow it.",
    subject: null,
    riskLevel: "high",
  },
};

function channelLabel(channel: OutboundChannel) {
  return channelCopy[channel].label;
}

function compactList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None";
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

function uniqueChannels(channels: OutboundChannel[]) {
  const seen = new Set<OutboundChannel>();
  return channels.filter((channel) => {
    if (seen.has(channel)) {
      return false;
    }

    seen.add(channel);
    return true;
  });
}

function contactabilityForLead(lead: LeadRecord) {
  const channels: OutboundChannel[] = [];
  if (lead.email) {
    channels.push("email");
  }

  if (lead.phone) {
    channels.push("call", "sms");
  }

  return channels;
}

function personalizationSignals(lead: LeadRecord, blueprint: SalesBlueprint | null) {
  return [
    `${lead.company ?? lead.fullName} from ${lead.source}`,
    `Lead score ${lead.score}`,
    lead.lastTouchpoint,
    blueprint?.icpSummary ?? null,
    blueprint?.painPoints[0] ? `Pain point: ${blueprint.painPoints[0]}` : null,
    blueprint?.qualificationRules[0] ? `Rule: ${blueprint.qualificationRules[0]}` : null,
  ].filter((value): value is string => Boolean(value));
}

function candidateFromLead(lead: LeadRecord, blueprint: SalesBlueprint | null) {
  return {
    id: lead.id,
    fullName: lead.fullName,
    company: lead.company ?? null,
    status: lead.status,
    score: lead.score,
    source: lead.source,
    lastTouchpoint: lead.lastTouchpoint,
    contactability: contactabilityForLead(lead),
    personalizationSignals: personalizationSignals(lead, blueprint).slice(0, 4),
  };
}

function sampleBodyForChannel(input: {
  channel: OutboundChannel;
  lead: OutreachSequencePlanResponse["candidates"][number] | null;
  blueprint: SalesBlueprint | null;
}) {
  const businessName = input.blueprint?.businessProfile.businessName ?? "your team";
  const offer = input.blueprint?.businessProfile.offerSummary ?? "the current offer";
  const pain = input.blueprint?.painPoints[0] ?? "pipeline quality and follow-through";
  const leadName = input.lead?.fullName ?? "the lead";
  const company = input.lead?.company ?? "their company";
  const evidence = input.lead?.personalizationSignals[0] ?? "the reviewed lead evidence";

  if (input.channel === "email") {
    return `Hi ${leadName}, I noticed ${evidence}. ${businessName} is focused on ${offer}. Worth comparing notes on whether ${pain} is creating a revenue operations gap for ${company}?`;
  }

  if (input.channel === "linkedin") {
    return `Reviewed social note for ${leadName}: reference ${evidence}, connect it to ${pain}, and ask for permission to share a short relevant idea. Do not auto-connect or auto-DM.`;
  }

  if (input.channel === "call") {
    return `Call opener for ${leadName}: confirm context from ${evidence}, ask who owns ${pain}, and offer a short meeting only if the problem is active.`;
  }

  return `SMS placeholder for ${leadName}: use only with explicit consent and local policy review. Keep it to a short opt-in follow-up tied to ${pain}.`;
}

function postureTitle(posture: OutreachSequencePlanPosture) {
  if (posture === "blueprint_required") {
    return "Sales Blueprint required";
  }

  if (posture === "lead_required") {
    return "Lead evidence required";
  }

  if (posture === "channel_review") {
    return "Sequence needs channel review";
  }

  return "Outreach sequence ready for review";
}

function postureSummary(input: {
  posture: OutreachSequencePlanPosture;
  candidateCount: number;
  stepCount: number;
  blockedChannelCount: number;
}) {
  if (input.posture === "blueprint_required") {
    return "Save a Sales Blueprint before drafting channel sequence guidance.";
  }

  if (input.posture === "lead_required") {
    return "Run source evidence or add qualified leads before creating a reviewable sequence.";
  }

  if (input.posture === "channel_review") {
    return `${input.stepCount} reviewable steps are drafted, with ${input.blockedChannelCount} channel${input.blockedChannelCount === 1 ? "" : "s"} requiring plan or policy review.`;
  }

  return `${input.stepCount} reviewable steps are drafted for ${input.candidateCount} lead${input.candidateCount === 1 ? "" : "s"} without creating provider work.`;
}

function channelStatus(input: {
  channel: OutboundChannel;
  includedChannels: OutboundChannel[];
  subscriptionPlanKey: string;
}): OutreachSequencePlanResponse["channels"][number] {
  const recommendation = getUpgradeRecommendation({
    currentPlanKey: input.subscriptionPlanKey,
    requiredChannel: input.channel,
  });
  const included = input.includedChannels.includes(input.channel);
  const isRoadmap = input.channel === "sms";
  const status = included ? "included" : isRoadmap ? "roadmap" : "requires_upgrade";
  const recommendedPlan: Pick<
    PlanUpgradeRecommendation,
    "planKey" | "planName" | "checkoutPath"
  > | null = recommendation
    ? {
        planKey: recommendation.planKey,
        planName: recommendation.planName,
        checkoutPath: recommendation.checkoutPath,
      }
    : null;

  return {
    channel: input.channel,
    label: channelLabel(input.channel),
    status,
    tone: status === "included" ? "good" : status === "roadmap" ? "blocked" : "warn",
    detail: included
      ? `${channelLabel(input.channel)} is included in ${input.subscriptionPlanKey}.`
      : isRoadmap
        ? "SMS remains roadmap until consent, provider, and policy controls are mature."
        : `${channelLabel(input.channel)} needs a plan upgrade or channel review before live work.`,
    recommendedPlan,
  };
}

export function buildOutreachSequencePlan(input: BuildOutreachSequencePlanInput) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const blueprint = input.blueprint ?? null;
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const maxCandidates = Math.min(8, Math.max(1, Math.trunc(input.maxCandidates ?? 5)));
  const includedChannels = getPlanIncludedChannels(dashboard.subscription.planKey);
  const candidates = dashboard.leads
    .filter((lead) => candidateStatuses.has(lead.status))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidates)
    .map((lead) => candidateFromLead(lead, blueprint));
  const requestedChannels = uniqueChannels([
    ...inferChannels([
      dashboard.workspace.primaryChannel,
      ...dashboard.campaigns.map((campaign) => campaign.channel),
      ...(blueprint?.businessProfile.channels ?? []),
      ...(blueprint?.outreachChannels ?? []),
    ]),
    "email",
  ]);
  const channels = requestedChannels.map((channel) =>
    channelStatus({
      channel,
      includedChannels,
      subscriptionPlanKey: dashboard.subscription.planKey,
    }),
  );
  const blockedChannelCount = channels.filter((channel) => channel.status !== "included").length;
  const lead = candidates[0] ?? null;
  const steps = channels.map((channel, index) => {
    const copy = channelCopy[channel.channel];
    return {
      id: `step-${index + 1}-${channel.channel}`,
      dayOffset: copy.dayOffset,
      channel: channel.channel,
      title: copy.title,
      objective: copy.objective,
      leadSegment: lead
        ? `${lead.status.replace("_", " ")} leads like ${lead.fullName}`
        : "Qualified leads from reviewed source evidence",
      sampleSubject: copy.subject,
      sampleBody: sampleBodyForChannel({
        channel: channel.channel,
        lead,
        blueprint,
      }),
      personalizationSignals: (lead?.personalizationSignals ?? [
        blueprint?.icpSummary ?? "Sales Blueprint ICP",
        blueprint?.businessProfile.targetAudience ?? "target audience",
      ]).slice(0, 4),
      approvalRequired: true,
      riskLevel: copy.riskLevel,
      providerWork: false as const,
      gatedBy: [
        "owner/admin approval",
        "verified email",
        "suppression check",
        "plan channel entitlement",
        "provider readiness",
      ],
    };
  });
  const posture: OutreachSequencePlanPosture = !blueprint
    ? "blueprint_required"
    : candidates.length === 0
      ? "lead_required"
      : blockedChannelCount > 0
        ? "channel_review"
        : "review_ready";
  const contactableCandidateCount = candidates.filter(
    (candidate) => candidate.contactability.length > 0,
  ).length;
  const metrics: OutreachSequencePlanResponse["metrics"] = [
    {
      id: "candidates",
      label: "Candidate leads",
      value: String(candidates.length),
      detail: `${contactableCandidateCount} candidates have at least one direct contact route.`,
      tone: candidates.length > 0 ? "good" : "blocked",
    },
    {
      id: "sequence-steps",
      label: "Sequence steps",
      value: String(steps.length),
      detail: `${steps.length} steps drafted without provider work.`,
      tone: steps.length > 0 ? "good" : "blocked",
    },
    {
      id: "channel-review",
      label: "Channel review",
      value: String(blockedChannelCount),
      detail: blockedChannelCount > 0
        ? `${blockedChannelCount} channel${blockedChannelCount === 1 ? "" : "s"} need plan or policy review.`
        : "All planned channels are included in the current plan.",
      tone: blockedChannelCount > 0 ? "warn" : "good",
    },
  ];
  const nextActions: OutreachSequencePlanResponse["nextActions"] = [
    ...(!blueprint
      ? [
          {
            id: "complete-blueprint",
            label: "Complete Sales Blueprint",
            href: "/sales-blueprint",
            detail: "Define ICP, offer, pain points, channels, and compliance notes before drafting outreach.",
            tone: "blocked" as const,
          },
        ]
      : []),
    ...(candidates.length === 0
      ? [
          {
            id: "run-source-evidence",
            label: "Run source evidence",
            href: "/dashboard#lead-sources",
            detail: "Create reviewed lead evidence before drafting first-touch copy.",
            tone: "warn" as const,
          },
        ]
      : []),
    ...(blockedChannelCount > 0
      ? [
          {
            id: "review-channel-fit",
            label: "Review channel fit",
            href: "/dashboard#approval-inbox",
            detail: "Resolve plan, provider, or policy blockers before using the blocked channels.",
            tone: "warn" as const,
          },
        ]
      : []),
    {
      id: "create-campaign",
      label: "Create draft campaign",
      href: "/dashboard#outreach-operations",
      detail: "Turn the reviewed sequence into a draft campaign; approval and dispatch gates still apply.",
      tone: candidates.length > 0 && blueprint ? "good" : "neutral",
    },
  ];

  return outreachSequencePlanResponseSchema.parse({
    surface: "outreach-sequence-plan",
    version: "2026-06-04.outreach-sequence-plan",
    generatedAt,
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    title: postureTitle(posture),
    summary: postureSummary({
      posture,
      candidateCount: candidates.length,
      stepCount: steps.length,
      blockedChannelCount,
    }),
    metrics,
    channels,
    candidates,
    steps,
    nextActions,
    guardrails: [
      "Outreach sequence planning is read-only; no campaign, activity, provider send, call, SMS, social action, or CRM record is created.",
      "Every step remains approval-gated and must pass verified-email, suppression, entitlement, provider-readiness, and audit checks before live execution.",
      "Generated copy is deterministic operator guidance from workspace context and reviewed lead evidence, not autonomous outreach.",
    ],
    unavailableClaims: [
      "No automatic email send, phone call, LinkedIn action, SMS send, scraping, enrichment purchase, or provider mutation is performed.",
      "No deliverability, response, meeting, or revenue outcome is guaranteed.",
      "SMS and social-network automation require separate provider, consent, platform-policy, and legal review before live use.",
    ],
  });
}
