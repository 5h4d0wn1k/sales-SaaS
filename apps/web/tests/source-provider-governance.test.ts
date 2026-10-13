import { describe, expect, it } from "vitest";
import type { SourceAcquisitionReadinessResponse } from "@sales/shared";
import {
  buildSourceProviderGovernanceRunGate,
  normalizeSourceProviderGovernanceError,
  readSourceProviderGovernanceSearchParams,
} from "../lib/source-provider-governance";

function readiness(
  overrides: Partial<SourceAcquisitionReadinessResponse["summary"]> = {},
  controls: SourceAcquisitionReadinessResponse["controls"] = [],
): SourceAcquisitionReadinessResponse {
  return {
    surface: "source-acquisition-readiness",
    version: "2026-06-05.source-acquisition-readiness",
    generatedAt: "2026-06-06T00:00:00.000Z",
    posture: "guarded",
    summary: {
      plannedSources: 2,
      runSources: 1,
      totalRuns: 1,
      readySources: 0,
      needsReviewSources: 1,
      missingSources: 1,
      blockedSources: 0,
      configuredSourceProviders: 0,
      guardedSourceProviders: 2,
      mockSourceProviders: 2,
      averageQualityScore: 80,
      acceptedLeads: 1,
      rejectedCandidates: 3,
      dedupedCandidates: 2,
      evidenceSignals: 2,
      complianceChecks: 1,
      productionBlockers: [],
      ...overrides,
    },
    lanes: [],
    controls,
    guardrails: [],
    unavailableClaims: [],
  };
}

describe("source provider governance helpers", () => {
  it("does not block mock-only source runs", () => {
    expect(
      buildSourceProviderGovernanceRunGate(
        readiness({ configuredSourceProviders: 0 }),
      ),
    ).toBeNull();
  });

  it("blocks configured source runs when governance controls are not ready", () => {
    const gate = buildSourceProviderGovernanceRunGate(
      readiness(
        { configuredSourceProviders: 2 },
        [
          {
            id: "provider_terms_policy",
            title: "Provider terms policy",
            status: "blocked",
            tone: "blocked",
            detail: "Document terms.",
            evidence: [],
          },
          {
            id: "source_quality_governance",
            title: "Source-quality governance",
            status: "blocked",
            tone: "blocked",
            detail: "Configure quality governance.",
            evidence: [],
          },
        ],
      ),
    );

    expect(gate).toMatchObject({
      message:
        "Configured source-provider work is blocked until source governance is configured.",
      settingsPath: "/settings#provider-readiness",
    });
    expect(gate?.controlsSummary).toContain("Provider terms policy");
    expect(gate?.controlsSummary).toContain("Source-quality governance");
  });

  it("allows configured source runs when governance controls are ready", () => {
    expect(
      buildSourceProviderGovernanceRunGate(
        readiness(
          { configuredSourceProviders: 1 },
          [
            {
              id: "provider_terms_policy",
              title: "Provider terms policy",
              status: "ready",
              tone: "good",
              detail: "Terms configured.",
              evidence: [],
            },
            {
              id: "rate_limit_consent_policy",
              title: "Rate limits and consent",
              status: "ready",
              tone: "good",
              detail: "Policies configured.",
              evidence: [],
            },
            {
              id: "invoice_reconciliation",
              title: "Invoice reconciliation",
              status: "ready",
              tone: "good",
              detail: "Invoice review configured.",
              evidence: [],
            },
            {
              id: "source_quality_governance",
              title: "Source-quality governance",
              status: "ready",
              tone: "good",
              detail: "Quality governance configured.",
              evidence: [],
            },
          ],
        ),
      ),
    ).toBeNull();
  });

  it("normalizes API governance errors and dashboard search params", () => {
    const apiContext = normalizeSourceProviderGovernanceError({
      code: "source_provider_governance_required",
      missingControls: [
        { id: "provider_terms_policy", label: "Source-provider terms policy" },
      ],
    });
    const searchContext = readSourceProviderGovernanceSearchParams(
      {
        sourceGate: "governance",
        sourceControls: "Missing source governance: terms policy.",
      },
      "source",
    );

    expect(apiContext?.controlsSummary).toContain("terms policy");
    expect(searchContext).toMatchObject({
      settingsPath: "/settings#provider-readiness",
      controlsSummary: "Missing source governance: terms policy.",
    });
  });
});
