import { afterEach, describe, expect, it, vi } from "vitest";
import {
  discoverLeadsResponseSchema,
  sourceAcquisitionReadinessResponseSchema,
  sourceRunSchema,
} from "@sales/shared";
import { createApp } from "../src/app";

describe("source run evidence", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns quality, dedupe, evidence, and rejection reasons for source runs", async () => {
    const app = createApp();
    const beforeDashboardResponse = await app.request("/v1/dashboard");
    const beforeDashboard = await beforeDashboardResponse.json();
    const response = await app.request("/v1/leads/source-run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        source: "website-crawler",
      }),
    });
    const body = await response.json();
    const run = sourceRunSchema.parse(body.run);

    expect(response.status).toBe(201);
    expect(run).toMatchObject({
      source: "website-crawler",
      status: "completed",
      providerMode: "mock",
    });
    expect(run.dedupedCount).toBeGreaterThan(0);
    expect(run.qualityScore).toBeGreaterThan(0);
    expect(run.evidence.length).toBeGreaterThan(0);
    expect(run.rejectionReasons.length).toBeGreaterThan(0);
    expect(run.complianceChecks).toEqual(
      expect.arrayContaining(["Suppression handoff required before outreach"]),
    );

    const afterDashboardResponse = await app.request("/v1/dashboard");
    const afterDashboard = await afterDashboardResponse.json();
    expect(afterDashboard.subscription.monthlyUsage).toBe(
      beforeDashboard.subscription.monthlyUsage + body.accepted.length,
    );
  });

  it("includes enriched evidence in multi-source discovery responses", async () => {
    const app = createApp();
    const response = await app.request("/v1/leads/discover", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        limitSources: 2,
      }),
    });
    const body = discoverLeadsResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.runs.length).toBeGreaterThan(0);
    expect(body.runs[0]?.run.evidence.length).toBeGreaterThan(0);
    expect(body.runs[0]?.run.nextAction).toContain("Review");
  });

  it("summarizes source acquisition readiness without claiming production scraping", async () => {
    const app = createApp();
    const response = await app.request(
      "/v1/leads/source-acquisition-readiness",
    );
    const body = sourceAcquisitionReadinessResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "source-acquisition-readiness",
      posture: "guarded",
    });
    expect(body.summary.plannedSources).toBeGreaterThan(0);
    expect(body.summary.totalRuns).toBeGreaterThan(0);
    expect(body.lanes.some((lane) => lane.status === "needs_review")).toBe(
      true,
    );
    expect(
      body.controls.find((control) => control.id === "production_expansion"),
    ).toMatchObject({
      status: "blocked",
    });
    expect(
      body.controls.find((control) => control.id === "provider_terms_policy"),
    ).toMatchObject({
      status: "blocked",
    });
    expect(body.summary.productionBlockers).toEqual(
      expect.arrayContaining([
        "Source-provider terms policy is not configured for live source expansion.",
        "Source-provider rate-limit policy is not configured for live source expansion.",
        "Source-provider consent policy is not configured for live source expansion.",
        "Source-provider invoice reconciliation is not configured for live source expansion.",
        "Source-quality governance is not configured for live source expansion.",
      ]),
    );
    expect(body.unavailableClaims.join(" ")).toContain(
      "Universal autonomous scraping",
    );
  });

  it("reflects configured source-provider governance readiness from deployment flags", async () => {
    vi.stubEnv("SOURCE_PROVIDER_TERMS_POLICY_CONFIGURED", "true");
    vi.stubEnv("SOURCE_PROVIDER_RATE_LIMIT_POLICY_CONFIGURED", "true");
    vi.stubEnv("SOURCE_PROVIDER_CONSENT_POLICY_CONFIGURED", "true");
    vi.stubEnv("SOURCE_PROVIDER_INVOICE_RECONCILIATION_CONFIGURED", "true");
    vi.stubEnv("SOURCE_PROVIDER_QUALITY_GOVERNANCE_CONFIGURED", "true");

    const app = createApp();
    const response = await app.request(
      "/v1/leads/source-acquisition-readiness",
    );
    const body = sourceAcquisitionReadinessResponseSchema.parse(
      await response.json(),
    );

    expect(response.status).toBe(200);
    expect(
      body.controls.find((control) => control.id === "provider_terms_policy"),
    ).toMatchObject({
      status: "ready",
      evidence: ["terms policy configured"],
    });
    expect(
      body.controls.find(
        (control) => control.id === "rate_limit_consent_policy",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["rate-limit policy configured", "consent policy configured"],
    });
    expect(
      body.controls.find((control) => control.id === "invoice_reconciliation"),
    ).toMatchObject({
      status: "ready",
      evidence: ["invoice reconciliation configured"],
    });
    expect(
      body.controls.find(
        (control) => control.id === "source_quality_governance",
      ),
    ).toMatchObject({
      status: "ready",
      evidence: ["quality governance configured"],
    });
    expect(body.summary.productionBlockers).not.toContain(
      "Source-provider terms policy is not configured for live source expansion.",
    );
    expect(body.unavailableClaims.join(" ")).toContain(
      "Universal autonomous scraping",
    );
  });
});
