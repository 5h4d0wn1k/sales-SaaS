import { describe, expect, it } from "vitest";
import { PRICING_PLANS } from "@sales/shared";
import {
  buildPricingComparisonRows,
  buildPricingFitAdvisorRows,
  buildPricingGetStartedUrl,
  buildPricingManagedServiceContactUrl,
  formatAiWorkerExecutionBudget,
  formatAiWorkerTaskProposalLimit,
  formatChannels,
  formatOutreachDispatchLimit,
  formatProviderBudget,
  formatSeats,
  formatUsageLimit,
  formatVoiceCallLimit,
  parsePricingContactContext,
} from "../lib/pricing-display";

describe("pricing display helpers", () => {
  it("formats plan boundaries for buyer-facing comparison", () => {
    expect(formatUsageLimit(20000)).toBe("20,000 leads/mo");
    expect(formatOutreachDispatchLimit(0)).toBe("No live dispatch");
    expect(formatOutreachDispatchLimit(1000)).toBe("1,000 dispatches/mo");
    expect(formatVoiceCallLimit(0)).toBe("No voice calls");
    expect(formatVoiceCallLimit(250)).toBe("250 voice calls/mo");
    expect(formatProviderBudget(15000)).toBe("$150/mo");
    expect(formatAiWorkerTaskProposalLimit(50)).toBe("50 AI proposals/mo");
    expect(formatAiWorkerExecutionBudget(15000)).toBe("$150/mo AI dry-run");
    expect(formatSeats(1)).toBe("1 seat");
    expect(formatSeats(999)).toBe("Unlimited");
    expect(formatChannels(["email", "call", "linkedin"])).toBe(
      "Email, Call, Review-gated LinkedIn",
    );
  });

  it("builds attributed get-started URLs for pricing CTAs", () => {
    expect(buildPricingGetStartedUrl("pro")).toBe(
      "/get-started?plan=pro&utm_source=pricing&utm_medium=pricing_page&utm_campaign=plan_selection&pricingIntent=plan_card",
    );
    expect(buildPricingGetStartedUrl("missing", "comparison_table")).toBe(
      "/get-started?plan=free&utm_source=pricing&utm_medium=pricing_page&utm_campaign=plan_selection&pricingIntent=comparison_table",
    );
  });

  it("builds attributed managed-service contact URLs for pricing buyers", () => {
    expect(buildPricingManagedServiceContactUrl("setup-sprint")).toBe(
      "/contact?intent=managed_services&utm_source=pricing&utm_medium=pricing_page&utm_campaign=managed_services_setup_sprint&managedPackage=setup-sprint&managedIntent=pricing_setup_review&pricingIntent=managed_services_addon",
    );
  });

  it("parses pricing contact context for visible intake handoff", () => {
    expect(
      parsePricingContactContext({
        utm_source: "pricing",
        plan: "pro",
        pricingIntent: "fit_active_team",
        managedPackage: "operator-assist",
        managedIntent: "pricing_setup_review",
      }),
    ).toMatchObject({
      intent: "fit_active_team",
      intentLabel: "Active campaign team fit",
      planName: "Professional",
      priceLabel: "$99/mo",
      managedTier: "Operator Assist",
      managedIntent: "pricing_setup_review",
      boundaries: expect.arrayContaining([
        {
          label: "Lead volume",
          value: "5,000 leads/mo",
        },
        {
          label: "Provider budget",
          value: "$50/mo",
        },
      ]),
      reassurance:
        "Pricing context is guidance for review; it does not start checkout, provider work, lead sourcing, outreach, billing changes, AI execution, or Telegram-controlled mutation.",
    });

    expect(
      parsePricingContactContext({
        utm_source: "managed_services",
        plan: "pro",
        pricingIntent: "fit_active_team",
      }),
    ).toBeNull();
  });

  it("builds comparison rows from the shared billing catalog", () => {
    const rows = buildPricingComparisonRows();
    const planKeys = PRICING_PLANS.map((plan) => plan.key);

    expect(rows.map((row) => row.label)).toEqual([
      "Best fit",
      "Lead volume",
      "Outreach dispatches",
      "Voice calls",
      "Provider-cost budget",
      "AI worker proposals",
      "AI dry-run budget",
      "Included channels",
      "Workspace seats",
    ]);

    for (const row of rows) {
      expect(Object.keys(row.values)).toEqual(planKeys);
    }

    for (const plan of PRICING_PLANS) {
      expect(rows.find((row) => row.label === "Lead volume")?.values[plan.key]).toBe(
        formatUsageLimit(plan.usageLimit),
      );
      expect(rows.find((row) => row.label === "Outreach dispatches")?.values[plan.key]).toBe(
        formatOutreachDispatchLimit(plan.outreachDispatchLimit),
      );
      expect(rows.find((row) => row.label === "Voice calls")?.values[plan.key]).toBe(
        formatVoiceCallLimit(plan.voiceCallLimit),
      );
      expect(rows.find((row) => row.label === "Provider-cost budget")?.values[plan.key]).toBe(
        formatProviderBudget(plan.providerCostBudgetCents),
      );
      expect(rows.find((row) => row.label === "AI worker proposals")?.values[plan.key]).toBe(
        formatAiWorkerTaskProposalLimit(plan.aiWorkerTaskProposalLimit),
      );
      expect(rows.find((row) => row.label === "AI dry-run budget")?.values[plan.key]).toBe(
        formatAiWorkerExecutionBudget(plan.aiWorkerExecutionBudgetCents),
      );
      expect(rows.find((row) => row.label === "Included channels")?.values[plan.key]).toBe(
        formatChannels(plan.includedChannels),
      );
    }
  });

  it("builds plan-fit advisor rows from the shared billing catalog", () => {
    const rows = buildPricingFitAdvisorRows();

    expect(rows.map((row) => row.recommendedPlanKey)).toEqual([
      "free",
      "starter",
      "pro",
      "elite",
    ]);
    expect(rows.find((row) => row.key === "active_team")).toMatchObject({
      scenario: "Active campaign team",
      recommendedPlanName: "Professional",
      priceLabel: "$99/mo",
      commercialPath: "Operator Assist optional",
      guardrail:
        "Calls and configured provider work remain quota-checked, audit-linked, and approval-gated before spend or dispatch can advance.",
      ctaHref:
        "/get-started?plan=pro&utm_source=pricing&utm_medium=pricing_page&utm_campaign=plan_selection&pricingIntent=fit_active_team",
      reviewHref:
        "/contact?intent=managed_services&utm_source=pricing&utm_medium=pricing_page&utm_campaign=managed_services_operator_assist&managedPackage=operator-assist&managedIntent=pricing_setup_review&pricingIntent=fit_active_team",
      reviewLabel: "Review Operator Assist",
    });

    for (const row of rows) {
      const plan = PRICING_PLANS.find((candidate) => candidate.key === row.recommendedPlanKey);

      expect(plan).toBeTruthy();
      expect(row.proof).toEqual(
        expect.arrayContaining([
          formatUsageLimit(plan!.usageLimit),
          formatOutreachDispatchLimit(plan!.outreachDispatchLimit),
          formatVoiceCallLimit(plan!.voiceCallLimit),
          formatProviderBudget(plan!.providerCostBudgetCents),
          formatAiWorkerTaskProposalLimit(plan!.aiWorkerTaskProposalLimit),
          formatAiWorkerExecutionBudget(plan!.aiWorkerExecutionBudgetCents),
          formatChannels(plan!.includedChannels),
        ]),
      );
      expect(row.boundaries).toEqual(
        expect.arrayContaining([
          {
            label: "Lead volume",
            value: formatUsageLimit(plan!.usageLimit),
          },
          {
            label: "Live dispatch",
            value: formatOutreachDispatchLimit(plan!.outreachDispatchLimit),
          },
          {
            label: "Voice",
            value: formatVoiceCallLimit(plan!.voiceCallLimit),
          },
          {
            label: "Provider budget",
            value: formatProviderBudget(plan!.providerCostBudgetCents),
          },
        ]),
      );
      expect(row.boundaries.find((boundary) => boundary.label === "AI work")?.value).toMatch(
        /proposals \/ \$\d+ dry-run/,
      );
      expect(row.guardrail).toMatch(/gate|gated|review|approval|quota|separate/i);
      expect(row.commercialPath.length).toBeGreaterThan(0);
    }
  });

  it("keeps comparison copy claim-safe", () => {
    const copy = JSON.stringify([
      buildPricingComparisonRows(),
      buildPricingFitAdvisorRows(),
      parsePricingContactContext({
        utm_source: "pricing",
        pricingIntent: "fit_active_team",
        managedPackage: "operator-assist",
      }),
    ]).toLowerCase();

    expect(copy).not.toContain("guaranteed meetings");
    expect(copy).not.toContain("fully autonomous");
    expect(copy).not.toContain("universal live lead scraping");
  });
});
