import type { ContactBudgetRange } from "./roi-contact-context";

export type LeadGenerationIntent =
  | "workspace_start"
  | "rollout_review"
  | "blueprint_review"
  | "pricing_review"
  | "source_plan";

export type LeadGenerationContactSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  utm_source?: string | string[];
  leadGenIntent?: string | string[];
};

export type LeadGenerationContactContext = {
  label: "AI lead generation software";
  intent: LeadGenerationIntent;
  intentLabel: string;
  sourcePath: "/ai-lead-generation-software";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 750;
  channels: string[];
  goals: string[];
};

export const leadGenerationUtmSource = "ai_lead_generation_software";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): LeadGenerationIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "blueprint_review" ||
    value === "pricing_review" ||
    value === "source_plan"
  ) {
    return value;
  }

  return "source_plan";
}

function intentLabel(intent: LeadGenerationIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "blueprint_review") {
    return "Blueprint review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Source plan";
}

export function buildLeadGenerationContactUrl(
  intent: LeadGenerationIntent = "rollout_review",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: leadGenerationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "lead_generation_software",
    leadGenIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildLeadGenerationGetStartedUrl(
  intent: LeadGenerationIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: leadGenerationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "lead_generation_software",
    leadGenIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildLeadGenerationPricingUrl(
  intent: LeadGenerationIntent = "pricing_review",
) {
  const params = new URLSearchParams({
    utm_source: leadGenerationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "lead_generation_software",
    leadGenIntent: intent,
  });

  return `/pricing?${params.toString()}`;
}

export function parseLeadGenerationContactContext(
  params: LeadGenerationContactSearchParams | undefined,
): LeadGenerationContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== leadGenerationUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.leadGenIntent)?.trim());

  return {
    label: "AI lead generation software",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/ai-lead-generation-software",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 750,
    channels: ["website", "directory", "email", "call", "linkedin review", "telegram"],
    goals: [
      "Build a Sales Blueprint",
      "Generate qualified leads",
      "Launch approval-gated outreach",
      "Add managed rollout support",
      "Improve meetings and conversion",
    ],
  };
}

export function formatLeadGenerationContactMessage(
  context: LeadGenerationContactContext,
) {
  return [
    "AI lead generation software context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is evaluating a governed lead-generation workspace for business context capture, source-channel planning, evidence review, deduplication, outreach handoff, and conversion feedback.",
    "Please review ICP fit, source evidence requirements, provider readiness, included channel posture, lead-volume needs, plan fit, and whether self-serve setup or managed rollout support is the right next step.",
    "No live scraping, lead sourcing, enrichment purchase, outreach, provider work, billing change, or Telegram-controlled mutation should start from this context without normal workspace gates.",
  ].join("\n");
}
