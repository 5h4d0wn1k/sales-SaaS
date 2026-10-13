import type { OutboundChannel, PricingPlan } from "@sales/shared";
import { PRICING_PLANS } from "@sales/shared";
import {
  buildManagedServiceContactUrl,
  getManagedServicePackage,
  type ManagedServicePackageKey,
} from "./managed-services";

export type PricingComparisonRow = {
  label: string;
  detail: string;
  values: Record<string, string>;
};

export type PricingFitAdvisorRow = {
  key: string;
  scenario: string;
  recommendedPlanKey: string;
  recommendedPlanName: string;
  priceLabel: string;
  summary: string;
  boundaries: PricingFitAdvisorBoundary[];
  guardrail: string;
  commercialPath: string;
  proof: string[];
  ctaLabel: string;
  ctaHref: string;
  reviewHref?: string;
  reviewLabel?: string;
};

export type PricingFitAdvisorBoundary = {
  label: string;
  value: string;
};

export type PricingContactSearchParams = Record<string, string | string[] | undefined> & {
  plan?: string | string[];
  pricingIntent?: string | string[];
  managedPackage?: string | string[];
  managedIntent?: string | string[];
  utm_source?: string | string[];
};

export type PricingContactContext = {
  intent: string;
  intentLabel: string;
  summary: string;
  planName: string | null;
  priceLabel: string | null;
  managedTier: string | null;
  managedIntent: string | null;
  boundaries: PricingFitAdvisorBoundary[];
  reassurance: string;
};

const channelLabels: Record<OutboundChannel, string> = {
  email: "Email",
  call: "Call",
  linkedin: "Review-gated LinkedIn",
  sms: "SMS",
};

const fitByPlanKey: Record<string, string> = {
  free: "Validate the workspace",
  starter: "Launch founder-led email workflows",
  pro: "Add calls and active review flows",
  elite: "Scale governed multi-seat operations",
};

const pricingIntentLabels: Record<string, { label: string; summary: string }> = {
  plan_card: {
    label: "Plan selection",
    summary:
      "The buyer came from a public pricing plan card and needs the selected plan reviewed against account setup, checkout, provider readiness, and approval gates.",
  },
  managed_services_addon: {
    label: "Managed services add-on",
    summary:
      "The buyer came from pricing to scope optional managed setup or rollout support without changing the software subscription automatically.",
  },
  fit_validate: {
    label: "Validation-stage fit",
    summary:
      "The pricing advisor mapped this buyer to a validation-stage rollout before any paid provider work, outreach, or AI execution should start.",
  },
  fit_founder_launch: {
    label: "Founder-led launch fit",
    summary:
      "The pricing advisor mapped this buyer to a founder-led launch path with email-first source review and approval-gated outreach.",
  },
  fit_active_team: {
    label: "Active campaign team fit",
    summary:
      "The pricing advisor mapped this buyer to an active-team rollout path with higher lead capacity, calls, provider-budget review, and approval-gated campaign work.",
  },
  fit_scale_operations: {
    label: "Governed scale fit",
    summary:
      "The pricing advisor mapped this buyer to a governed-scale path with multi-seat operations, channel readiness, source evidence, and rollout controls.",
  },
};

export function formatUsageLimit(limit: number) {
  return `${limit.toLocaleString("en-US")} leads/mo`;
}

export function formatOutreachDispatchLimit(limit: number) {
  return limit <= 0
    ? "No live dispatch"
    : `${limit.toLocaleString("en-US")} dispatch${limit === 1 ? "" : "es"}/mo`;
}

export function formatVoiceCallLimit(limit: number) {
  return limit <= 0
    ? "No voice calls"
    : `${limit.toLocaleString("en-US")} voice call${limit === 1 ? "" : "s"}/mo`;
}

export function formatProviderBudget(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}/mo`;
}

export function formatAiWorkerTaskProposalLimit(limit: number) {
  return `${limit.toLocaleString("en-US")} AI proposal${limit === 1 ? "" : "s"}/mo`;
}

export function formatAiWorkerExecutionBudget(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}/mo AI dry-run`;
}

