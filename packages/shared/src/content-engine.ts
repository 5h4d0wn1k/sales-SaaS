import { z } from "zod";
import type { SalesBlueprint, SourcePlan } from "./domain";

export const contentOpportunityIntentSchema = z.enum([
  "seo_landing_page",
  "buyer_guide",
  "comparison_page",
  "regional_page",
  "template_offer",
  "risk_objection",
]);

export const contentOpportunityFunnelStageSchema = z.enum([
  "awareness",
  "consideration",
  "conversion",
]);

export const contentOpportunityStatusSchema = z.enum([
  "ready_for_brief",
  "needs_review",
  "blocked",
]);

export const contentOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  intent: contentOpportunityIntentSchema,
  funnelStage: contentOpportunityFunnelStageSchema,
  audience: z.string(),
  priority: z.number().int().min(0).max(100),
  targetKeywords: z.array(z.string()).min(1),
  sourceSignals: z.array(z.string()).min(1),
  suggestedChannels: z.array(z.string()).min(1),
  leadCaptureOffer: z.string(),
  guardrails: z.array(z.string()).min(1),
  nextAction: z.string(),
  status: contentOpportunityStatusSchema,
});

export const contentOpportunityInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(5),
});

export const contentOpportunityPlanSchema = z.object({
  generatedAt: z.string(),
  blueprintId: z.string().nullable(),
  workspaceBusinessName: z.string(),
  summary: z.string(),
  publishingBlocked: z.boolean(),
  blockers: z.array(z.string()),
  guardrails: z.array(z.string()),
  opportunities: z.array(contentOpportunitySchema),
});

export type ContentOpportunityIntent = z.infer<typeof contentOpportunityIntentSchema>;
export type ContentOpportunityFunnelStage = z.infer<
  typeof contentOpportunityFunnelStageSchema
>;
export type ContentOpportunityStatus = z.infer<typeof contentOpportunityStatusSchema>;
export type ContentOpportunity = z.infer<typeof contentOpportunitySchema>;
export type ContentOpportunityInput = z.infer<typeof contentOpportunityInputSchema>;
export type ContentOpportunityPlan = z.infer<typeof contentOpportunityPlanSchema>;

function compactList(values: Array<string | null | undefined>, fallback: string[]) {
  const seen = new Set<string>();
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

  return normalized.length > 0 ? normalized : fallback;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || "content-opportunity";
}

function opportunity(input: {
  index: number;
  title: string;
  intent: ContentOpportunityIntent;
  funnelStage: ContentOpportunityFunnelStage;
  audience: string;
  priority: number;
  targetKeywords: string[];
  sourceSignals: string[];
  suggestedChannels: string[];
  leadCaptureOffer: string;
  guardrails: string[];
  nextAction: string;
  status: ContentOpportunityStatus;
}): ContentOpportunity {
  const slug = slugify(input.title);

  return {
    id: `content_${input.index + 1}_${slug}`,
    slug,
    title: input.title,
    intent: input.intent,
    funnelStage: input.funnelStage,
    audience: input.audience,
    priority: input.priority,
    targetKeywords: compactList(input.targetKeywords, ["AI sales software"]),
    sourceSignals: compactList(input.sourceSignals, ["Sales Blueprint"]),
    suggestedChannels: compactList(input.suggestedChannels, ["email"]),
    leadCaptureOffer: input.leadCaptureOffer,
    guardrails: input.guardrails,
    nextAction: input.nextAction,
    status: input.status,
  };
}

