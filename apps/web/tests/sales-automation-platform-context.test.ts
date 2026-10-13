import { describe, expect, it } from "vitest";
import {
  buildSalesAutomationPlatformContactUrl,
  buildSalesAutomationPlatformGetStartedUrl,
  buildSalesAutomationPlatformPricingUrl,
  formatSalesAutomationPlatformContactMessage,
  parseSalesAutomationPlatformContactContext,
} from "../lib/sales-automation-platform-context";

describe("sales automation platform context", () => {
  it("builds attributed platform URLs", () => {
    expect(buildSalesAutomationPlatformContactUrl("rollout_review")).toBe(
      "/contact?intent=managed_services&utm_source=ai_sales_automation_platform&utm_medium=seo_landing&utm_campaign=ai_sales_automation_platform&platformIntent=rollout_review",
    );
    expect(buildSalesAutomationPlatformGetStartedUrl("full_workflow_review")).toBe(
      "/get-started?utm_source=ai_sales_automation_platform&utm_medium=seo_landing&utm_campaign=ai_sales_automation_platform&platformIntent=full_workflow_review",
    );
    expect(buildSalesAutomationPlatformPricingUrl()).toBe(
      "/pricing?utm_source=ai_sales_automation_platform&utm_medium=seo_landing&utm_campaign=ai_sales_automation_platform&platformIntent=pricing_review",
    );
  });

  it("parses full-platform acquisition context", () => {
    const context = parseSalesAutomationPlatformContactContext({
      utm_source: "ai_sales_automation_platform",
      platformIntent: "telegram_review",
    });

    expect(context).toMatchObject({
      label: "AI sales automation platform",
      intent: "telegram_review",
      intentLabel: "Telegram review",
      sourcePath: "/ai-sales-automation-platform",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 1000,
    });
    expect(context?.channels).toEqual(
      expect.arrayContaining(["website", "directory", "email", "call", "telegram"]),
    );
    expect(context?.goals).toEqual(
      expect.arrayContaining([
        "Build a Sales Blueprint",
        "Generate qualified leads",
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
        "Connect Telegram command center",
      ]),
    );
  });

  it("keeps the formatted intake message claim-safe", () => {
    const context = parseSalesAutomationPlatformContactContext({
      utm_source: "ai_sales_automation_platform",
      platformIntent: "surprise",
    });

    expect(context?.intent).toBe("full_workflow_review");

    const message = formatSalesAutomationPlatformContactMessage(context!);

    expect(message).toContain("AI sales automation platform context attached for review");
    expect(message).toContain("Intent: Full workflow review");
    expect(message).toContain("Sales Blueprint context");
    expect(message).toContain("No broad live source expansion");
    expect(message.toLowerCase()).not.toContain("guaranteed revenue");
    expect(message.toLowerCase()).not.toContain("fully autonomous");
  });

  it("ignores unsupported acquisition sources", () => {
    expect(
      parseSalesAutomationPlatformContactContext({
        utm_source: "ai_sdr_software",
        platformIntent: "full_workflow_review",
      }),
    ).toBeNull();
  });
});
