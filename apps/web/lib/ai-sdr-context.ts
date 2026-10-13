export type AiSdrContactSearchParams = {
  utm_source?: string | string[];
  aiSdrIntent?: string | string[];
};

export type AiSdrContactContext = {
  label: "AI SDR software";
  intent: "workspace_start" | "rollout_review" | "pricing_review" | "evaluation";
  intentLabel: string;
  sourcePath: "/ai-sdr-software";
  budgetRange: "1500_5000";
  monthlyLeadGoal: 500;
  channels: string[];
  goals: string[];
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeIntent(value: string | undefined): AiSdrContactContext["intent"] {
  if (
    value === "workspace_start" ||
    value === "rollout_review" ||
    value === "pricing_review" ||
    value === "evaluation"
  ) {
    return value;
  }

  return "evaluation";
}

function intentLabel(intent: AiSdrContactContext["intent"]) {
  if (intent === "workspace_start") {
    return "Workspace start";
  }

  if (intent === "rollout_review") {
    return "Rollout review";
  }

  if (intent === "pricing_review") {
    return "Pricing review";
  }

  return "Evaluation";
}

export function parseAiSdrContactContext(
  params: AiSdrContactSearchParams | undefined,
): AiSdrContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== "ai_sdr_software") {
    return null;
  }

  const intent = normalizeIntent(firstParam(params?.aiSdrIntent)?.trim());

  return {
    label: "AI SDR software",
    intent,
    intentLabel: intentLabel(intent),
    sourcePath: "/ai-sdr-software",
    budgetRange: "1500_5000",
    monthlyLeadGoal: 500,
    channels: ["email", "call", "linkedin review", "website", "directory", "telegram"],
    goals: [
      "Build a Sales Blueprint",
      "Generate qualified leads",
      "Launch approval-gated outreach",
      "Connect Telegram command center",
      "Improve meetings and conversion",
    ],
  };
}

export function formatAiSdrContactMessage(context: AiSdrContactContext) {
  return [
    "AI SDR software evaluation context attached for review:",
    `Intent: ${context.intentLabel}`,
    "Buyer is evaluating a governed AI sales workspace for business context capture, source evidence, approval-gated outreach, meeting follow-through, Telegram visibility, and audit evidence.",
    "Please review Sales Blueprint fit, provider readiness, plan and provider-cost posture, Telegram boundaries, and whether self-serve setup or managed rollout support is the right next step.",
    "No lead sourcing, live outreach, provider work, billing change, or Telegram-controlled mutation should start from this context without normal workspace gates.",
  ].join("\n");
}
