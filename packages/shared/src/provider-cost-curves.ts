import { z } from "zod";
import {
  outboundChannelSchema,
  providerHealthSchema,
  providerSummarySchema,
  type ProviderSummary,
} from "./domain";

export const providerCostCurveStatusSchema = z.enum([
  "metered",
  "guarded",
  "unpriced",
  "not_billable",
]);

export const providerCostCurveToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const providerCostCurveSchema = z.object({
  provider: z.string(),
  kind: providerHealthSchema.shape.kind,
  channels: z.array(z.string()),
  unitLabel: z.string(),
  estimatedUnitCostCents: z.number().int().min(0),
  status: providerCostCurveStatusSchema,
  tone: providerCostCurveToneSchema,
  detail: z.string(),
  meteringEvents: z.array(z.string()).default([]),
  guardrails: z.array(z.string()).default([]),
});

export const aiWorkerCostCurveSchema = z.object({
  workerType: z.string(),
  unitLabel: z.string(),
  estimatedUnitCostCents: z.number().int().min(0),
  status: providerCostCurveStatusSchema,
  tone: providerCostCurveToneSchema,
  detail: z.string(),
  meteringEvents: z.array(z.string()).default([]),
  guardrails: z.array(z.string()).default([]),
});

export const providerChannelQuotaStatusSchema = z.enum([
  "enforced",
  "included_only",
  "roadmap",
]);

