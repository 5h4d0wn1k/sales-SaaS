import {
  formatCurrency,
  formatNumber,
  normalizeRevenueImpactInput,
  type RevenueImpactInput,
  type RevenueImpactResult,
} from "./revenue-impact-calculator";

export type ContactBudgetRange =
  | "under_500"
  | "500_1500"
  | "1500_5000"
  | "5000_plus"
  | "not_sure";

export type RoiContactSearchParams = Record<string, string | string[] | undefined>;

export type RoiContactContext = {
  monthlyLeadGoal: number;
  qualifiedRate: number;
  meetingRate: number;
  closeRate: number;
  averageContractValue: number;
  monthlyPlatformCost: number;
  hoursSaved: number;
  annualNetImpact: number;
  budgetRange: ContactBudgetRange;
};

export const roiContactUtm = {
  source: "roi_calculator",
  medium: "owned_tool",
  campaign: "roi_model",
} as const;

const budgetRanges: ContactBudgetRange[] = [
  "under_500",
  "500_1500",
  "1500_5000",
  "5000_plus",
  "not_sure",
];

const roiNumberParamKeys = [
  "monthlyLeadGoal",
  "roiQualifiedRate",
  "roiMeetingRate",
  "roiCloseRate",
  "roiAcv",
  "roiBudget",
  "roiHoursSaved",
  "roiAnnualNet",
] as const;

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundedParam(value: number, min: number, max: number) {
  return String(Math.round(clamp(value, min, max)));
}

function readNumberParam(
  params: RoiContactSearchParams | undefined,
  key: string,
  min: number,
  max: number,
) {
  const rawValue = firstParam(params?.[key]);

  if (rawValue === undefined || rawValue.trim() === "") {
    return undefined;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return clamp(parsed, min, max);
}

function readBudgetRange(params: RoiContactSearchParams | undefined): ContactBudgetRange | undefined {
  const value = firstParam(params?.budgetRange);

  if (value && budgetRanges.includes(value as ContactBudgetRange)) {
    return value as ContactBudgetRange;
  }

  return undefined;
}

export function deriveBudgetRange(monthlyPlatformCost: number): ContactBudgetRange {
  if (!Number.isFinite(monthlyPlatformCost) || monthlyPlatformCost <= 0) {
    return "not_sure";
  }

  if (monthlyPlatformCost < 500) {
    return "under_500";
  }

  if (monthlyPlatformCost < 1500) {
    return "500_1500";
  }

  if (monthlyPlatformCost < 5000) {
    return "1500_5000";
  }

  return "5000_plus";
}

export function buildRoiContactUrl(input: RevenueImpactInput, result: RevenueImpactResult) {
  const normalized = normalizeRevenueImpactInput(input);
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: roiContactUtm.source,
    utm_medium: roiContactUtm.medium,
    utm_campaign: roiContactUtm.campaign,
    monthlyLeadGoal: String(normalized.monthlyLeads),
    budgetRange: deriveBudgetRange(normalized.monthlyPlatformCost),
    roiQualifiedRate: roundedParam(normalized.qualifiedRate, 0, 100),
    roiMeetingRate: roundedParam(normalized.meetingRate, 0, 100),
    roiCloseRate: roundedParam(normalized.closeRate, 0, 100),
    roiAcv: roundedParam(normalized.averageContractValue, 0, 10_000_000),
    roiBudget: roundedParam(normalized.monthlyPlatformCost, 0, 1_000_000),
    roiHoursSaved: roundedParam(normalized.hoursSaved, 0, 10_000),
    roiAnnualNet: roundedParam(result.annualNetImpact, -1_000_000_000, 1_000_000_000),
  });

  return `/contact?${params.toString()}`;
}

export function buildRoiGetStartedUrl(
  input: RevenueImpactInput,
  result: RevenueImpactResult,
  planKey = "free",
) {
  const contactUrl = new URL(buildRoiContactUrl(input, result), "https://winrate.ai");
  contactUrl.pathname = "/get-started";
  contactUrl.searchParams.set("plan", planKey);
  return `${contactUrl.pathname}?${contactUrl.searchParams.toString()}`;
}

export function parseRoiContactContext(
  params: RoiContactSearchParams | undefined,
): RoiContactContext | null {
  const hasCalculatorNumbers = roiNumberParamKeys.some(
    (key) => firstParam(params?.[key]) !== undefined,
  );
  const hasCalculatorSource = firstParam(params?.utm_source) === roiContactUtm.source;

  if (!hasCalculatorNumbers || !hasCalculatorSource) {
    return null;
  }

  const monthlyPlatformCost = Math.round(readNumberParam(params, "roiBudget", 0, 1_000_000) ?? 0);

  return {
    monthlyLeadGoal: Math.round(readNumberParam(params, "monthlyLeadGoal", 0, 100_000) ?? 0),
    qualifiedRate: readNumberParam(params, "roiQualifiedRate", 0, 100) ?? 0,
    meetingRate: readNumberParam(params, "roiMeetingRate", 0, 100) ?? 0,
    closeRate: readNumberParam(params, "roiCloseRate", 0, 100) ?? 0,
    averageContractValue: Math.round(readNumberParam(params, "roiAcv", 0, 10_000_000) ?? 0),
    monthlyPlatformCost,
    hoursSaved: readNumberParam(params, "roiHoursSaved", 0, 10_000) ?? 0,
    annualNetImpact: Math.round(
      readNumberParam(params, "roiAnnualNet", -1_000_000_000, 1_000_000_000) ?? 0,
    ),
    budgetRange: readBudgetRange(params) ?? deriveBudgetRange(monthlyPlatformCost),
  };
}

export function formatRoiContactMessage(context: RoiContactContext) {
  return [
    "ROI calculator scenario attached for review:",
    `- Monthly lead goal: ${formatNumber(context.monthlyLeadGoal, 0)}`,
    `- Funnel assumptions: ${formatNumber(context.qualifiedRate, 1)}% qualified, ${formatNumber(
      context.meetingRate,
      1,
    )}% qualified-to-meeting, ${formatNumber(context.closeRate, 1)}% meeting-to-customer`,
    `- Average contract value: ${formatCurrency(context.averageContractValue)}`,
    `- Monthly software/support budget modeled: ${formatCurrency(context.monthlyPlatformCost)}`,
    `- Operator time savings modeled: ${formatNumber(context.hoursSaved, 1)} hours/month`,
    `- Modeled annual net impact: ${formatCurrency(context.annualNetImpact)} (scenario only, not a guarantee)`,
    "",
    "Please review this against our actual ICP, lead sources, outreach rules, provider readiness, compliance constraints, and rollout timeline.",
  ].join("\n");
}
