import { describe, expect, it } from "vitest";
import type { ProviderSummary } from "../src";
import { buildProviderActivationReadiness } from "../src/provider-activation-readiness";

const now = "2026-06-05T12:00:00.000Z";

const baseProvider = {
  provider: "resend-fallback",
  kind: "outreach",
  mode: "mock",
  channels: ["email"],
  detail: "Fallback email provider readiness.",
  readiness: "blocked",
  requiredSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  liveAction: "Email delivery stays guarded until configured.",
  guardrails: ["Suppression checks before dispatch"],
  lastVerifiedAt: null,
  productionBlockers: ["RESEND_API_KEY is missing."],
} satisfies ProviderSummary["outreach"][number];

const blockedSummary = {
  sources: [],
  outreach: [baseProvider],
  voice: [],
  billing: [],
  webhooks: [
    {
      ...baseProvider,
      provider: "resend-webhook",
      kind: "webhook",
      channels: ["email-events"],
      requiredSecrets: ["RESEND_WEBHOOK_SECRET"],
      missingSecrets: ["RESEND_WEBHOOK_SECRET"],
      productionBlockers: ["RESEND_WEBHOOK_SECRET is missing."],
    },
  ],
  chat: [],
  summary: {
    configured: 0,
    guarded: 0,
    blocked: 2,
    disabled: 0,
    productionBlockers: [
      "RESEND_API_KEY is missing.",
      "RESEND_WEBHOOK_SECRET is missing.",
    ],
  },
} satisfies ProviderSummary;

const configuredSummary = {
  sources: [],
  outreach: [
    {
      ...baseProvider,
      mode: "configured",
      readiness: "configured",
      missingSecrets: [],
      productionBlockers: [],
      lastVerifiedAt: now,
    },
  ],
  voice: [],
  billing: [],
  webhooks: [
    {
      ...baseProvider,
      provider: "resend-webhook",
      kind: "webhook",
      mode: "configured",
      readiness: "configured",
      channels: ["email-events"],
      requiredSecrets: ["RESEND_WEBHOOK_SECRET"],
      missingSecrets: [],
      productionBlockers: [],
      lastVerifiedAt: now,
    },
  ],
  chat: [],
  summary: {
    configured: 2,
    guarded: 0,
    blocked: 0,
    disabled: 0,
    productionBlockers: [],
  },
} satisfies ProviderSummary;

describe("provider activation readiness", () => {
  it("blocks activation when required deployment secret names are missing", () => {
    const readiness = buildProviderActivationReadiness({
      providers: blockedSummary,
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      surface: "provider-activation-readiness",
      posture: "blocked",
      summary: {
        blocked: 2,
        providersBlocked: 2,
      },
    });
    expect(readiness.steps.find((step) => step.id === "deployment_secret_inventory"))
      .toMatchObject({
        status: "blocked",
        affectedProviders: ["resend-fallback", "resend-webhook"],
      });
    expect(readiness.summary.missingSecretNames).toEqual([
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "RESEND_WEBHOOK_SECRET",
    ]);
  });

  it("keeps activation guarded when provider secrets exist but vault controls are missing", () => {
    const readiness = buildProviderActivationReadiness({
      providers: configuredSummary,
      config: {
        rotationCadenceDays: 120,
      },
      generatedAt: now,
    });

    expect(readiness).toMatchObject({
      posture: "guarded",
      summary: {
        providersReady: 2,
        needsConfiguration: 4,
      },
    });
    expect(readiness.steps.find((step) => step.id === "rotation_schedule")).toMatchObject({
      status: "needs_configuration",
    });
  });

  it("marks activation ready only when provider, vault, rotation, policy, rollback, and webhook controls are present", () => {
    const readiness = buildProviderActivationReadiness({
      providers: configuredSummary,
      config: {
        credentialVaultConfigured: true,
        rotationCadenceDays: 60,
        workspaceActivationPolicyConfigured: true,
        rollbackRunbookConfigured: true,
      },
      generatedAt: now,
    });
    const serialized = JSON.stringify(readiness);

    expect(readiness).toMatchObject({
      posture: "ready",
      summary: {
        ready: 6,
        providersReady: 2,
        missingSecretNames: [],
      },
    });
    expect(readiness.providers).toEqual([
      expect.objectContaining({
        provider: "resend-fallback",
        credentialState: "configured",
        activationState: "ready",
      }),
      expect.objectContaining({
        provider: "resend-webhook",
        credentialState: "configured",
        activationState: "ready",
      }),
    ]);
    expect(serialized).not.toContain("secret-value");
  });
});
