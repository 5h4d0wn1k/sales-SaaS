export type RevenueImpactInput = {
  monthlyLeads: number;
  qualifiedRate: number;
  meetingRate: number;
  closeRate: number;
  averageContractValue: number;
  monthlyPlatformCost: number;
  hoursSaved: number;
  hourlyCost: number;
};

export type RevenueImpactResult = {
  qualifiedLeads: number;
  meetings: number;
  customers: number;
  monthlyRevenue: number;
  annualRevenue: number;
  monthlyEfficiencyValue: number;
  netMonthlyImpact: number;
  annualNetImpact: number;
  roiMultiple: number | null;
  paybackDays: number | null;
};

export const defaultRevenueImpactInput: RevenueImpactInput = {
  monthlyLeads: 400,
  qualifiedRate: 18,
  meetingRate: 16,
  closeRate: 24,
  averageContractValue: 3500,
  monthlyPlatformCost: 249,
  hoursSaved: 18,
  hourlyCost: 65,
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function normalizeRevenueImpactInput(input: RevenueImpactInput): RevenueImpactInput {
  return {
    monthlyLeads: Math.round(clamp(input.monthlyLeads, 0, 1_000_000)),
    qualifiedRate: clamp(input.qualifiedRate, 0, 100),
    meetingRate: clamp(input.meetingRate, 0, 100),
    closeRate: clamp(input.closeRate, 0, 100),
    averageContractValue: Math.round(clamp(input.averageContractValue, 0, 10_000_000)),
    monthlyPlatformCost: Math.round(clamp(input.monthlyPlatformCost, 0, 1_000_000)),
    hoursSaved: clamp(input.hoursSaved, 0, 10_000),
    hourlyCost: Math.round(clamp(input.hourlyCost, 0, 10_000)),
  };
}

export function calculateRevenueImpact(input: RevenueImpactInput): RevenueImpactResult {
  const normalized = normalizeRevenueImpactInput(input);
  const qualifiedLeads = normalized.monthlyLeads * (normalized.qualifiedRate / 100);
  const meetings = qualifiedLeads * (normalized.meetingRate / 100);
  const customers = meetings * (normalized.closeRate / 100);
  const monthlyRevenue = customers * normalized.averageContractValue;
  const monthlyEfficiencyValue = normalized.hoursSaved * normalized.hourlyCost;
  const grossMonthlyImpact = monthlyRevenue + monthlyEfficiencyValue;
  const netMonthlyImpact = grossMonthlyImpact - normalized.monthlyPlatformCost;
  const roiMultiple =
    normalized.monthlyPlatformCost > 0
      ? grossMonthlyImpact / normalized.monthlyPlatformCost
      : null;
  const paybackDays =
    grossMonthlyImpact > 0 && normalized.monthlyPlatformCost > 0
      ? (normalized.monthlyPlatformCost / grossMonthlyImpact) * 30
      : null;

  return {
    qualifiedLeads,
    meetings,
    customers,
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
    monthlyEfficiencyValue,
    netMonthlyImpact,
    annualNetImpact: netMonthlyImpact * 12,
    roiMultiple,
    paybackDays,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}