export function buildContentOpportunityPlan(input: {
  blueprint: SalesBlueprint | null;
  sourcePlan?: SourcePlan | null;
  limit?: number;
  now?: Date;
}): ContentOpportunityPlan {
  const limit = contentOpportunityInputSchema.parse({ limit: input.limit }).limit;
  const generatedAt = (input.now ?? new Date()).toISOString();

  if (!input.blueprint) {
    return contentOpportunityPlanSchema.parse({
      generatedAt,
      blueprintId: null,
      workspaceBusinessName: "Workspace",
      summary:
        "Save a Sales Blueprint before generating content opportunities from business context.",
      publishingBlocked: true,
      blockers: ["Sales Blueprint is required before content planning."],
      guardrails: [
        "Do not publish AI-generated content without operator review.",
        "Do not claim universal lead scraping or autonomous outreach.",
      ],
      opportunities: [],
    });
  }

  const blueprint = input.blueprint;
  const business = blueprint.businessProfile;
  const audience = blueprint.icpSummary || business.targetAudience;
  const primaryRegion = business.regions[0] ?? "target regions";
  const primaryPain = blueprint.painPoints[0] ?? "manual prospecting";
  const primaryBuyer = blueprint.buyerRoles[0] ?? "sales operator";
  const primaryKeyword =
    blueprint.searchKeywords[0] ??
    input.sourcePlan?.searchTerms[0] ??
    `${business.industry} lead generation`;
  const secondaryKeyword =
    blueprint.searchKeywords[1] ??
    input.sourcePlan?.searchTerms[1] ??
    `${business.targetAudience} outbound workflow`;
  const sourceSignals = compactList(
    [
      ...blueprint.sourceChannels.map((source) => `${source} source evidence`),
      ...(input.sourcePlan?.sources ?? []).map((source) => `${source} source plan`),
      ...blueprint.qualificationRules.slice(0, 2),
    ],
    ["Sales Blueprint", "Source plan"],
  );
  const hasSourcePlanEvidence =
    Boolean(input.sourcePlan) &&
    ((input.sourcePlan?.sources.length ?? 0) > 0 ||
      (input.sourcePlan?.searchTerms.length ?? 0) > 0);
  const suggestedChannels = compactList(
    [...blueprint.outreachChannels, ...business.channels],
    ["email"],
  );
  const publishingBlocked =
    blueprint.status !== "ready" ||
    blueprint.readinessScore < 85 ||
    blueprint.readinessGaps.length > 0 ||
    !hasSourcePlanEvidence;
  const opportunityStatus: ContentOpportunityStatus = publishingBlocked
    ? "needs_review"
    : "ready_for_brief";
  const sharedGuardrails = compactList(
    [
      "Operator review is required before publishing.",
      "Use source-run evidence instead of unsupported proof claims.",
      "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
      business.constraints[0],
      blueprint.complianceNotes,
    ],
    [
      "Operator review is required before publishing.",
      "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
    ],
  );
  const baseOpportunities = [
    opportunity({
      index: 0,
      title: `AI sales workflow for ${audience}`,
      intent: "seo_landing_page",
      funnelStage: "consideration",
      audience,
      priority: 94,
      targetKeywords: [primaryKeyword, `${business.industry} sales automation`, "AI sales CRM"],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Sales Blueprint teardown request",
      guardrails: sharedGuardrails,
      nextAction: "Draft a claim-safe landing page brief from the Sales Blueprint.",
      status: opportunityStatus,
    }),
    opportunity({
      index: 1,
      title: `How ${primaryBuyer}s can fix ${primaryPain.toLowerCase()}`,
      intent: "buyer_guide",
      funnelStage: "awareness",
      audience: primaryBuyer,
      priority: 88,
      targetKeywords: [secondaryKeyword, primaryPain, `${primaryBuyer} outbound guide`],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Pipeline gap checklist",
      guardrails: sharedGuardrails,
      nextAction: "Prepare a practical guide with reviewable examples and no outcome guarantees.",
      status: opportunityStatus,
    }),
    opportunity({
      index: 2,
      title: `${business.industry} lead generation in ${primaryRegion}`,
      intent: "regional_page",
      funnelStage: "consideration",
      audience,
      priority: 84,
      targetKeywords: [
        `${business.industry} lead generation ${primaryRegion}`,
        primaryKeyword,
        `${primaryRegion} outbound sales`,
      ],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Regional source-plan consultation",
      guardrails: sharedGuardrails,
      nextAction: "Validate regional compliance notes before writing the page brief.",
      status: opportunityStatus,
    }),
    opportunity({
      index: 3,
      title: `${business.businessName} alternatives to manual prospecting`,
      intent: "comparison_page",
      funnelStage: "conversion",
      audience,
      priority: 79,
      targetKeywords: [
        "manual prospecting alternative",
        `${business.industry} outbound software`,
        "approval-gated sales automation",
      ],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Outbound workflow audit",
      guardrails: sharedGuardrails,
      nextAction: "Draft a comparison brief that distinguishes live features from roadmap items.",
      status: opportunityStatus,
    }),
    opportunity({
      index: 4,
      title: `Outbound compliance checklist for ${business.industry} teams`,
      intent: "risk_objection",
      funnelStage: "conversion",
      audience,
      priority: 76,
      targetKeywords: [
        "sales automation compliance checklist",
        "approval gated outreach",
        `${business.industry} outbound compliance`,
      ],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Suppression and approval readiness checklist",
      guardrails: sharedGuardrails,
      nextAction: "Pair the checklist with suppression, provider, and approval controls.",
      status: opportunityStatus,
    }),
    opportunity({
      index: 5,
      title: `${primaryBuyer} pipeline audit template`,
      intent: "template_offer",
      funnelStage: "awareness",
      audience: primaryBuyer,
      priority: 72,
      targetKeywords: [
        "pipeline audit template",
        `${primaryBuyer} sales template`,
        "lead qualification checklist",
      ],
      sourceSignals,
      suggestedChannels,
      leadCaptureOffer: "Downloadable pipeline audit worksheet",
      guardrails: sharedGuardrails,
      nextAction: "Turn qualification rules into a downloadable worksheet brief.",
      status: opportunityStatus,
    }),
  ];

  return contentOpportunityPlanSchema.parse({
    generatedAt,
    blueprintId: blueprint.id,
    workspaceBusinessName: business.businessName,
    summary: `Generated ${Math.min(limit, baseOpportunities.length)} reviewable content opportunities for ${audience}.`,
    publishingBlocked,
    blockers: publishingBlocked
      ? compactList(
          [
            ...blueprint.readinessGaps,
            ...(hasSourcePlanEvidence
              ? []
              : ["Source-plan evidence is required before marking generated content brief-ready."]),
          ],
          ["Blueprint must be ready before publishing generated content."],
        )
      : [],
    guardrails: sharedGuardrails,
    opportunities: baseOpportunities.slice(0, limit),
  });
}
