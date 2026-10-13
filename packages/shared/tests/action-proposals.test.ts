import { describe, expect, it } from "vitest";
import {
  actionProposalListResponseSchema,
  createActionProposalInputSchema,
  reviewActionProposalInputSchema,
} from "../src/domain";

describe("action proposal contract", () => {
  it("normalizes guarded proposal creation input", () => {
    const parsed = createActionProposalInputSchema.parse({
      type: "telegram_pause",
      title: "Pause outreach from Telegram",
      detail: "Telegram requested a pause that needs in-app approval before campaign state changes.",
      proposedBy: "telegram",
      targetKind: "workspace",
      targetId: null,
      targetLabel: "Workspace outreach",
      payloadSummary: "Pause running campaigns after approval.",
      guardrails: "No webhook mutation, Owner approval required",
      expectedEffect: "Running campaigns move to paused.",
      rollbackPlan: "Reject the proposal to keep campaigns running.",
      requestedBy: "ops_admin",
    });

    expect(parsed).toMatchObject({
      riskLevel: "medium",
      requiredRole: "admin",
      guardrails: ["No webhook mutation", "Owner approval required"],
    });
  });

  it("requires a review decision and note", () => {
    expect(reviewActionProposalInputSchema.parse({
      decision: "approve",
      note: "Looks safe.",
    })).toEqual({
      decision: "approve",
      note: "Looks safe.",
    });

    expect(() =>
      reviewActionProposalInputSchema.parse({
        decision: "approve",
        note: "",
      }),
    ).toThrow();
  });

  it("validates list summaries for inbox views", () => {
    const response = actionProposalListResponseSchema.parse({
      proposals: [],
      summary: {
        pending: 0,
        highRisk: 0,
        approved: 1,
        rejected: 1,
      },
    });

    expect(response.summary).toMatchObject({
      pending: 0,
      approved: 1,
    });
  });
});
