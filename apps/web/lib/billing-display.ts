import { PRICING_PLANS } from "@sales/shared";

const metricLabels: Record<string, string> = {
  ai_worker_execution_cost_cents: "AI dry-run cost",
  ai_worker_task_proposals: "AI worker proposals",
  calls_completed: "Calls completed",
  emails_sent: "Emails sent",
  leads_created: "Leads created",
  outreach_dispatches: "Outreach dispatches",
  provider_cost_cents: "Provider cost",
  sms_sent: "SMS sent",
  voice_calls: "Voice calls",
};

const channelLabels: Record<string, string> = {
  call: "Call",
  email: "Email",
  linkedin: "Review-gated LinkedIn",
  sms: "SMS",
};

const acronymLabels: Record<string, string> = {
  ai: "AI",
  api: "API",
  crm: "CRM",
  sms: "SMS",
  usd: "USD",
};

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function formatFallbackLabel(value: string) {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();

      return acronymLabels[lower] ?? lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function formatBillingCents(cents = 0, currency = "USD") {
  const normalizedCents = safeNumber(cents);
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCents % 100 === 0 ? 0 : 2,
    }).format(normalizedCents / 100);
  } catch {
    return `${(normalizedCents / 100).toLocaleString("en-US", {
      maximumFractionDigits: normalizedCents % 100 === 0 ? 0 : 2,
    })} ${normalizedCurrency}`;
  }
}

export function formatBillingPlanName(planKey: string | null | undefined) {
  const normalizedPlanKey = planKey?.trim().toLowerCase();

  if (!normalizedPlanKey) {
    return "No plan";
  }

  const plan = PRICING_PLANS.find((candidate) => candidate.key === normalizedPlanKey);

  return plan?.name ?? formatFallbackLabel(normalizedPlanKey);
}

export function formatBillingMetricLabel(metric: string) {
  return metricLabels[metric] ?? formatFallbackLabel(metric || "usage");
}

export function formatBillingUsageValue(metric: string, quantity: number) {
  if (metric.endsWith("_cents")) {
    return formatBillingCents(safeNumber(quantity));
  }

  return safeNumber(quantity).toLocaleString("en-US");
}

export function formatBillingChannels(channels: readonly string[] | null | undefined) {
  if (!channels?.length) {
    return "None configured";
  }

  return channels
    .map((channel) => channelLabels[channel.toLowerCase()] ?? formatFallbackLabel(channel))
    .join(", ");
}

export function formatBillingUsageLimit(limit: number | null | undefined) {
  if (!limit || limit <= 0) {
    return "Unlimited";
  }

  return `${limit.toLocaleString("en-US")} leads/mo`;
}

export function formatBillingSeats(seats: number | null | undefined) {
  const normalizedSeats = safeNumber(seats);

  if (normalizedSeats >= 999) {
    return "Unlimited";
  }

  return `${normalizedSeats.toLocaleString("en-US")} seat${normalizedSeats === 1 ? "" : "s"}`;
}

export function calculateBillingProviderCostPercent(
  usedCents: number | null | undefined,
  budgetCents: number | null | undefined,
) {
  const normalizedBudget = safeNumber(budgetCents);

  if (normalizedBudget <= 0) {
    return 0;
  }

  const normalizedUsed = Math.max(0, safeNumber(usedCents));

  return Math.min(100, Math.round((normalizedUsed / normalizedBudget) * 100));
}

export function formatBillingStatusLabel(status: string | null | undefined) {
  return status ? status.replace(/_/g, " ") : "unknown";
}
