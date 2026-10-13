import { describe, expect, it } from "vitest";
import { sourceRunSchema } from "../src/domain";

describe("source run evidence contract", () => {
  it("defaults evidence controls for older source run records", () => {
    const parsed = sourceRunSchema.parse({
      id: "run-old",
      source: "website",
      status: "completed",
      candidatesFound: 12,
      qualifiedCount: 4,
      rejectedCount: 8,
      summary: "Older source run without evidence columns.",
    });

    expect(parsed).toMatchObject({
      providerMode: "mock",
      dedupedCount: 0,
      qualityScore: 0,
      evidence: [],
      rejectionReasons: [],
      complianceChecks: [],
      freshness: "Not recorded",
      nextAction: "Review source evidence before outreach.",
    });
  });

  it("accepts source evidence, rejection reasons, and compliance checks", () => {
    const parsed = sourceRunSchema.parse({
      id: "run-1",
      source: "website-crawler",
      status: "completed",
      providerMode: "configured",
      candidatesFound: 30,
      dedupedCount: 5,
      qualifiedCount: 12,
      rejectedCount: 13,
      qualityScore: 88,
      evidence: [
        {
          label: "Public business signal",
          value: "B2B SaaS pricing page",
          detail: "Matched ICP and region.",
          url: "https://example.com/pricing",
          confidence: 92,
        },
      ],
      rejectionReasons: [
        {
          reason: "No public business signal",
          count: 4,
          detail: "Company profile could not be verified.",
        },
      ],
      complianceChecks: ["B2B-only source posture"],
      freshness: "Scanned 2h ago",
      nextAction: "Review qualified evidence before campaign enrollment.",
      summary: "Source run with evidence.",
    });

    expect(parsed.evidence[0]).toMatchObject({
      label: "Public business signal",
      confidence: 92,
    });
    expect(parsed.qualityScore).toBe(88);
  });
});
