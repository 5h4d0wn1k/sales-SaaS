import type { ContactBudgetRange } from "./roi-contact-context";

export type OutboundAutomationIntent =
  | "workspace_start"
  | "rollout_review"
  | "sequence_review"
  | "pricing_review"
  | "approval_review";

export type OutboundAutomationContactSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  utm_source?: string | string[];
  outboundIntent?: string | string[];
};

export type OutboundAutomationContactContext = {
  label: "AI outbound sales automation";
  intent: OutboundAutomationIntent;
  intentLabel: string;
  sourcePath: "/ai-outbound-sales-automation";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 600;
  channels: string[];
  goals: string[];
};

export const outboundAutomationUtmSource = "ai_outbound_sales_automation";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): OutboundAutomationIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "sequence_review" ||
    value === "pricing_review" ||
    value === "approval_review"
  ) {
    return value;
  }

  return "sequence_review";
}

function intentLabel(intent: OutboundAutomationIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  if (intent === "approval_review") {
    return "Approval review";
  }

  return "Sequence review";
}

export function buildOutboundAutomationContactUrl(
  intent: OutboundAutomationIntent = "rollout_review",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: outboundAutomationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "outbound_sales_automation",
    outboundIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildOutboundAutomationGetStartedUrl(
  intent: OutboundAutomationIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: outboundAutomationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "outbound_sales_automation",
    outboundIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildOutboundAutomationPricingUrl(
  intent: OutboundAutomationIntent = "pricing_review",
) {
  const params = new URLSearchParams({
    utm_source: outboundAutomationUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "outbound_sales_automation",
    outboundIntent: intent,
  });

  return `/pricing?${params.toString()}`;
}

export function parseOutboundAutomationContactContext(
  params: OutboundAutomationContactSearchParams | undefined,
): OutboundAutomationContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== outboundAutomationUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.outboundIntent)?.trim());

  return {
    label: "AI outbound sales automation",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/ai-outbound-sales-automation",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 600,
    channels: ["email", "call", "linkedin review", "telegram"],
    goals: [
      "Launch approval-gated outreach",
      "Improve meetings and conversion",
      "Connect Telegram command center",
      "Add managed rollout support",
      "Generate qualified leads",
    ],
  };
}

export function formatOutboundAutomationContactMessage(
  context: OutboundAutomationContactContext,
) {
  return [
    "AI outbound sales automation context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is evaluating a governed outbound workflow for sequence planning, channel-fit review, suppression checks, approval proposals, provider readiness, meeting handoff, and Telegram visibility.",
    "Please review Sales Blueprint fit, included channel posture, suppression state, campaign approval workflow, provider readiness, voice/email boundaries, and whether self-serve setup or managed rollout support is the right next step.",
    "No live sends, calls, social actions, SMS, provider work, billing change, or Telegram-controlled mutation should start from this context without normal workspace gates.",
  ].join("\n");
}