export const providerChannelQuotaSchema = z.object({
  channel: outboundChannelSchema,
  status: providerChannelQuotaStatusSchema,
  tone: providerCostCurveToneSchema,
  metric: z.string(),
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const providerCostCurveResponseSchema = z.object({
  surface: z.literal("provider-cost-curves"),
  version: z.string(),
  generatedAt: z.string(),
  posture: z.enum(["ready", "guarded", "blocked"]),
  summary: z.object({
    totalCurves: z.number().int().min(0),
    meteredCurves: z.number().int().min(0),
    guardedCurves: z.number().int().min(0),
    unpricedCurves: z.number().int().min(0),
    notBillableCurves: z.number().int().min(0),
    providerCostBudgetCents: z.number().int().min(0),
    providerCostUsageCents: z.number().int().min(0),
    providerCostRemainingCents: z.number().int().min(0),
    utilizationPct: z.number().int().min(0).max(999),
  }),
  curves: z.array(providerCostCurveSchema),
  aiWorkerCostCurves: z.array(aiWorkerCostCurveSchema).default([]),
  channelQuotas: z.array(providerChannelQuotaSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ProviderCostCurveStatus = z.infer<typeof providerCostCurveStatusSchema>;
export type ProviderCostCurveTone = z.infer<typeof providerCostCurveToneSchema>;
export type ProviderCostCurve = z.infer<typeof providerCostCurveSchema>;
export type AiWorkerCostCurve = z.infer<typeof aiWorkerCostCurveSchema>;
export type ProviderCostCurveResponse = z.infer<typeof providerCostCurveResponseSchema>;

type ProviderCostCurveCatalogEntry = {
  provider: string;
  unitLabel: string;
  estimatedUnitCostCents: number;
  status: ProviderCostCurveStatus;
  detail: string;
  meteringEvents: string[];
  guardrails: string[];
};

type AiWorkerCostCurveCatalogEntry = {
  workerType: string;
  unitLabel: string;
  estimatedUnitCostCents: number;
  status: ProviderCostCurveStatus;
  detail: string;
  meteringEvents: string[];
  guardrails: string[];
};

const providerCostCurveCatalog: ProviderCostCurveCatalogEntry[] = [
  {
    provider: "smtp-primary",
    unitLabel: "accepted email",
    estimatedUnitCostCents: 1,
    status: "metered",
    detail:
      "Configured SMTP email dispatch is estimated per accepted outbound activity and recorded as provider cost when accepted.",
    meteringEvents: ["outreach_dispatches", "provider_cost_cents"],
    guardrails: ["Approval gate", "Suppression check", "Accepted dispatch only"],
  },
  {
    provider: "resend-fallback",
    unitLabel: "accepted email",
    estimatedUnitCostCents: 1,
    status: "metered",
    detail:
      "Configured Resend dispatch is estimated per accepted outbound activity and recorded as provider cost when accepted.",
    meteringEvents: ["outreach_dispatches", "provider_cost_cents"],
    guardrails: ["Approval gate", "Suppression check", "Webhook verification"],
  },
  {
    provider: "twilio-voice",
    unitLabel: "accepted call",
    estimatedUnitCostCents: 25,
    status: "metered",
    detail:
      "Configured Twilio voice dispatch is estimated per accepted call and recorded as provider cost when accepted.",
    meteringEvents: ["voice_calls", "provider_cost_cents"],
    guardrails: ["Call review", "Suppression check", "Status callback verification"],
  },
  {
    provider: "linkedin-outreach",
    unitLabel: "reviewed social action",
    estimatedUnitCostCents: 0,
    status: "not_billable",
    detail:
      "LinkedIn remains review-only and is not priced as an automated provider action.",
    meteringEvents: [],
    guardrails: ["No auto-connect", "No auto-DM", "Approval proposal required"],
  },
  {
    provider: "website-crawler",
    unitLabel: "source run",
    estimatedUnitCostCents: 50,
    status: "metered",
    detail:
      "Configured website sourcing is estimated per source run and recorded as provider cost when a configured source adapter creates reviewable evidence.",
    meteringEvents: ["leads_created", "provider_cost_cents"],
    guardrails: ["Provider-cost budget check", "Evidence review", "Rejected-lead tracking"],
  },
  {
    provider: "search-intelligence",
    unitLabel: "source run",
    estimatedUnitCostCents: 75,
    status: "metered",
    detail:
      "Configured search sourcing is estimated per source run and recorded as provider cost when a configured source adapter creates reviewable evidence.",
    meteringEvents: ["leads_created", "provider_cost_cents"],
    guardrails: ["Provider-cost budget check", "Evidence review", "Rejected-lead tracking"],
  },
  {
    provider: "directory-harvester",
    unitLabel: "source run",
    estimatedUnitCostCents: 100,
    status: "metered",
    detail:
      "Configured directory sourcing is estimated per source run and recorded as provider cost when a configured source adapter creates reviewable evidence.",
    meteringEvents: ["leads_created", "provider_cost_cents"],
    guardrails: ["Provider-cost budget check", "Evidence review", "Dedupe review"],
  },
  {
    provider: "stripe",
    unitLabel: "billing event",
    estimatedUnitCostCents: 0,
    status: "not_billable",
    detail:
      "Stripe charges are commercial payment flows, not metered provider-cost budget consumption.",
    meteringEvents: [],
    guardrails: ["Owner/admin billing authorization", "Webhook idempotency"],
  },
  {
    provider: "razorpay",
    unitLabel: "billing event",
    estimatedUnitCostCents: 0,
    status: "not_billable",
    detail:
      "Razorpay charges are commercial payment flows, not metered provider-cost budget consumption.",
    meteringEvents: [],
    guardrails: ["Owner/admin billing authorization", "Webhook verification"],
  },
  {
    provider: "telegram-command-center",
    unitLabel: "command",
    estimatedUnitCostCents: 0,
    status: "not_billable",
    detail:
      "Telegram commands are control-plane interactions and do not consume provider-cost budget.",
    meteringEvents: [],
    guardrails: ["Allowlist", "Replay protection", "Approval-gated mutation"],
  },
];

const aiWorkerCostCurveCatalog: AiWorkerCostCurveCatalogEntry[] = [
  {
    workerType: "sales-researcher",
    unitLabel: "approved source dry-run result",
    estimatedUnitCostCents: 1200,
    status: "metered",
    detail:
      "Sales researcher dry-run results are priced as bounded internal execution cost and recorded through ai_worker_execution_cents after approval.",
    meteringEvents: ["ai_worker_task_proposals", "ai_worker_execution_cents"],
    guardrails: ["Approval proposal", "Worker budget ledger", "Plan AI dry-run budget"],
  },
  {
    workerType: "outreach-strategist",
    unitLabel: "approved sequence dry-run result",
    estimatedUnitCostCents: 900,
    status: "metered",
    detail:
      "Outreach strategist dry-run results estimate planning and draft cost only; provider sends remain separately approval-gated and budget-checked.",
    meteringEvents: ["ai_worker_task_proposals", "ai_worker_execution_cents"],
    guardrails: ["Suppression handoff", "No provider send", "Plan AI dry-run budget"],
  },
  {
    workerType: "meeting-coordinator",
    unitLabel: "approved meeting dry-run result",
    estimatedUnitCostCents: 700,
    status: "metered",
    detail:
      "Meeting coordinator dry-run results estimate meeting-prep and follow-up planning cost without writable calendar or CRM mutation.",
    meteringEvents: ["ai_worker_task_proposals", "ai_worker_execution_cents"],
    guardrails: ["No calendar write", "No CRM write", "Plan AI dry-run budget"],
  },
  {
    workerType: "crm-operator",
    unitLabel: "future CRM dry-run result",
    estimatedUnitCostCents: 0,
    status: "guarded",
    detail:
      "CRM operator economics are intentionally guarded until write access, rollback, and provider mapping are implemented.",
    meteringEvents: [],
    guardrails: ["Disabled worker", "Owner review", "Rollback plan required"],
  },
];

function pct(current: number, limit: number) {
  if (limit <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round((current / limit) * 100);
}

function toneForStatus(status: ProviderCostCurveStatus): ProviderCostCurveTone {
  if (status === "metered") {
    return "good";
  }

  if (status === "unpriced") {
    return "blocked";
  }

  if (status === "guarded") {
    return "warn";
  }

  return "neutral";
}

function allProviders(providers: ProviderSummary) {
  return [
    ...providers.sources,
    ...providers.outreach,
    ...providers.voice,
    ...providers.billing,
    ...providers.webhooks,
    ...providers.chat,
  ];
}

function catalogEntry(provider: string) {
  return providerCostCurveCatalog.find((entry) => entry.provider === provider);
}

export function getProviderEstimatedUnitCostCents(provider: string) {
  return catalogEntry(provider)?.estimatedUnitCostCents ?? 0;
}

function aiWorkerCostCurves(): AiWorkerCostCurve[] {
  return aiWorkerCostCurveCatalog.map((entry) => ({
    workerType: entry.workerType,
    unitLabel: entry.unitLabel,
    estimatedUnitCostCents: entry.estimatedUnitCostCents,
    status: entry.status,
    tone: toneForStatus(entry.status),
    detail: entry.detail,
    meteringEvents: entry.meteringEvents,
    guardrails: entry.guardrails,
  }));
}

export function getAiWorkerCostCurves(): AiWorkerCostCurve[] {
  return aiWorkerCostCurves().map((curve) => ({ ...curve }));
}

export function hasAiWorkerDryRunCostCurveCoverage() {
  const curves = aiWorkerCostCurves();
  return curves.length > 0 && curves.every((curve) => curve.status !== "unpriced");
}

function providerCurveStatus(
  providerReadiness: z.infer<typeof providerHealthSchema>["readiness"],
  entry: ProviderCostCurveCatalogEntry | undefined,
): ProviderCostCurveStatus {
  if (!entry) {
    return "unpriced";
  }

  if (entry.status !== "metered") {
    return entry.status;
  }

  return providerReadiness === "configured" ? "metered" : "guarded";
}

export function buildProviderCostCurves(input: {
  providers: ProviderSummary;
  providerCostBudgetCents: number;
  providerCostUsageCents?: number;
  generatedAt?: string;
}): ProviderCostCurveResponse {
  const providerSummary = providerSummarySchema.parse(input.providers);
  const providerCostBudgetCents = Math.max(0, Math.trunc(input.providerCostBudgetCents));
  const providerCostUsageCents = Math.max(0, Math.trunc(input.providerCostUsageCents ?? 0));
  const providerCostRemainingCents = Math.max(
    0,
    providerCostBudgetCents - providerCostUsageCents,
  );
  const curves = allProviders(providerSummary).map((provider) => {
    const entry = catalogEntry(provider.provider);
    const status = providerCurveStatus(provider.readiness, entry);

    return {
      provider: provider.provider,
      kind: provider.kind,
      channels: provider.channels,
      unitLabel: entry?.unitLabel ?? "provider action",
      estimatedUnitCostCents: entry?.estimatedUnitCostCents ?? 0,
      status,
      tone: toneForStatus(status),
      detail:
        entry?.detail ??
        `${provider.provider} does not yet have a standardized provider-cost curve.`,
      meteringEvents: entry?.meteringEvents ?? [],
      guardrails: entry?.guardrails ?? provider.guardrails,
    };
  });
  const meteredCurves = curves.filter((curve) => curve.status === "metered").length;
  const guardedCurves = curves.filter((curve) => curve.status === "guarded").length;
  const unpricedCurves = curves.filter((curve) => curve.status === "unpriced").length;
  const notBillableCurves = curves.filter((curve) => curve.status === "not_billable").length;
  const aiWorkerCurves = aiWorkerCostCurves();
  const posture =
    unpricedCurves > 0
      ? "blocked"
      : guardedCurves > 0
        ? "guarded"
        : "ready";

  return providerCostCurveResponseSchema.parse({
    surface: "provider-cost-curves",
    version: "2026-06-05.provider-cost-curves",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    posture,
    summary: {
      totalCurves: curves.length,
      meteredCurves,
      guardedCurves,
      unpricedCurves,
      notBillableCurves,
      providerCostBudgetCents,
      providerCostUsageCents,
      providerCostRemainingCents,
      utilizationPct: pct(providerCostUsageCents, providerCostBudgetCents),
    },
    curves,
    aiWorkerCostCurves: aiWorkerCurves,
    channelQuotas: [
      {
        channel: "email",
        status: "enforced",
        tone: "good",
        metric: "outreach_dispatches + provider_cost_cents",
        detail:
          "Email dispatch checks outreach quota, included-channel access, provider-cost budget, suppression, and approval gates before configured provider work.",
        evidence: ["campaign dispatch route", "usage_events"],
      },
      {
        channel: "call",
        status: "enforced",
        tone: "good",
        metric: "voice_calls + provider_cost_cents",
        detail:
          "Voice dispatch checks voice quota, call-channel access, provider-cost budget, suppression, and review state before configured provider work.",
        evidence: ["call dispatch route", "usage_events"],
      },
      {
        channel: "linkedin",
        status: "included_only",
        tone: "warn",
        metric: "included_channels",
        detail:
          "LinkedIn is limited to review-gated planning; there is no live provider dispatch quota yet.",
        evidence: ["pricing.includedChannels", "provider readiness"],
      },
      {
        channel: "sms",
        status: "roadmap",
        tone: "blocked",
        metric: "none",
        detail:
          "SMS remains roadmap until consent, provider, quota, suppression, and policy controls are implemented.",
        evidence: ["outreach sequence guardrails"],
      },
    ],
    guardrails: [
      "Provider cost curves standardize estimated unit costs for existing configured provider-work paths; they do not change plan prices, checkout, or provider behavior.",
      "Provider-cost budget is metered only after configured provider work is accepted, not for mock, review-only, failed, or suppressed work.",
      "Source-provider curves cover cost-controlled evidence runs only; they do not imply universal scraping, enrichment purchases, or browser automation.",
      "AI-worker curves cover approved dry-run result capture only; they do not enable live external AI tool execution.",
      "Roadmap SMS requires explicit cost curves and quota policy before live scale claims.",
    ],
    unavailableClaims: [
      "Live source-provider invoice reconciliation",
      "Per-source lead-quality billing",
      "SMS provider cost curves",
      "Live external AI-worker execution cost curves",
      "Per-channel monthly quota enforcement beyond current email, call, and source-run budget guards",
      "Automatic gross-margin forecasting across CRM, accounting, and provider invoices",
    ],
  });
}