export function formatSeats(seats: number) {
  return seats >= 999 ? "Unlimited" : `${seats} seat${seats === 1 ? "" : "s"}`;
}

export function formatChannels(channels: readonly OutboundChannel[]) {
  return channels.map((channel) => channelLabels[channel]).join(", ");
}

function formatPlanPrice(plan: PricingPlan) {
  return plan.price.usd === 0 ? "Free" : `$${plan.price.usd}/mo`;
}

function planByKey(plans: readonly PricingPlan[], key: string) {
  return plans.find((plan) => plan.key === key);
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatAiWorkerFitBoundary(plan: PricingPlan) {
  return `${plan.aiWorkerTaskProposalLimit.toLocaleString("en-US")} proposals / $${(
    plan.aiWorkerExecutionBudgetCents / 100
  ).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })} dry-run`;
}

function buildFitBoundaries(plan: PricingPlan): PricingFitAdvisorBoundary[] {
  return [
    {
      label: "Lead volume",
      value: formatUsageLimit(plan.usageLimit),
    },
    {
      label: "Live dispatch",
      value: formatOutreachDispatchLimit(plan.outreachDispatchLimit),
    },
    {
      label: "Voice",
      value: formatVoiceCallLimit(plan.voiceCallLimit),
    },
    {
      label: "Provider budget",
      value: formatProviderBudget(plan.providerCostBudgetCents),
    },
    {
      label: "AI work",
      value: formatAiWorkerFitBoundary(plan),
    },
  ];
}

export function parsePricingContactContext(
  params: PricingContactSearchParams | undefined,
): PricingContactContext | null {
  const source = firstParam(params?.utm_source)?.trim();

  if (source !== "pricing") {
    return null;
  }

  const requestedPlanKey = firstParam(params?.plan)?.trim();
  const plan = requestedPlanKey ? planByKey(PRICING_PLANS, requestedPlanKey) : null;
  const pricingIntent = firstParam(params?.pricingIntent)?.trim() || "pricing_review";
  const intent = pricingIntentLabels[pricingIntent] ?? {
    label: "Pricing review",
    summary:
      "The buyer came from the pricing page and needs plan fit, rollout scope, provider readiness, and approval gates reviewed before any live work starts.",
  };
  const requestedManagedPackage = firstParam(params?.managedPackage)?.trim();
  const managedPackage = getManagedServicePackage(requestedManagedPackage);
  const managedIntent = firstParam(params?.managedIntent)?.trim() || null;

  if (!plan && !managedPackage && !pricingIntent) {
    return null;
  }

  return {
    intent: pricingIntent,
    intentLabel: intent.label,
    summary: intent.summary,
    planName: plan?.name ?? null,
    priceLabel: plan ? formatPlanPrice(plan) : null,
    managedTier: managedPackage?.tier ?? null,
    managedIntent,
    boundaries: plan ? buildFitBoundaries(plan) : [],
    reassurance:
      "Pricing context is guidance for review; it does not start checkout, provider work, lead sourcing, outreach, billing changes, AI execution, or Telegram-controlled mutation.",
  };
}

export function buildPricingGetStartedUrl(planKey: string, intent = "plan_card") {
  const validPlanKey = PRICING_PLANS.some((plan) => plan.key === planKey) ? planKey : "free";
  const params = new URLSearchParams({
    plan: validPlanKey,
    utm_source: "pricing",
    utm_medium: "pricing_page",
    utm_campaign: "plan_selection",
    pricingIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildPricingManagedServiceContactUrl(
  packageKey: ManagedServicePackageKey = "setup-sprint",
  pricingIntent = "managed_services_addon",
) {
  const contactUrl = new URL(
    buildManagedServiceContactUrl(packageKey, "pricing_setup_review"),
    "https://winrate.ai",
  );

  contactUrl.searchParams.set("utm_source", "pricing");
  contactUrl.searchParams.set("utm_medium", "pricing_page");
  contactUrl.searchParams.set(
    "utm_campaign",
    `managed_services_${packageKey.replace(/-/g, "_")}`,
  );
  contactUrl.searchParams.set("pricingIntent", pricingIntent);

  return `${contactUrl.pathname}?${contactUrl.searchParams.toString()}`;
}

export function buildPricingComparisonRows(
  plans: readonly PricingPlan[] = PRICING_PLANS,
): PricingComparisonRow[] {
  return [
    {
      label: "Best fit",
      detail: "The plan shape most buyers should map to first.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, fitByPlanKey[plan.key] ?? plan.description]),
      ),
    },
    {
      label: "Lead volume",
      detail: "Monthly usage boundary for lead creation and discovery workflows.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, formatUsageLimit(plan.usageLimit)]),
      ),
    },
    {
      label: "Outreach dispatches",
      detail: "Monthly quota checked before campaign dispatch can create provider work.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, formatOutreachDispatchLimit(plan.outreachDispatchLimit)]),
      ),
    },
    {
      label: "Voice calls",
      detail: "Monthly quota checked before voice dispatch can create provider work.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, formatVoiceCallLimit(plan.voiceCallLimit)]),
      ),
    },
    {
      label: "Provider-cost budget",
      detail: "Budget checked before configured provider work can run.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, formatProviderBudget(plan.providerCostBudgetCents)]),
      ),
    },
    {
      label: "AI worker proposals",
      detail: "Monthly quota checked before approval-gated AI worker task proposals are created.",
      values: Object.fromEntries(
        plans.map((plan) => [
          plan.key,
          formatAiWorkerTaskProposalLimit(plan.aiWorkerTaskProposalLimit),
        ]),
      ),
    },
    {
      label: "AI dry-run budget",
      detail: "Monthly plan budget checked before approved AI worker dry-run result cost is recorded.",
      values: Object.fromEntries(
        plans.map((plan) => [
          plan.key,
          formatAiWorkerExecutionBudget(plan.aiWorkerExecutionBudgetCents),
        ]),
      ),
    },
    {
      label: "Included channels",
      detail: "Outbound channels allowed by plan entitlement before dispatch.",
      values: Object.fromEntries(
        plans.map((plan) => [plan.key, formatChannels(plan.includedChannels)]),
      ),
    },
    {
      label: "Workspace seats",
      detail: "Seat boundary for workspace collaboration.",
      values: Object.fromEntries(plans.map((plan) => [plan.key, formatSeats(plan.seats)])),
    },
  ];
}

