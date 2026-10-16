import {
  managedServicePackages,
  PRICING_PLANS,
  type ManagedServicePackageKey,
  type PricingPlan,
} from "@sales/shared";
import { formatCurrency, formatNumber } from "./revenue-impact-calculator";
import type { ContactBudgetRange, RoiContactSearchParams } from "./roi-contact-context";

export type PublicSalesBlueprintInput = {
  segment: "founder" | "agency" | "smb";
  industry: string;
  targetAudience: string;
  monthlyLeadTarget: number;
  meetingTarget: number;
  averageContractValue: number;
  sourceChannels: string[];
  outreachChannels: string[];
  regions: string[];
  constraints: string[];
};

export type PublicSalesBlueprintResult = {
  readinessScore: number;
  readinessLevel: "needs_context" | "review_ready" | "rollout_ready";
  monthlyPipelineValue: number;
  leadToMeetingRate: number;
  recommendedAutomationMode: "assistive" | "approval_gated";
  commercialFit: {
    planKey: string;
    planName: string;
    priceLabel: string;
    planReason: string;
    estimatedReviewedDispatches: number;
    estimatedVoiceCalls: number;
    providerBudgetPressure: "low" | "medium" | "high";
    providerBudgetLabel: string;
    providerBudgetDetail: string;
    managedPackageKey: ManagedServicePackageKey;
    managedPackageTier: string;
    managedPackageReason: string;
    nextSteps: string[];
    guardrail: string;
  };
  sourcePlan: Array<{
    label: string;
    posture: "available" | "guarded" | "roadmap";
    reason: string;
  }>;
  approvalRequiredFor: string[];
  readinessGaps: string[];
  recommendedNextStep: string;
};

export type PublicSalesBlueprintContactContext = {
  segment: PublicSalesBlueprintInput["segment"];
  industry: string;
  targetAudience: string;
  monthlyLeadTarget: number;
  meetingTarget: number;
  averageContractValue: number;
  readinessScore: number;
  readinessLevel: PublicSalesBlueprintResult["readinessLevel"];
  sourceChannels: string[];
  outreachChannels: string[];
  regions: string[];
  constraints: string[];
  recommendedPlanKey: string | null;
  recommendedPlanName: string | null;
  managedPackageKey: ManagedServicePackageKey | null;
  managedPackageTier: string | null;
  managedIntent: string | null;
};

export const blueprintContactUtm = {
  source: "sales_blueprint_tool",
  medium: "owned_tool",
  campaign: "blueprint_readiness",
} as const;

export const defaultPublicSalesBlueprintInput: PublicSalesBlueprintInput = {
  segment: "founder",
  industry: "B2B SaaS",
  targetAudience: "Founder-led software teams with 10 to 100 employees",
  monthlyLeadTarget: 250,
  meetingTarget: 20,
  averageContractValue: 8000,
  sourceChannels: ["website", "search", "directory"],
  outreachChannels: ["email", "linkedin_review"],
  regions: ["US", "UK"],
  constraints: ["suppression checks", "human approval before first outreach"],
};

export const publicBlueprintSegments = [
  {
    value: "founder",
    label: "Founder-led team",
    description: "Validate repeatable pipeline before hiring a larger RevOps stack.",
  },
  {
    value: "agency",
    label: "Agency pipeline desk",
    description: "Keep client-facing lead work structured, auditable, and easier to explain.",
  },
  {
    value: "smb",
    label: "SMB sales team",
    description: "Move from scattered sales tasks into a governed revenue workflow.",
  },
] as const;

export const publicBlueprintSourceOptions = [
  { value: "website", label: "Website signals", posture: "available" },
  { value: "search", label: "Search results", posture: "available" },
  { value: "directory", label: "Directories", posture: "available" },
  { value: "content", label: "Content demand", posture: "guarded" },
  { value: "crm", label: "CRM import", posture: "roadmap" },
] as const;

export const publicBlueprintOutreachOptions = [
  { value: "email", label: "Email", posture: "available" },
  { value: "linkedin_review", label: "LinkedIn review", posture: "guarded" },
  { value: "call", label: "Calls", posture: "guarded" },
  { value: "sms", label: "SMS", posture: "roadmap" },
] as const;

