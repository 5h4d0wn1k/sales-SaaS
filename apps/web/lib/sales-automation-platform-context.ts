import type { ContactBudgetRange } from "./roi-contact-context";

export type SalesAutomationPlatformIntent =
  | "workspace_start"
  | "rollout_review"
  | "full_workflow_review"
  | "telegram_review"
  | "pricing_review";

export type SalesAutomationPlatformContactSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  utm_source?: string | string[];
  platformIntent?: string | string[];
};

export type SalesAutomationPlatformContactContext = {
  label: "AI sales automation platform";
  intent: SalesAutomationPlatformIntent;
  intentLabel: string;
  sourcePath: "/ai-sales-automation-platform";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 1000;
  channels: string[];
  goals: string[];
};

export const salesAutomationPlatformUtmSource = "ai_sales_automation_platform";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): SalesAutomationPlatformIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "full_workflow_review" ||
    value === "telegram_review" ||
    value === "pricing_review"
  ) {
    return value;
  }

  return "full_workflow_review";
}

function intentLabel(intent: SalesAutomationPlatformIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "telegram_review") {
    return "Telegram review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Full workflow review";
}

export function buildSalesAutomationPlatformContactUrl(
  intent: SalesAutomationPlatformIntent = "rollout_review",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: salesAutomationPlatformUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "ai_sales_automation_platform",
    platformIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildSalesAutomationPlatformGetStartedUrl(
  intent: SalesAutomationPlatformIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: salesAutomationPlatformUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "ai_sales_automation_platform",
    platformIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildSalesAutomationPlatformPricingUrl(
  intent: SalesAutomationPlatformIntent = "pricing_review",
) {
  const params = new URLSearchParams({
    utm_source: salesAutomationPlatformUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "ai_sales_automation_platform",
    platformIntent: intent,
  });

  return `/pricing?${params.toString()}`;
}

export function parseSalesAutomationPlatformContactContext(
  params: SalesAutomationPlatformContactSearchParams | undefined,
): SalesAutomationPlatformContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== salesAutomationPlatformUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.platformIntent)?.trim());

  return {
    label: "AI sales automation platform",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/ai-sales-automation-platform",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 1000,
    channels: ["website", "directory", "email", "call", "linkedin review", "telegram"],
    goals: [
      "Build a Sales Blueprint",
      "Generate qualified leads",
      "Launch approval-gated outreach",
      "Improve meetings and conversion",
      "Connect Telegram command center",
      "Add managed rollout support",
    ],
  };
}

export function formatSalesAutomationPlatformContactMessage(
  context: SalesAutomationPlatformContactContext,
) {
  return [
    "AI sales automation platform context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is evaluating the full governed sales workflow: Sales Blueprint context, source-channel planning, source evidence, approval-gated outreach, call posture, meeting handoff, conversion outcomes, revenue visibility, Telegram command visibility, provider readiness, plan fit, and audit evidence.",
    "Please review current business context, ICP, source channels, outreach channels, meeting targets, provider readiness, suppression posture, Telegram setup needs, plan/provider-cost fit, and whether self-serve setup or managed rollout support is the right next step.",
    "No broad live source expansion, hidden sends, hidden calls, social automation, SMS, autonomous scheduling, direct Telegram mutation, billing change, provider work, AI-worker execution, or external tool execution should start from this context without normal workspace gates.",
  ].join("\n");
}
