import type { ContactBudgetRange } from "./roi-contact-context";

export type ComparisonIntent =
  | "workspace_start"
  | "rollout_review"
  | "pricing_review"
  | "tool_consolidation";

export type ComparisonContactSearchParams = Record<string, string | string[] | undefined> & {
  utm_source?: string | string[];
  comparisonIntent?: string | string[];
};

export type ComparisonContactContext = {
  label: "Sales tool comparison";
  intent: ComparisonIntent;
  intentLabel: string;
  sourcePath: "/compare-sales-tools";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 600;
  channels: string[];
  goals: string[];
};

export const comparisonUtmSource = "sales_tool_comparison";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): ComparisonIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "pricing_review" ||
    value === "tool_consolidation"
  ) {
    return value;
  }

  return "tool_consolidation";
}

function intentLabel(intent: ComparisonIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Tool consolidation";
}

export function buildComparisonContactUrl(intent: ComparisonIntent = "rollout_review") {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: comparisonUtmSource,
    utm_medium: "seo_comparison",
    utm_campaign: "sales_tool_comparison",
    comparisonIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildComparisonGetStartedUrl(
  intent: ComparisonIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: comparisonUtmSource,
    utm_medium: "seo_comparison",
    utm_campaign: "sales_tool_comparison",
    comparisonIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function parseComparisonContactContext(
  params: ComparisonContactSearchParams | undefined,
): ComparisonContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== comparisonUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.comparisonIntent)?.trim());

  return {
    label: "Sales tool comparison",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/compare-sales-tools",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 600,
    channels: ["email", "call", "linkedin review", "website", "directory", "telegram"],
    goals: [
      "Build a Sales Blueprint",
      "Generate qualified leads",
      "Launch approval-gated outreach",
      "Add managed rollout support",
      "Improve meetings and conversion",
    ],
  };
}

export function formatComparisonContactMessage(context: ComparisonContactContext) {
  return [
    "Sales tool comparison context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is comparing CRM-only tools, outreach sequencers, lead-list vendors, agencies, and generic AI agents against a governed sales workspace.",
    "Please review current tool sprawl, Sales Blueprint fit, provider readiness, approval workflow, plan and provider-cost posture, and whether self-serve setup or managed rollout support is the right next step.",
    "No lead sourcing, live outreach, provider work, billing change, or Telegram-controlled mutation should start from this comparison context without normal workspace gates.",
  ].join("\n");
}