const sourceReasons = {
  website: "Use site copy, offers, regions, and proof points as source evidence.",
  search: "Use search terms to discover relevant account and buyer signals.",
  directory: "Use directories with dedupe, quality review, and rejection reasons.",
  content: "Use blueprint-informed SEO opportunities before publishing anything.",
  crm: "Treat external CRM sync as roadmap until connection and consent rules exist.",
} as const;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function normalizeList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function normalizeInput(input: PublicSalesBlueprintInput): PublicSalesBlueprintInput {
  return {
    ...input,
    industry: input.industry.trim().slice(0, 120),
    targetAudience: input.targetAudience.trim().slice(0, 240),
    monthlyLeadTarget: Math.round(clamp(input.monthlyLeadTarget, 1, 100_000)),
    meetingTarget: Math.round(clamp(input.meetingTarget, 1, 10_000)),
    averageContractValue: Math.round(clamp(input.averageContractValue, 0, 100_000_000)),
    sourceChannels: normalizeList(input.sourceChannels),
    outreachChannels: normalizeList(input.outreachChannels),
    regions: normalizeList(input.regions),
    constraints: normalizeList(input.constraints),
  };
}

function readinessLevel(score: number): PublicSalesBlueprintResult["readinessLevel"] {
  if (score >= 82) {
    return "rollout_ready";
  }

  if (score >= 58) {
    return "review_ready";
  }

  return "needs_context";
}

function sourcePlanFor(input: PublicSalesBlueprintInput): PublicSalesBlueprintResult["sourcePlan"] {
  return input.sourceChannels.map((channel) => {
    const option = publicBlueprintSourceOptions.find((item) => item.value === channel);

    return {
      label: option?.label ?? channel,
      posture: (option?.posture ?? "guarded") as "available" | "guarded" | "roadmap",
      reason: sourceReasons[channel as keyof typeof sourceReasons] ?? "Review evidence before outreach.",
    };
  });
}

function formatPlanPrice(plan: PricingPlan) {
  return plan.price.usd === 0 ? "7-Day Trial" : `$${plan.price.usd}/mo`;
}