export function buildPricingFitAdvisorRows(
  plans: readonly PricingPlan[] = PRICING_PLANS,
): PricingFitAdvisorRow[] {
  const free = planByKey(plans, "free");
  const starter = planByKey(plans, "starter");
  const pro = planByKey(plans, "pro");
  const elite = planByKey(plans, "elite");

  const rows: Array<PricingFitAdvisorRow | null> = [
    free
      ? {
          key: "validate",
          scenario: "Validate the workspace",
          recommendedPlanKey: free.key,
          recommendedPlanName: free.name,
          priceLabel: formatPlanPrice(free),
          summary:
            "Best when the buyer needs to test onboarding, dashboard visibility, and a first reviewable workflow before paid rollout.",
          boundaries: buildFitBoundaries(free),
          guardrail:
            "Validation stays review-only: no live dispatch, calls, provider spend, or AI execution until the account, plan, and approval gates support it.",
          commercialPath: "Self-guided validation",
          proof: [
            formatUsageLimit(free.usageLimit),
            formatOutreachDispatchLimit(free.outreachDispatchLimit),
            formatVoiceCallLimit(free.voiceCallLimit),
            formatSeats(free.seats),
            formatChannels(free.includedChannels),
            formatProviderBudget(free.providerCostBudgetCents),
            formatAiWorkerTaskProposalLimit(free.aiWorkerTaskProposalLimit),
            formatAiWorkerExecutionBudget(free.aiWorkerExecutionBudgetCents),
          ],
          ctaLabel: "Start validation",
          ctaHref: buildPricingGetStartedUrl(free.key, "fit_validate"),
        }
      : null,
    starter
      ? {
          key: "founder_launch",
          scenario: "Founder-led launch",
          recommendedPlanKey: starter.key,
          recommendedPlanName: starter.name,
          priceLabel: formatPlanPrice(starter),
          summary:
            "Best when a founder or small team is ready to launch email-first source review and approval-gated outreach.",
          boundaries: buildFitBoundaries(starter),
          guardrail:
            "Email-first launch still requires verified account posture, provider readiness, suppression checks, and owner approval gates.",
          commercialPath: "Setup Sprint optional",
          proof: [
            formatUsageLimit(starter.usageLimit),
            formatOutreachDispatchLimit(starter.outreachDispatchLimit),
            formatVoiceCallLimit(starter.voiceCallLimit),
            formatSeats(starter.seats),
            formatChannels(starter.includedChannels),
            formatProviderBudget(starter.providerCostBudgetCents),
            formatAiWorkerTaskProposalLimit(starter.aiWorkerTaskProposalLimit),
            formatAiWorkerExecutionBudget(starter.aiWorkerExecutionBudgetCents),
          ],
          ctaLabel: "Choose Starter",
          ctaHref: buildPricingGetStartedUrl(starter.key, "fit_founder_launch"),
          reviewHref: buildPricingManagedServiceContactUrl("setup-sprint", "fit_founder_launch"),
          reviewLabel: "Review Setup Sprint",
        }
      : null,
    pro
      ? {
          key: "active_team",
          scenario: "Active campaign team",
          recommendedPlanKey: pro.key,
          recommendedPlanName: pro.name,
          priceLabel: formatPlanPrice(pro),
          summary:
            "Best when the team needs more lead capacity, calls, active review flows, and a stronger provider-cost budget.",
          boundaries: buildFitBoundaries(pro),
          guardrail:
            "Calls and configured provider work remain quota-checked, audit-linked, and approval-gated before spend or dispatch can advance.",
          commercialPath: "Operator Assist optional",
          proof: [
            formatUsageLimit(pro.usageLimit),
            formatOutreachDispatchLimit(pro.outreachDispatchLimit),
            formatVoiceCallLimit(pro.voiceCallLimit),
            formatSeats(pro.seats),
            formatChannels(pro.includedChannels),
            formatProviderBudget(pro.providerCostBudgetCents),
            formatAiWorkerTaskProposalLimit(pro.aiWorkerTaskProposalLimit),
            formatAiWorkerExecutionBudget(pro.aiWorkerExecutionBudgetCents),
          ],
          ctaLabel: "Choose Professional",
          ctaHref: buildPricingGetStartedUrl(pro.key, "fit_active_team"),
          reviewHref: buildPricingManagedServiceContactUrl("operator-assist", "fit_active_team"),
          reviewLabel: "Review Operator Assist",
        }
      : null,
    elite
      ? {
          key: "scale_operations",
          scenario: "Scale governed operations",
          recommendedPlanKey: elite.key,
          recommendedPlanName: elite.name,
          priceLabel: formatPlanPrice(elite),
          summary:
            "Best when a larger team needs multi-seat scale, review-gated LinkedIn posture, higher volume, and rollout planning.",
          boundaries: buildFitBoundaries(elite),
          guardrail:
            "Scale plans still separate software subscription, provider costs, managed-service scope, and customer-owned approval decisions.",
          commercialPath: "Managed RevOps optional",
          proof: [
            formatUsageLimit(elite.usageLimit),
            formatOutreachDispatchLimit(elite.outreachDispatchLimit),
            formatVoiceCallLimit(elite.voiceCallLimit),
            formatSeats(elite.seats),
            formatChannels(elite.includedChannels),
            formatProviderBudget(elite.providerCostBudgetCents),
            formatAiWorkerTaskProposalLimit(elite.aiWorkerTaskProposalLimit),
            formatAiWorkerExecutionBudget(elite.aiWorkerExecutionBudgetCents),
          ],
          ctaLabel: "Choose Elite",
          ctaHref: buildPricingGetStartedUrl(elite.key, "fit_scale_operations"),
          reviewHref: buildPricingManagedServiceContactUrl("managed-revops", "fit_scale_operations"),
          reviewLabel: "Review Managed RevOps",
        }
      : null,
  ];

  return rows.filter((row): row is PricingFitAdvisorRow => row !== null);
}
