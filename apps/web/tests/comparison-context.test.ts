import { describe, expect, it } from "vitest";
import {
  buildComparisonContactUrl,
  buildComparisonGetStartedUrl,
  formatComparisonContactMessage,
  parseComparisonContactContext,
} from "../lib/comparison-context";

describe("sales tool comparison acquisition context", () => {
  it("builds claim-safe contact and get-started URLs", () => {
    expect(buildComparisonContactUrl("rollout_review")).toBe(
      "/contact?intent=managed_services&utm_source=sales_tool_comparison&utm_medium=seo_comparison&utm_campaign=sales_tool_comparison&comparisonIntent=rollout_review",
    );
    expect(buildComparisonGetStartedUrl("workspace_start")).toBe(
      "/get-started?utm_source=sales_tool_comparison&utm_medium=seo_comparison&utm_campaign=sales_tool_comparison&comparisonIntent=workspace_start",
    );
  });

  it("parses and formats comparison context for reviewed handoff", () => {
    const context = parseComparisonContactContext({
      utm_source: "sales_tool_comparison",
      comparisonIntent: "rollout_review",
    });

    expect(context).toMatchObject({
      label: "Sales tool comparison",
      intentLabel: "Rollout review",
      sourcePath: "/compare-sales-tools",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 600,
      goals: expect.arrayContaining([
        "Build a Sales Blueprint",
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
      ]),
    });
    expect(formatComparisonContactMessage(context!)).toContain(
      "Sales tool comparison context attached for review",
    );
    expect(formatComparisonContactMessage(context!)).toContain(
      "No lead sourcing, live outreach, provider work, billing change, or Telegram-controlled mutation",
    );
  });

  it("ignores unsupported sources and falls back to tool consolidation intent", () => {
    expect(parseComparisonContactContext({ utm_source: "resources" })).toBeNull();
    expect(
      parseComparisonContactContext({
        utm_source: "sales_tool_comparison",
        comparisonIntent: "surprise",
      }),
    ).toMatchObject({
      intent: "tool_consolidation",
      intentLabel: "Tool consolidation",
    });
  });
});
