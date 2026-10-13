import { describe, expect, it } from "vitest";
import type { ConversionWorkQueueResponse } from "@sales/shared";
import { buildConversionFollowUpInsight } from "../lib/conversion-follow-up";

const baseQueue: ConversionWorkQueueResponse = {
  surface: "conversion-work-queue",
  version: "2026-06-04.conversion-work-queue",
  generatedAt: "2026-06-04T12:00:00.000Z",
  workspace: {
    name: "Growth OS",
    planKey: "pro",
  },
  posture: "ready",
  title: "Conversion work queue ready",
  summary: "1 conversion task prioritized from current workspace state.",
  metrics: [],
  items: [],
  guardrails: [
    "Read-only conversion work queue; no meeting, call, outreach, or provider state changes are performed.",
  ],
  unavailableClaims: [
    "The queue does not auto-schedule meetings, auto-contact leads, or guarantee conversion.",
  ],
};

const lead = {
  id: "lead-1",
  fullName: "Nina Carter",
  company: "VectrCloud",
  status: "qualified" as const,
  score: 86,
  contact: "nina@example.com",
};

describe("conversion follow-up insight", () => {
  it("keeps blocked call review as the primary operator move", () => {
    const insight = buildConversionFollowUpInsight({
      ...baseQueue,
      posture: "blocked",
      items: [
        {
          id: "call-review-call-1",
          type: "call_review",
          title: "Review call before follow-up",
          detail: "Nina Carter has a call in review state.",
          urgency: "blocked",
          dueAt: null,
          dueLabel: "Review required",
          owner: null,
          suggestedAction: "Resolve the call review before any next voice or meeting follow-through.",
          href: "/dashboard#calls-and-meetings",
          lead,
          relatedRecord: {
            kind: "call",
            id: "call-1",
          },
          evidence: ["/v1/dashboard", "/v1/calls/:id/review"],
        },
      ],
    });

    expect(insight).toMatchObject({
      tone: "blocked",
      headline: "Resolve review gates before follow-up",
      primaryAction: {
        label: "Review call",
        dueLabel: "Review required",
      },
    });
    expect(insight.lanes.find((lane) => lane.id === "review_gates")).toMatchObject({
      value: "1",
      tone: "blocked",
    });
    expect(insight.riskSummary).toContain("1 blocked task");
  });

  it("summarizes ready meeting prep and handoff work by lane", () => {
    const insight = buildConversionFollowUpInsight({
      ...baseQueue,
      items: [
        {
          id: "meeting_prep-meeting-1",
          type: "meeting_prep",
          title: "Prepare upcoming meeting",
          detail: "Nina Carter is scheduled with Owner.",
          urgency: "medium",
          dueAt: "2026-06-04T18:00:00.000Z",
          dueLabel: "Due within 24h",
          owner: "Owner",
          suggestedAction: "Review lead context before the meeting.",
          href: "/dashboard#calls-and-meetings",
          lead,
          relatedRecord: {
            kind: "meeting",
            id: "meeting-1",
          },
          evidence: ["/v1/dashboard", "/v1/meetings/:id"],
        },
        {
          id: "schedule_meeting-lead-1",
          type: "schedule_meeting",
          title: "Schedule conversion meeting",
          detail: "Nina Carter is ready for a manual conversion handoff.",
          urgency: "medium",
          dueAt: null,
          dueLabel: "Ready now",
          owner: null,
          suggestedAction: "Schedule a manual meeting from the dashboard after operator review.",
          href: "/dashboard#calls-and-meetings",
          lead,
          relatedRecord: {
            kind: "lead",
            id: "lead-1",
          },
          evidence: ["/v1/dashboard", "/v1/meetings"],
        },
      ],
    });

    expect(insight).toMatchObject({
      tone: "warn",
      headline: "Next conversion move is ready",
      primaryAction: {
        label: "Prepare meeting",
        title: "Prepare upcoming meeting",
      },
    });
    expect(insight.lanes.find((lane) => lane.id === "meeting_follow_up")).toMatchObject({
      value: "1",
      tone: "warn",
    });
    expect(insight.lanes.find((lane) => lane.id === "handoff")).toMatchObject({
      value: "1",
      tone: "warn",
    });
  });

  it("reports clear posture without a primary action", () => {
    const insight = buildConversionFollowUpInsight({
      ...baseQueue,
      posture: "clear",
      title: "Conversion queue clear",
      summary: "0 conversion tasks prioritized from current workspace state.",
      items: [],
    });

    expect(insight).toMatchObject({
      tone: "good",
      headline: "Conversion loop is clear",
      primaryAction: null,
      riskSummary: "No visible conversion risk is open in the current queue.",
    });
    expect(insight.lanes.every((lane) => lane.tone === "good" || lane.tone === "neutral")).toBe(true);
  });
});
