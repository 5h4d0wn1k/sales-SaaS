import { describe, expect, it } from "vitest";
import {
  actionProposalListResponseSchema,
  actionProposalSchema,
} from "@sales/shared";
import { createApp } from "../src/app";

function proposalInput(overrides: Record<string, unknown> = {}) {
  return {
    type: "ai_worker_action",
    riskLevel: "medium",
    title: "Review AI worker source run",
    detail: "The AI worker wants to run a guarded source plan and needs operator approval first.",
    proposedBy: "ai",
    targetKind: "source_plan",
    targetId: "plan_demo",
    targetLabel: "Demo source plan",
    payloadSummary: "Run a limited source discovery job after review.",
    payload: {
      limit: 25,
    },
    guardrails: [
      "No live outreach from source discovery.",
      "Rejected leads remain excluded.",
    ],
    expectedEffect: "A source run can be queued for reviewable lead discovery.",
    rollbackPlan: "Reject the proposal to keep discovery idle.",
    requiredRole: "admin",
    requestedBy: "ai-sales-operator",
    ...overrides,
  };
}

describe("action proposal routes", () => {
  it("lists pending approval proposals with an inbox summary", async () => {
    const app = createApp();
    const response = await app.request("/v1/action-proposals?status=pending");
    const body = actionProposalListResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.summary.pending).toBeGreaterThanOrEqual(body.proposals.length);
    expect(body.proposals.every((proposal) => proposal.status === "pending")).toBe(true);
  });

  it("creates approval proposals for governed actions", async () => {
    const app = createApp();
    const response = await app.request("/v1/action-proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(proposalInput()),
    });
    const body = actionProposalSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      status: "pending",
      proposedBy: "ai",
      targetLabel: "Demo source plan",
    });
  });

  it("creates provider setup proposals without provider secret values", async () => {
    const app = createApp();
    const response = await app.request("/v1/providers/setup-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider: "resend-fallback",
        kind: "outreach",
        mode: "mock",
        readiness: "blocked",
        channels: ["email"],
        missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
        productionBlockers: ["No production email sender is configured."],
        rolloutGoal: "Prepare Resend for reviewed email rollout",
        businessReason: "Resolve email readiness before live customer outreach.",
      }),
    });
    const body = actionProposalSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      type: "provider_setup",
      status: "pending",
      riskLevel: "high",
      targetKind: "provider",
      targetId: "resend-fallback",
      proposedBy: "operator",
    });
    expect(body.payload).toMatchObject({
      provider: "resend-fallback",
      secretValuesAccepted: false,
      liveProviderWork: false,
    });
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("approves a campaign dispatch proposal before mutating campaign state", async () => {
    const app = createApp();
    const campaignResponse = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Approval inbox campaign",
        channel: "email",
        highRiskChannel: false,
      }),
    });
    const createdCampaign = await campaignResponse.json();
    const campaignId = createdCampaign.campaign.id as string;

    const proposalResponse = await app.request("/v1/action-proposals", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(
        proposalInput({
          type: "campaign_dispatch",
          riskLevel: "high",
          title: "Approve inbox campaign dispatch",
          detail: "Approve the first dispatch for the test campaign after operator review.",
          targetKind: "campaign",
          targetId: campaignId,
          targetLabel: "Approval inbox campaign",
          payloadSummary: "Approve first email dispatch for the test campaign.",
          expectedEffect: "The campaign moves to approved.",
          rollbackPlan: "Reject the proposal to keep the campaign in draft.",
        }),
      ),
    });
    const proposal = actionProposalSchema.parse(await proposalResponse.json());

    const beforeResponse = await app.request(`/v1/campaigns/${campaignId}`);
    const before = await beforeResponse.json();
    expect(before.approved).toBe(false);

    const reviewResponse = await app.request(`/v1/action-proposals/${proposal.id}/review`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        decision: "approve",
        note: "Approved from route test.",
      }),
    });
    const reviewed = actionProposalSchema.parse(await reviewResponse.json());

    expect(reviewResponse.status).toBe(200);
    expect(reviewed).toMatchObject({
      id: proposal.id,
      status: "approved",
      reviewedBy: "Test User",
    });

    const afterResponse = await app.request(`/v1/campaigns/${campaignId}`);
    const after = await afterResponse.json();
    expect(after).toMatchObject({
      approved: true,
      stage: "approved",
    });
  });
});
