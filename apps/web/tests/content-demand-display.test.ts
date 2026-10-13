import { describe, expect, it } from "vitest";
import { buildContentDemandRows } from "../lib/content-demand-display";

describe("content demand display model", () => {
  it("keeps source signals, channels, and guardrails visible for dashboard rows", () => {
    const rows = buildContentDemandRows([
      {
        id: "content_1",
        title: "AI sales workflow for founder-led SaaS",
        slug: "ai-sales-workflow-founder-led-saas",
        intent: "seo_landing_page",
        funnelStage: "consideration",
        audience: "Founder-led B2B SaaS",
        priority: 94,
        targetKeywords: [
          "AI sales workflow",
          "founder-led SaaS lead generation",
          "approval-gated outreach",
          "sales blueprint",
        ],
        sourceSignals: [
          "website source evidence",
          "directory source evidence",
          "Match selected regions",
          "Avoid suppressed contacts",
        ],
        suggestedChannels: ["email", "linkedin", "website", "telegram"],
        leadCaptureOffer: "Sales Blueprint teardown request",
        guardrails: [
          "Operator review is required before publishing.",
          "Use source-run evidence instead of unsupported proof claims.",
          "Do not claim full autonomy, guaranteed meetings, or universal scraping.",
        ],
        nextAction: "Draft a claim-safe landing page brief from the Sales Blueprint.",
        status: "ready_for_brief",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "AI sales workflow for founder-led SaaS",
      intentLabel: "SEO Landing Page",
      funnelStageLabel: "Consideration",
      priorityLabel: "94/100",
      priorityTone: "good",
      statusLabel: "Brief ready",
      statusTone: "good",
      leadCaptureOffer: "Sales Blueprint teardown request",
    });
    expect(rows[0]?.keywordSummary).toEqual({
      visible: ["AI sales workflow", "founder-led SaaS lead generation", "approval-gated outreach"],
      overflowLabel: "+1 more",
    });
    expect(rows[0]?.sourceSignalSummary).toEqual({
      visible: ["website source evidence", "directory source evidence", "Match selected regions"],
      overflowLabel: "+1 more",
    });
    expect(rows[0]?.channelSummary).toEqual({
      visible: ["email", "linkedin", "website"],
      overflowLabel: "+1 more",
    });
    expect(rows[0]?.guardrailSummary).toEqual({
      visible: [
        "Operator review is required before publishing.",
        "Use source-run evidence instead of unsupported proof claims.",
      ],
      overflowLabel: "+1 more",
    });
  });

  it("keeps blocked and review states visually distinct", () => {
    const rows = buildContentDemandRows([
      {
        id: "content_blocked",
        title: "Compliance page",
        slug: "compliance-page",
        intent: "risk_objection",
        funnelStage: "conversion",
        audience: "Sales operators",
        priority: 74,
        targetKeywords: ["sales compliance"],
        sourceSignals: ["Sales Blueprint"],
        suggestedChannels: ["website"],
        leadCaptureOffer: "Suppression checklist",
        guardrails: ["Operator review is required before publishing."],
        nextAction: "Resolve blockers.",
        status: "blocked",
      },
      {
        id: "content_review",
        title: "Buyer guide",
        slug: "buyer-guide",
        intent: "buyer_guide",
        funnelStage: "awareness",
        audience: "Founders",
        priority: 80,
        targetKeywords: ["outbound guide"],
        sourceSignals: ["Source plan"],
        suggestedChannels: ["email"],
        leadCaptureOffer: "Pipeline worksheet",
        guardrails: ["Operator review is required before publishing."],
        nextAction: "Review evidence.",
        status: "needs_review",
      },
    ]);

    expect(rows[0]).toMatchObject({
      statusLabel: "Blocked",
      statusTone: "blocked",
      priorityTone: "neutral",
    });
    expect(rows[1]).toMatchObject({
      statusLabel: "Needs review",
      statusTone: "warn",
      priorityTone: "warn",
    });
  });
});
