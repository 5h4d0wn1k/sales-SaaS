import { describe, expect, it } from "vitest";
import {
  buildProviderSetupActionProposal,
  providerSetupRequestInputSchema,
} from "../src/provider-setup";

describe("provider setup requests", () => {
  it("normalizes form-style provider setup input", () => {
    const parsed = providerSetupRequestInputSchema.parse({
      provider: "resend-fallback",
      kind: "outreach",
      mode: "mock",
      readiness: "blocked",
      channels: ["email, lifecycle"],
      missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      productionBlockers: "No production email sender is configured.",
      rolloutGoal: "Prepare Resend for reviewed email rollout",
      businessReason: "Resolve the email provider blocker before live dispatch.",
    });

    expect(parsed).toMatchObject({
      provider: "resend-fallback",
      channels: ["email", "lifecycle"],
      missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      productionBlockers: ["No production email sender is configured."],
    });
  });

  it("builds guarded action proposals without accepting secret values", () => {
    const input = providerSetupRequestInputSchema.parse({
      provider: "stripe",
      kind: "billing",
      mode: "mock",
      readiness: "blocked",
      channels: ["checkout"],
      missingSecrets: ["STRIPE_SECRET_KEY"],
      productionBlockers: ["Stripe billing is not configured."],
      rolloutGoal: "Prepare Stripe checkout for paid workspace launch",
      businessReason: "The workspace needs subscription checkout before managed rollout.",
    });
    const proposal = buildProviderSetupActionProposal(input, "Test User");

    expect(proposal).toMatchObject({
      type: "provider_setup",
      riskLevel: "high",
      targetKind: "provider",
      targetId: "stripe",
      requiredRole: "owner",
      requestedBy: "Test User",
    });
    expect(proposal.payload).toMatchObject({
      provider: "stripe",
      secretValuesAccepted: false,
      liveProviderWork: false,
    });
    expect(proposal.guardrails.join(" ")).toContain("No raw provider secret values");
    expect(JSON.stringify(proposal)).not.toContain("sk_live");
  });
});