function formatProviderBudget(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}/mo`;
}

function estimateReviewedDispatches(input: PublicSalesBlueprintInput) {
  if (!input.outreachChannels.includes("email")) {
    return 0;
  }

  return Math.min(
    input.monthlyLeadTarget,
    Math.max(input.meetingTarget * 4, Math.ceil(input.monthlyLeadTarget * 0.2)),
  );
}

function estimateVoiceCalls(input: PublicSalesBlueprintInput) {
  if (!input.outreachChannels.includes("call")) {
    return 0;
  }

  return Math.max(input.meetingTarget * 2, Math.ceil(input.monthlyLeadTarget * 0.1));
}

function selectCommercialPlan(input: PublicSalesBlueprintInput) {
  const estimatedReviewedDispatches = estimateReviewedDispatches(input);
  const estimatedVoiceCalls = estimateVoiceCalls(input);
  const matchingPlan = PRICING_PLANS.find((plan) => {
    if (plan.usageLimit < input.monthlyLeadTarget) {
      return false;
    }

    if (plan.outreachDispatchLimit < estimatedReviewedDispatches) {
      return false;
    }

    if (plan.voiceCallLimit < estimatedVoiceCalls) {
      return false;
    }

    if (estimatedVoiceCalls > 0 && !plan.includedChannels.includes("call")) {
      return false;
    }

    return true;
  });

  return {
    estimatedReviewedDispatches,
    estimatedVoiceCalls,
    plan: matchingPlan ?? PRICING_PLANS[PRICING_PLANS.length - 1],
  };
}

function providerBudgetPressure(input: PublicSalesBlueprintInput, plan: PricingPlan) {
  const hasRoadmapChannel = [...input.sourceChannels, ...input.outreachChannels].some(
    (channel) => channel === "crm" || channel === "sms",
  );
  const usagePressure = input.monthlyLeadTarget / Math.max(plan.usageLimit, 1);
  const channelPressure =
    input.sourceChannels.filter((channel) => channel !== "website").length +
    input.outreachChannels.filter((channel) => channel !== "email").length;

  if (hasRoadmapChannel || usagePressure >= 0.85 || channelPressure >= 4) {
    return "high";
  }

  if (usagePressure >= 0.5 || channelPressure >= 2 || plan.providerCostBudgetCents <= 0) {
    return "medium";
  }

  return "low";
}

function selectManagedPackage(input: PublicSalesBlueprintInput, result: {
  monthlyPipelineValue: number;
  readinessLevel: PublicSalesBlueprintResult["readinessLevel"];
}) {
  const packageKey: ManagedServicePackageKey =
    result.monthlyPipelineValue >= 250_000 ||
    input.monthlyLeadTarget >= 3000 ||
    input.segment === "smb"
      ? "managed-revops"
      : result.readinessLevel === "rollout_ready" &&
          (input.segment === "agency" || input.meetingTarget >= 20)
        ? "operator-assist"
        : "setup-sprint";
  const managedPackage =
    managedServicePackages.find((candidate) => candidate.key === packageKey) ??
    managedServicePackages[0];

  return {
    key: managedPackage.key,
    tier: managedPackage.tier,
    reason: managedPackage.bestFor,
  };
}

function buildCommercialFit(input: PublicSalesBlueprintInput, result: {
  monthlyPipelineValue: number;
  readinessLevel: PublicSalesBlueprintResult["readinessLevel"];
  readinessGaps: string[];
}): PublicSalesBlueprintResult["commercialFit"] {
  const { estimatedReviewedDispatches, estimatedVoiceCalls, plan } =
    selectCommercialPlan(input);
  const pressure = providerBudgetPressure(input, plan);
  const managedPackage = selectManagedPackage(input, {
    monthlyPipelineValue: result.monthlyPipelineValue,
    readinessLevel: result.readinessLevel,
  });
  const roadmapSelected = [...input.sourceChannels, ...input.outreachChannels].some(
    (channel) => channel === "crm" || channel === "sms",
  );
  const nextSteps = [
    `Use ${plan.name} as the plan-fit starting point for ${formatNumber(
      input.monthlyLeadTarget,
      0,
    )} leads/mo and ${formatNumber(estimatedReviewedDispatches, 0)} reviewed dispatches/mo.`,
    `Review ${formatProviderBudget(
      plan.providerCostBudgetCents,
    )} provider-cost budget before live source expansion.`,
    `Scope ${managedPackage.tier} only if the team wants paid rollout support separate from the software subscription.`,
  ];

  if (roadmapSelected) {
    nextSteps.unshift("Remove or quarantine CRM/SMS roadmap channels before presenting this as launch-ready.");
  }

  if (result.readinessGaps.length) {
    nextSteps.push("Resolve readiness gaps before treating this as an execution plan.");
  } else {
    nextSteps.push("Create a workspace Sales Blueprint and route first outreach through approval gates.");
  }

  return {
    planKey: plan.key,
    planName: plan.name,
    priceLabel: formatPlanPrice(plan),
    planReason:
      estimatedVoiceCalls > 0
        ? `${plan.name} is the first shared plan that can cover the lead target, reviewed dispatch estimate, and call posture.`
        : `${plan.name} is the first shared plan that can cover the lead target and reviewed dispatch estimate.`,
    estimatedReviewedDispatches,
    estimatedVoiceCalls,
    providerBudgetPressure: pressure,
    providerBudgetLabel: `${pressure.charAt(0).toUpperCase()}${pressure.slice(1)} pressure`,
    providerBudgetDetail: `${plan.name} includes ${formatProviderBudget(
      plan.providerCostBudgetCents,
    )} provider-cost budget; provider invoices, source quality, and consent posture still need review.`,
    managedPackageKey: managedPackage.key,
    managedPackageTier: managedPackage.tier,
    managedPackageReason: managedPackage.reason,
    nextSteps: nextSteps.slice(0, 5),
    guardrail:
      "Commercial recommendations are guidance for review; they do not start checkout, provider work, lead sourcing, outreach, billing changes, AI execution, or Telegram-controlled mutation.",
  };
}

export function evaluatePublicSalesBlueprint(
  rawInput: PublicSalesBlueprintInput,
): PublicSalesBlueprintResult {
  const input = normalizeInput(rawInput);
  const readinessGaps: string[] = [];
  let score = 20;

  if (input.industry.length >= 2) {
    score += 10;
  } else {
    readinessGaps.push("Name the industry or market segment.");
  }

  if (input.targetAudience.length >= 20) {
    score += 14;
  } else {
    readinessGaps.push("Describe the target audience with enough detail to qualify leads.");
  }

  if (input.sourceChannels.length >= 2) {
    score += 12;
  } else {
    readinessGaps.push("Choose at least two lead source channels for evidence review.");
  }

  if (input.outreachChannels.includes("email")) {
    score += 8;
  } else {
    readinessGaps.push("Include email or another configured first outreach channel.");
  }

  if (input.outreachChannels.length >= 2) {
    score += 8;
  }

  if (input.regions.length > 0) {
    score += 8;
  } else {
    readinessGaps.push("Add target regions so source and compliance posture can be checked.");
  }

  if (input.constraints.length >= 2) {
    score += 12;
  } else {
    readinessGaps.push("Add suppression, approval, consent, or sender reputation constraints.");
  }

  if (input.averageContractValue > 0) {
    score += 8;
  } else {
    readinessGaps.push("Add average contract value for prioritization and ROI review.");
  }

  const leadToMeetingRate = input.meetingTarget / input.monthlyLeadTarget;

  if (leadToMeetingRate > 0 && leadToMeetingRate <= 0.35) {
    score += 10;
  } else {
    readinessGaps.push("Check whether the meeting target is realistic for the lead volume.");
  }

  const hasRoadmapChannel = [...input.sourceChannels, ...input.outreachChannels].some(
    (channel) => channel === "crm" || channel === "sms",
  );

  if (hasRoadmapChannel) {
    score -= 10;
    readinessGaps.unshift("Roadmap channels need provider and policy review before launch.");
  }

  const readinessScore = Math.round(clamp(score, 0, 100));
  const level = readinessLevel(readinessScore);
  const monthlyPipelineValue = input.meetingTarget * input.averageContractValue;
  const recommendedAutomationMode =
    level === "rollout_ready" && !hasRoadmapChannel ? "approval_gated" : "assistive";
  const approvalRequiredFor = [
    "first outreach",
    "new source channels",
    "phone calls",
    "provider changes",
    "suppression overrides",
  ];

  return {
    readinessScore,
    readinessLevel: level,
    monthlyPipelineValue,
    leadToMeetingRate,
    recommendedAutomationMode,
    commercialFit: buildCommercialFit(input, {
      monthlyPipelineValue,
      readinessLevel: level,
      readinessGaps,
    }),
    sourcePlan: sourcePlanFor(input),
    approvalRequiredFor,
    readinessGaps: readinessGaps.slice(0, 6),
    recommendedNextStep:
      level === "rollout_ready"
        ? "Request a rollout review with provider readiness and approval gates attached."
        : level === "review_ready"
          ? "Review the blueprint with a human before turning it into source runs and outreach."
          : "Complete the missing business context before widening lead generation.",
  };
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function splitParam(value: string | undefined) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function normalizePlanKey(value: string | undefined) {
  const requestedPlanKey = value?.trim();

  if (!requestedPlanKey) {
    return null;
  }

  return PRICING_PLANS.find((plan) => plan.key === requestedPlanKey)?.key ?? null;
}

function normalizeManagedPackageKey(value: string | undefined) {
  const requestedPackageKey = value?.trim();

  if (!requestedPackageKey) {
    return null;
  }

  return (
    managedServicePackages.find(
      (managedPackage) => managedPackage.key === requestedPackageKey,
    )?.key ?? null
  );
}

function roundParam(value: number, min: number, max: number) {
  return String(Math.round(clamp(value, min, max)));
}

function deriveBlueprintBudgetRange(input: PublicSalesBlueprintInput): ContactBudgetRange {
  const pipelineValue = input.meetingTarget * input.averageContractValue;

  if (pipelineValue >= 100_000 || input.monthlyLeadTarget >= 1000) {
    return "5000_plus";
  }

  if (pipelineValue >= 35_000 || input.monthlyLeadTarget >= 300) {
    return "1500_5000";
  }

  if (pipelineValue >= 10_000 || input.monthlyLeadTarget >= 100) {
    return "500_1500";
  }

  return "under_500";
}

export function buildBlueprintContactUrl(
  rawInput: PublicSalesBlueprintInput,
  result: PublicSalesBlueprintResult,
) {
  const input = normalizeInput(rawInput);
  const params = new URLSearchParams({
    intent: result.readinessLevel === "rollout_ready" ? "managed_services" : "sales_assessment",
    utm_source: blueprintContactUtm.source,
    utm_medium: blueprintContactUtm.medium,
    utm_campaign: blueprintContactUtm.campaign,
    monthlyLeadGoal: String(input.monthlyLeadTarget),
    budgetRange: deriveBlueprintBudgetRange(input),
    blueprintSegment: input.segment,
    blueprintIndustry: input.industry,
    blueprintAudience: input.targetAudience,
    blueprintMeetings: String(input.meetingTarget),
    blueprintAcv: String(input.averageContractValue),
    blueprintReadiness: String(result.readinessScore),
    blueprintLevel: result.readinessLevel,
    blueprintSources: input.sourceChannels.join(","),
    blueprintOutreach: input.outreachChannels.join(","),
    blueprintRegions: input.regions.join(","),
    blueprintConstraints: input.constraints.join(","),
    blueprintPlan: result.commercialFit.planKey,
    managedPackage: result.commercialFit.managedPackageKey,
    managedIntent: "blueprint_commercial_fit",
  });

  return `/contact?${params.toString()}`;
}

export function buildBlueprintGetStartedUrl(
  rawInput: PublicSalesBlueprintInput,
  result: PublicSalesBlueprintResult,
  planKey?: string,
) {
  const contactUrl = new URL(buildBlueprintContactUrl(rawInput, result), "https://salesxgrowth.com");
  contactUrl.pathname = "/get-started";
  contactUrl.searchParams.set("plan", planKey ?? result.commercialFit.planKey);
  return `${contactUrl.pathname}?${contactUrl.searchParams.toString()}`;
}

export function parseBlueprintContactContext(
  params: RoiContactSearchParams | undefined,
): PublicSalesBlueprintContactContext | null {
  if (firstParam(params?.utm_source) !== blueprintContactUtm.source) {
    return null;
  }

  const segment = firstParam(params?.blueprintSegment);
  const readinessLevelParam = firstParam(params?.blueprintLevel);
  const recommendedPlanKey = normalizePlanKey(firstParam(params?.blueprintPlan));
  const recommendedPlan = recommendedPlanKey
    ? PRICING_PLANS.find((plan) => plan.key === recommendedPlanKey)
    : null;
  const managedPackageKey = normalizeManagedPackageKey(firstParam(params?.managedPackage));
  const managedPackage = managedPackageKey
    ? managedServicePackages.find((candidate) => candidate.key === managedPackageKey)
    : null;

  return {
    segment: segment === "agency" || segment === "smb" ? segment : "founder",
    industry: (firstParam(params?.blueprintIndustry) ?? "").slice(0, 120),
    targetAudience: (firstParam(params?.blueprintAudience) ?? "").slice(0, 240),
    monthlyLeadTarget: Math.round(
      clamp(Number(firstParam(params?.monthlyLeadGoal) ?? 0), 0, 100_000),
    ),
    meetingTarget: Math.round(
      clamp(Number(firstParam(params?.blueprintMeetings) ?? 0), 0, 10_000),
    ),
    averageContractValue: Math.round(
      clamp(Number(firstParam(params?.blueprintAcv) ?? 0), 0, 100_000_000),
    ),
    readinessScore: Math.round(
      clamp(Number(firstParam(params?.blueprintReadiness) ?? 0), 0, 100),
    ),
    readinessLevel:
      readinessLevelParam === "rollout_ready" || readinessLevelParam === "review_ready"
        ? readinessLevelParam
        : "needs_context",
    sourceChannels: splitParam(firstParam(params?.blueprintSources)),
    outreachChannels: splitParam(firstParam(params?.blueprintOutreach)),
    regions: splitParam(firstParam(params?.blueprintRegions)),
    constraints: splitParam(firstParam(params?.blueprintConstraints)),
    recommendedPlanKey,
    recommendedPlanName: recommendedPlan?.name ?? null,
    managedPackageKey,
    managedPackageTier: managedPackage?.tier ?? null,
    managedIntent: firstParam(params?.managedIntent)?.trim() || null,
  };
}

export function formatBlueprintContactMessage(context: PublicSalesBlueprintContactContext) {
  const commercialLines = [
    context.recommendedPlanName
      ? `- Recommended SaaS plan: ${context.recommendedPlanName}`
      : null,
    context.managedPackageTier
      ? `- Managed rollout fit: ${context.managedPackageTier}`
      : null,
    context.managedIntent ? `- Managed intent: ${context.managedIntent}` : null,
  ].filter((line): line is string => Boolean(line));

  return [
    "Sales Blueprint readiness context attached for review:",
    `- Segment: ${context.segment}`,
    `- Industry: ${context.industry || "not provided"}`,
    `- Target audience: ${context.targetAudience || "not provided"}`,
    `- Monthly lead target: ${formatNumber(context.monthlyLeadTarget, 0)}`,
    `- Meeting target: ${formatNumber(context.meetingTarget, 0)}`,
    `- Average contract value: ${formatCurrency(context.averageContractValue)}`,
    `- Blueprint readiness: ${context.readinessScore}/100 (${context.readinessLevel.replace("_", " ")})`,
    `- Source channels: ${context.sourceChannels.join(", ") || "not provided"}`,
    `- Outreach channels: ${context.outreachChannels.join(", ") || "not provided"}`,
    `- Regions: ${context.regions.join(", ") || "not provided"}`,
    `- Constraints: ${context.constraints.join(", ") || "not provided"}`,
    ...commercialLines,
    "",
    "Please turn this into a governed Sales Blueprint with source evidence, approval gates, provider readiness, and a realistic rollout sequence.",
    "Commercial boundary: plan and managed-service recommendations are guidance only; they do not start checkout, provider work, lead sourcing, outreach, billing changes, AI execution, or Telegram-controlled mutation.",
  ].join("\n");
}
