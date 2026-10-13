import { describe, expect, it } from "vitest";
import {
  buildOutboundAutomationContactUrl,
  buildOutboundAutomationGetStartedUrl,
  buildOutboundAutomationPricingUrl,
  formatOutboundAutomationContactMessage,
  parseOutboundAutomationContactContext,
} from "../lib/outbound-automation-context";

describe("outbound automation context", () => {
  it("builds attributed outbound automation URLs", () => {
    expect(buildOutboundAutomationContactUrl("rollout_review")).toBe(
      "/contact?intent=managed_services&utm_source=ai_outbound_sales_automation&utm_medium=seo_landing&utm_campaign=outbound_sales_automation&outboundIntent=rollout_review",
    );
    expect(buildOutboundAutomationGetStartedUrl("sequence_review")).toBe(
      "/get-started?utm_source=ai_outbound_sales_automation&utm_medium=seo_landing&utm_campaign=outbound_sales_automation&outboundIntent=sequence_review",
    );
    expect(buildOutboundAutomationPricingUrl()).toBe(
      "/pricing?utm_source=ai_outbound_sales_automation&utm_medium=seo_landing&utm_campaign=outbound_sales_automation&outboundIntent=pricing_review",
    );
  });

  it("parses outbound automation acquisition context", () => {
    const context = parseOutboundAutomationContactContext({
      utm_source: "ai_outbound_sales_automation",
      outboundIntent: "approval_review",
    });

    expect(context).toMatchObject({
      label: "AI outbound sales automation",
      intent: "approval_review",
      intentLabel: "Approval review",
      sourcePath: "/ai-outbound-sales-automation",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 600,
    });
    expect(context?.channels).toEqual(
      expect.arrayContaining(["email", "call", "linkedin review", "telegram"]),
    );
    expect(context?.goals).toEqual(
      expect.arrayContaining([
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
        "Connect Telegram command center",
      ]),
    );
  });

  it("keeps the formatted intake message claim-safe", () => {
    const context = parseOutboundAutomationContactContext({
      utm_source: "ai_outbound_sales_automation",
      outboundIntent: "surprise",
    });

    expect(context?.intent).toBe("sequence_review");

    const message = formatOutboundAutomationContactMessage(context!);

    expect(message).toContain("AI outbound sales automation context attached for review");
    expect(message).toContain("Intent: Sequence review");
    expect(message).toContain("No live sends");
    expect(message.toLowerCase()).not.toContain("guaranteed meetings");
    expect(message.toLowerCase()).not.toContain("fully autonomous");
  });

  it("ignores unsupported acquisition sources", () => {
    expect(
      parseOutboundAutomationContactContext({
        utm_source: "ai_lead_generation_software",
        outboundIntent: "sequence_review",
      }),
    ).toBeNull();
  });
});
