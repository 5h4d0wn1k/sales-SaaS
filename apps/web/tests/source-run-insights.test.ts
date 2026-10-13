import { describe, expect, it } from "vitest";
import type { SourceRun } from "@sales/shared";
import { buildSourceRunReviewInsight } from "../lib/source-run-insights";

const baseRun: SourceRun = {
  id: "run-1",
  source: "website-crawler",
  status: "completed",
  providerMode: "mock",
  candidatesFound: 30,
  dedupedCount: 6,
  qualifiedCount: 12,
  rejectedCount: 12,
  qualityScore: 86,
  evidence: [
    {
      label: "ICP signal",
      value: "B2B SaaS pricing page",
      detail: "Matched target segment.",
      url: "https://example.com/pricing",
      confidence: 92,
    },
    {
      label: "Hiring signal",
      value: "Open sales role",
      detail: "Suggests active revenue motion.",
      url: null,
      confidence: 81,
    },
  ],
  rejectionReasons: [
    {
      reason: "No public business signal",
      count: 5,
      detail: "The company profile could not be verified.",
    },
    {
      reason: "Duplicate account",
      count: 2,
      detail: "Already present in reviewed leads.",
    },
  ],
  complianceChecks: [
    "B2B-only source posture",
    "Suppression handoff required before outreach",
  ],
  freshness: "Scanned today",
  nextAction: "Review qualified evidence before campaign enrollment.",
  summary: "Reviewable source run.",
};

describe("source run review insights", () => {
  it("marks high-quality evidenced source runs as ready for outreach review", () => {
    const insight = buildSourceRunReviewInsight(baseRun);

    expect(insight).toMatchObject({
      posture: "review_ready",
      tone: "good",
      label: "Review Ready",
      acceptanceRate: 50,
      acceptanceRateLabel: "50% accepted",
      reviewedCandidates: 24,
      topEvidenceLabel: "ICP signal: B2B SaaS pricing page (92%)",
      topRejectionLabel: "No public business signal (5)",
      complianceSummary: "2 checks recorded",
    });
  });

  it("marks rejection-heavy source runs as needing review before campaign enrollment", () => {
    const insight = buildSourceRunReviewInsight({
      ...baseRun,
      qualifiedCount: 6,
      rejectedCount: 18,
      qualityScore: 74,
    });

    expect(insight).toMatchObject({
      posture: "needs_review",
      tone: "warn",
      acceptanceRateLabel: "25% accepted",
    });
    expect(insight.decisionDetail).toContain("Review evidence quality");
  });

  it("blocks source runs that lack evidence or compliance checks", () => {
    const insight = buildSourceRunReviewInsight({
      ...baseRun,
      qualityScore: 55,
      evidence: [],
      complianceChecks: [],
    });

    expect(insight).toMatchObject({
      posture: "blocked",
      tone: "blocked",
      topEvidenceLabel: "No evidence recorded",
      complianceSummary: "No compliance checks recorded",
    });
    expect(insight.decisionDetail).toContain("Do not enroll");
  });
});
