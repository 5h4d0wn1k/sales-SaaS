import { describe, expect, it } from "vitest";
import { buildSourceAcquisitionReadiness } from "../src/source-acquisition-readiness";
import type {
  LeadRecord,
  ProviderSummary,
  SourcePlan,
  SourceRun,
} from "../src/domain";

const sourcePlan: SourcePlan = {
  id: "plan-1",
  summary: "Prioritize founder-led SaaS companies.",
  sources: ["website", "search", "directory"],
  contactTargets: ["email", "call"],
  searchTerms: ["founder led SaaS revenue operations"],
  rationale: "Use public business evidence before outreach.",
};

const providerSummary: ProviderSummary = {
  sources: [
    {
      provider: "website-crawler",
      kind: "lead-source",
      mode: "mock",
      channels: ["website"],
      detail: "Demo-safe source adapter.",
      readiness: "guarded",
      requiredSecrets: [],
      missingSecrets: [],
      liveAction: "Demo-safe source run.",
      guardrails: ["Evidence review"],
      lastVerifiedAt: null,
      productionBlockers: [
        "Lead-source adapter is still mock-backed and should not be marketed as universal scraping.",
      ],
    },
    {
      provider: "search-intelligence",
      kind: "lead-source",
      mode: "mock",
      channels: ["search"],
      detail: "Demo-safe search adapter.",
      readiness: "guarded",
      requiredSecrets: [],
      missingSecrets: [],
      liveAction: "Demo-safe source run.",
      guardrails: ["Evidence review"],
      lastVerifiedAt: null,
      productionBlockers: [],
    },
  ],
  outreach: [],
  voice: [],
  billing: [],
  webhooks: [],
  chat: [],
  summary: {
    configured: 0,
    guarded: 2,
    blocked: 0,
    disabled: 0,
    productionBlockers: [],
  },
};

const run: SourceRun = {
  id: "run-1",
  source: "website-crawler",
  status: "completed",
  providerMode: "mock",
  candidatesFound: 20,
  dedupedCount: 4,
  qualifiedCount: 8,
  rejectedCount: 8,
  qualityScore: 86,
  evidence: [
    {
      label: "Public business signal",
      value: "Pricing page",
      detail: "ICP and region matched.",
      url: "https://example.com/pricing",
      confidence: 92,
    },
  ],
  rejectionReasons: [
    {
      reason: "Below target ICP threshold",
      count: 8,
      detail: "Candidates lacked buyer fit.",
    },
  ],
  complianceChecks: [
    "B2B-only source posture",
    "Suppression handoff required before outreach",
  ],
  freshness: "Scanned just now",
  nextAction: "Review qualified evidence before campaign enrollment.",
  summary: "Website source run completed.",
};

const acceptedLead: LeadRecord = {
  id: "lead-1",
  fullName: "Maya Sinha",
  email: "maya@example.com",
  phone: "+1 555 0101",
  company: "PipelineForge",
  source: "website-crawler",
  status: "qualified",
  score: 88,
  lastTouchpoint: "Imported from source run",
  rejectionReason: null,
};

describe("source acquisition readiness", () => {
  it("treats high-evidence mock source runs as guarded instead of production-ready", () => {
    const readiness = buildSourceAcquisitionReadiness({
      sourcePlan,
      sourceRuns: [run],
      leads: [acceptedLead],
      providers: providerSummary,
      generatedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(readiness).toMatchObject({
      surface: "source-acquisition-readiness",
      posture: "guarded",
      summary: {
        plannedSources: 3,
        runSources: 1,
        needsReviewSources: 1,
        missingSources: 2,
        mockSourceProviders: 2,
        averageQualityScore: 86,
      },
    });
    expect(
      readiness.lanes.find((lane) => lane.source === "website"),
    ).toMatchObject({
      provider: "website-crawler",
      status: "needs_review",
      providerMode: "mock",
      qualityScore: 86,
      acceptanceRatePct: 50,
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "production_expansion",
      ),
    ).toMatchObject({
      status: "blocked",
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "provider_terms_policy",
      ),
    ).toMatchObject({
      status: "blocked",
      evidence: ["terms policy not configured"],
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "rate_limit_consent_policy",
      ),
    ).toMatchObject({
      status: "blocked",
      evidence: [
        "rate-limit policy not configured",
        "consent policy not configured",
      ],
    });
    expect(readiness.summary.productionBlockers).toEqual(
      expect.arrayContaining([
        "Source-provider terms policy is not configured for live source expansion.",
        "Source-provider rate-limit policy is not configured for live source expansion.",
        "Source-provider consent policy is not configured for live source expansion.",
        "Source-provider invoice reconciliation is not configured for live source expansion.",
        "Source-quality governance is not configured for live source expansion.",
      ]),
    );
    expect(readiness.unavailableClaims.join(" ")).toContain(
      "Universal autonomous scraping",
    );
  });

  it("marks source-provider governance controls ready when deployment policies are configured", () => {
    const readiness = buildSourceAcquisitionReadiness({
      sourcePlan,
      sourceRuns: [run],
      leads: [acceptedLead],
      providers: providerSummary,
      sourceProviderGovernance: {
        providerTermsConfigured: true,
        rateLimitPolicyConfigured: true,
        consentPolicyConfigured: true,
        invoiceReconciliationConfigured: true,
        qualityGovernanceConfigured: true,
      },
      generatedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(
      readiness.controls.find(
        (control) => control.id === "provider_terms_policy",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["terms policy configured"],
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "rate_limit_consent_policy",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["rate-limit policy configured", "consent policy configured"],
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "invoice_reconciliation",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["invoice reconciliation configured"],
    });
    expect(
      readiness.controls.find(
        (control) => control.id === "source_quality_governance",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["quality governance configured"],
    });
    expect(readiness.summary.productionBlockers).not.toContain(
      "Source-provider terms policy is not configured for live source expansion.",
    );
    expect(readiness.summary.productionBlockers).toContain(
      "Lead-source adapters are still mock-backed and need production provider integrations before scale.",
    );
  });

  it("blocks scale when source runs do not include evidence and compliance checks", () => {
    const readiness = buildSourceAcquisitionReadiness({
      sourcePlan: {
        ...sourcePlan,
        sources: ["website"],
      },
      sourceRuns: [
        {
          ...run,
          qualityScore: 42,
          evidence: [],
          rejectionReasons: [],
          complianceChecks: [],
        },
      ],
      leads: [],
      providers: providerSummary,
      generatedAt: "2026-06-05T12:00:00.000Z",
    });

    expect(readiness.posture).toBe("blocked");
    expect(readiness.summary.blockedSources).toBe(1);
    expect(readiness.lanes[0]?.blockers).toEqual(
      expect.arrayContaining([
        "Quality score is below the minimum review threshold.",
        "Accepted leads need source evidence before outreach handoff.",
        "Compliance and suppression handoff checks are missing.",
      ]),
    );
  });
});
