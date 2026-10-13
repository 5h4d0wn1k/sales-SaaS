import type { ContactBudgetRange } from "./roi-contact-context";

export type TelegramCommandCenterIntent =
  | "workspace_start"
  | "rollout_review"
  | "bot_setup"
  | "policy_review"
  | "pricing_review";

export type TelegramCommandCenterContactSearchParams = Record<
  string,
  string | string[] | undefined
> & {
  utm_source?: string | string[];
  telegramIntent?: string | string[];
};

export type TelegramCommandCenterContactContext = {
  label: "Telegram sales command center";
  intent: TelegramCommandCenterIntent;
  intentLabel: string;
  sourcePath: "/telegram-sales-command-center";
  budgetRange: ContactBudgetRange;
  monthlyLeadGoal: 500;
  channels: string[];
  goals: string[];
};

export const telegramCommandCenterUtmSource = "telegram_sales_command_center";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): TelegramCommandCenterIntent {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "bot_setup" ||
    value === "policy_review" ||
    value === "pricing_review"
  ) {
    return value;
  }

  return "bot_setup";
}

function intentLabel(intent: TelegramCommandCenterIntent) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "policy_review") {
    return "Policy review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Bot setup";
}

export function buildTelegramCommandCenterContactUrl(
  intent: TelegramCommandCenterIntent = "rollout_review",
) {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: telegramCommandCenterUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "telegram_command_center",
    telegramIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function buildTelegramCommandCenterGetStartedUrl(
  intent: TelegramCommandCenterIntent = "workspace_start",
) {
  const params = new URLSearchParams({
    utm_source: telegramCommandCenterUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "telegram_command_center",
    telegramIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildTelegramCommandCenterPricingUrl(
  intent: TelegramCommandCenterIntent = "pricing_review",
) {
  const params = new URLSearchParams({
    utm_source: telegramCommandCenterUtmSource,
    utm_medium: "seo_landing",
    utm_campaign: "telegram_command_center",
    telegramIntent: intent,
  });

  return `/pricing?${params.toString()}`;
}

export function parseTelegramCommandCenterContactContext(
  params: TelegramCommandCenterContactSearchParams | undefined,
): TelegramCommandCenterContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== telegramCommandCenterUtmSource) {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.telegramIntent)?.trim());

  return {
    label: "Telegram sales command center",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/telegram-sales-command-center",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 500,
    channels: ["telegram", "email", "call"],
    goals: [
      "Connect Telegram command center",
      "Launch approval-gated outreach",
      "Add managed rollout support",
      "Improve meetings and conversion",
      "Generate qualified leads",
    ],
  };
}

export function formatTelegramCommandCenterContactMessage(
  context: TelegramCommandCenterContactContext,
) {
  return [
    "Telegram sales command center context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is evaluating Telegram control for safe workspace status, operator briefs, sequence readiness, revenue forecast visibility, suppression/provider checks, deterministic aliases, policy previews, approval-gated pause proposals, and audit evidence.",
    "Please review bot setup readiness, webhook-secret posture, eligible workspace admin binding, allowed command scope, command throttling, proposal workflow, and whether self-serve setup or managed rollout support is the right next step.",
    "No campaign approval, call dispatch, billing change, provider mutation, AI-worker execution, external tool execution, or Telegram-controlled outreach mutation should start from this context without normal workspace gates.",
  ].join("\n");
}
