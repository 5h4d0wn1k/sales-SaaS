import { describe, expect, it } from "vitest";
import type { ProviderSummary } from "../src";
import {
  buildProviderCostCurves,
  getAiWorkerCostCurves,
  getProviderEstimatedUnitCostCents,
  hasAiWorkerDryRunCostCurveCoverage,
} from "../src/provider-cost-curves";

const now = "2026-06-05T12:00:00.000Z";

const provider = {
  provider: "resend-fallback",
  kind: "outreach",
  mode: "configured",
  channels: ["email"],
  detail: "Outbound delivery adapter is available for campaign dispatch.",
  readiness: "configured",
  requiredSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  missingSecrets: [],
  liveAction: "Email dispatch can use configured delivery after approvals.",
  guardrails: ["Approval required before first outbound action"],
  lastVerifiedAt: now,
  productionBlockers: [],
} satisfies ProviderSummary["outreach"][number];

function summary(overrides: Partial<ProviderSummary> = {}): ProviderSummary {
  return {
    sources: [
      {
        ...provider,
        provider: "website-crawler",
        kind: "lead-source",
        mode: "mock",
        channels: ["website"],
        readiness: "guarded",
        requiredSecrets: [],
        detail: "Lead discovery adapter is available for planned source workflows.",
        liveAction: "Demo-safe source run.",
      },
    ],
    outreach: [provider],
    voice: [
      {
        ...provider,
        provider: "twilio-voice",
        kind: "voice" as const,
        channels: ["call"],
        detail: "Voice dispatch adapter is available for AI call workflows.",
      },
    ],
    billing: [],
    webhooks: [],
    chat: [],
    summary: {
      configured: 2,
      guarded: 1,
      blocked: 0,
      disabled: 0,
      productionBlockers: [],
    },
    ...overrides,
  };
}

describe("provider cost curves", () => {
  it("standardizes configured email and voice provider cost estimates", () => {
    const curves = buildProviderCostCurves({
      providers: summary(),
      providerCostBudgetCents: 5000,
      providerCostUsageCents: 1250,
      generatedAt: now,
    });

    expect(curves).toMatchObject({
      surface: "provider-cost-curves",
      posture: "guarded",
      summary: {
        meteredCurves: 2,
        guardedCurves: 1,
        unpricedCurves: 0,
        providerCostRemainingCents: 3750,
        utilizationPct: 25,
      },
    });
    expect(curves.curves.find((curve) => curve.provider === "resend-fallback"))
      .toMatchObject({
        status: "metered",
        estimatedUnitCostCents: 1,
        meteringEvents: ["outreach_dispatches", "provider_cost_cents"],
      });
    expect(curves.curves.find((curve) => curve.provider === "twilio-voice"))
      .toMatchObject({
        status: "metered",
        estimatedUnitCostCents: 25,
        meteringEvents: ["voice_calls", "provider_cost_cents"],
      });
    expect(curves.curves.find((curve) => curve.provider === "website-crawler"))
      .toMatchObject({
        status: "guarded",
        estimatedUnitCostCents: 50,
        meteringEvents: ["leads_created", "provider_cost_cents"],
      });
    expect(curves.aiWorkerCostCurves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workerType: "sales-researcher",
          status: "metered",
          estimatedUnitCostCents: 1200,
          meteringEvents: ["ai_worker_task_proposals", "ai_worker_execution_cents"],
        }),
        expect.objectContaining({
          workerType: "crm-operator",
          status: "guarded",
        }),
      ]),
    );
  });

  it("keeps configured provider cost estimates available to API dispatch code", () => {
    expect(getProviderEstimatedUnitCostCents("resend-fallback")).toBe(1);
    expect(getProviderEstimatedUnitCostCents("smtp-primary")).toBe(1);
    expect(getProviderEstimatedUnitCostCents("twilio-voice")).toBe(25);
    expect(getProviderEstimatedUnitCostCents("website-crawler")).toBe(50);
    expect(getProviderEstimatedUnitCostCents("search-intelligence")).toBe(75);
    expect(getProviderEstimatedUnitCostCents("directory-harvester")).toBe(100);
    expect(getProviderEstimatedUnitCostCents("unknown-provider")).toBe(0);
  });

  it("keeps AI worker dry-run cost curves available for margin readiness", () => {
    expect(hasAiWorkerDryRunCostCurveCoverage()).toBe(true);
    expect(getAiWorkerCostCurves()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workerType: "outreach-strategist",
          estimatedUnitCostCents: 900,
        }),
        expect.objectContaining({
          workerType: "meeting-coordinator",
          estimatedUnitCostCents: 700,
        }),
      ]),
    );
  });

  it("shows channel quota maturity without claiming SMS or social dispatch enforcement", () => {
    const curves = buildProviderCostCurves({
      providers: summary({
        sources: [],
      }),
      providerCostBudgetCents: 1500,
      generatedAt: now,
    });

    expect(curves.channelQuotas).toEqual([
      expect.objectContaining({ channel: "email", status: "enforced" }),
      expect.objectContaining({ channel: "call", status: "enforced" }),
      expect.objectContaining({ channel: "linkedin", status: "included_only" }),
      expect.objectContaining({ channel: "sms", status: "roadmap" }),
    ]);
    expect(curves.unavailableClaims).toContain("SMS provider cost curves");
    expect(curves.unavailableClaims).toContain("Live external AI-worker execution cost curves");
    expect(curves.unavailableClaims).toContain("Live source-provider invoice reconciliation");
  });
});
