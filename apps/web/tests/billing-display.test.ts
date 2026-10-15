import { describe, expect, it } from "vitest";
import {
  calculateBillingProviderCostPercent,
  formatBillingChannels,
  formatBillingMetricLabel,
  formatBillingPlanName,
  formatBillingSeats,
  formatBillingStatusLabel,
  formatBillingUsageLimit,
  formatBillingUsageValue,
} from "../lib/billing-display";

describe("billing display helpers", () => {
  it("keeps plan, channel, and boundary labels buyer-readable", () => {
    expect(formatBillingPlanName("pro")).toBe("Professional");
    expect(formatBillingPlanName("enterprise_plus")).toBe("Enterprise Plus");
    expect(formatBillingPlanName(null)).toBe("No plan");
    expect(formatBillingChannels(["email", "call", "linkedin"])).toBe(
      "Email, Call, Review-gated LinkedIn",
    );
    expect(formatBillingChannels([])).toBe("None configured");
    expect(formatBillingUsageLimit(5000)).toBe("5,000 leads/mo");
    expect(formatBillingUsageLimit(null)).toBe("Unlimited");
    expect(formatBillingSeats(1)).toBe("1 seat");
    expect(formatBillingSeats(999)).toBe("Unlimited");
  });

  it("formats usage metrics without exposing raw storage names", () => {
    expect(formatBillingMetricLabel("leads_created")).toBe("Leads created");
    expect(formatBillingMetricLabel("provider_cost_cents")).toBe("Provider cost");
    expect(formatBillingMetricLabel("crm_sync_jobs")).toBe("CRM Sync Jobs");
    expect(formatBillingUsageValue("leads_created", 1234)).toBe("1,234");
    expect(formatBillingUsageValue("provider_cost_cents", 2500)).toBe("$25");
    expect(formatBillingStatusLabel("past_due")).toBe("past due");
  });

  it("clamps provider budget usage for billing command-center progress bars", () => {
    expect(calculateBillingProviderCostPercent(2500, 10000)).toBe(25);
    expect(calculateBillingProviderCostPercent(15000, 10000)).toBe(100);
    expect(calculateBillingProviderCostPercent(-500, 10000)).toBe(0);
    expect(calculateBillingProviderCostPercent(2500, 0)).toBe(0);
  });
});
