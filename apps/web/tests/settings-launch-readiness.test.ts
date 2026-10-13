import { describe, expect, it } from "vitest";
import type { ProviderHealth, ProviderSummary, TelegramIntegrationResponse } from "@sales/shared";
import {
  buildIncidentResponseReadinessPlan,
  buildProviderDeploymentSetupPlan,
  buildSettingsLaunchReadiness,
} from "../lib/settings-launch-readiness";

function provider(overrides: Partial<ProviderHealth> = {}): ProviderHealth {
  return {
    provider: "resend-fallback",
    kind: "outreach",
    mode: "configured",
    channels: ["email"],
    detail: "Outbound delivery adapter is available.",
    readiness: "configured",
    requiredSecrets: ["RESEND_API_KEY"],
    missingSecrets: [],
    liveAction: "Can dispatch after policy gates.",
    guardrails: ["Suppression check required."],
    lastVerifiedAt: null,
    productionBlockers: [],
    ...overrides,
  };
}

function providerSummary(overrides: Partial<ProviderSummary> = {}): ProviderSummary {
  const sources = [
    provider({
      provider: "website-crawler",
      kind: "lead-source",
      mode: "mock",
      readiness: "guarded",
      requiredSecrets: [],
      liveAction: "Runs evidence-only source planning.",
    }),
  ];
  const outreach = [provider()];
  const voice = [
    provider({
      provider: "twilio-voice",
      kind: "voice",
      channels: ["call"],
      requiredSecrets: ["TWILIO_ACCOUNT_SID"],
      liveAction: "Can call only after approval gates.",
    }),
  ];
  const billing = [
    provider({
      provider: "stripe-billing",
      kind: "billing",
      channels: ["checkout"],
      requiredSecrets: ["STRIPE_SECRET_KEY"],
      liveAction: "Can create checkout sessions.",
    }),
  ];
  const webhooks = [
    provider({
      provider: "stripe-webhook",
      kind: "webhook",
      channels: ["billing"],
      requiredSecrets: ["STRIPE_WEBHOOK_SECRET"],
      liveAction: "Verifies billing callbacks.",
    }),
  ];
  const chat = [
    provider({
      provider: "telegram-command-center",
      kind: "chat",
      channels: ["telegram"],
      requiredSecrets: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
      liveAction: "Can process verified chat commands.",
    }),
  ];

  return {
    sources,
    outreach,
    voice,
    billing,
    webhooks,
    chat,
    summary: {
      configured: 5,
      guarded: 1,
      blocked: 0,
      disabled: 0,
      productionBlockers: [],
    },
    ...overrides,
  };
}

function telegram(overrides: Partial<TelegramIntegrationResponse> = {}): TelegramIntegrationResponse {
  return {
    integration: {
      id: "telegram-1",
      status: "active",
      botUsername: "@winrate_ops_bot",
      chatIdMask: "-1***7890",
      allowedCommands: ["status", "brief", "sequence", "forecast", "pause"],
      lastUpdateId: 123,
      lastVerifiedAt: "2026-06-04T00:00:00.000Z",
      createdAt: "2026-06-04T00:00:00.000Z",
      updatedAt: "2026-06-04T00:00:00.000Z",
    },
    deployment: {
      botTokenConfigured: true,
      webhookSecretConfigured: true,
    },
    liveCommands: ["status", "brief", "sequence", "forecast"],
    plannedCommands: ["pause"],
    recentCommands: [],
    detail: "Telegram command-center integration is active.",
    ...overrides,
  };
}

describe("settings launch readiness", () => {
  it("blocks launch when provider and Telegram deployment blockers exist", () => {
    const readiness = buildSettingsLaunchReadiness({
      providers: providerSummary({
        outreach: [
          provider({
            readiness: "blocked",
            missingSecrets: ["RESEND_API_KEY"],
            productionBlockers: ["resend-fallback missing RESEND_API_KEY"],
          }),
        ],
        summary: {
          configured: 4,
          guarded: 1,
          blocked: 1,
          disabled: 0,
          productionBlockers: ["resend-fallback missing RESEND_API_KEY"],
        },
      }),
      telegram: telegram({
        deployment: {
          botTokenConfigured: false,
          webhookSecretConfigured: false,
        },
      }),
    });

    expect(readiness).toMatchObject({
      posture: "blocked",
      tone: "blocked",
      title: "Launch is blocked",
    });
    expect(readiness.blockers).toEqual(
      expect.arrayContaining([
        "resend-fallback missing RESEND_API_KEY",
        "TELEGRAM_BOT_TOKEN is missing.",
        "TELEGRAM_WEBHOOK_SECRET is missing.",
      ]),
    );
    expect(readiness.lanes.find((lane) => lane.id === "telegram_control")).toMatchObject({
      tone: "blocked",
    });
    expect(readiness.nextSteps.join(" ")).toContain("Configure missing deployment secrets");
  });

  it("reports guarded launch when providers are usable but Telegram is pending verification", () => {
    const readiness = buildSettingsLaunchReadiness({
      providers: providerSummary(),
      telegram: telegram({
        integration: {
          ...telegram().integration,
          status: "pending_verification",
          lastVerifiedAt: null,
        },
      }),
    });

    expect(readiness).toMatchObject({
      posture: "guarded",
      tone: "warn",
      title: "Launch is guarded",
    });
    expect(readiness.blockers).toEqual([]);
    expect(readiness.lanes.find((lane) => lane.id === "telegram_control")).toMatchObject({
      value: "pending verification",
      tone: "warn",
    });
    expect(readiness.nextSteps).toContain(
      "Send one verified command from the bound Telegram chat to activate the integration.",
    );
  });

  it("reports ready launch controls when providers and Telegram are configured", () => {
    const readiness = buildSettingsLaunchReadiness({
      providers: providerSummary({
        sources: [
          provider({
            provider: "website-crawler",
            kind: "lead-source",
            channels: ["website"],
            requiredSecrets: [],
          }),
        ],
        summary: {
          configured: 6,
          guarded: 0,
          blocked: 0,
          disabled: 0,
          productionBlockers: [],
        },
      }),
      telegram: telegram(),
    });

    expect(readiness).toMatchObject({
      posture: "ready",
      tone: "good",
      title: "Launch controls are ready",
      blockers: [],
    });
    expect(readiness.lanes.find((lane) => lane.id === "launch_blockers")).toMatchObject({
      value: "0",
      tone: "good",
    });
    expect(readiness.lanes.find((lane) => lane.id === "entitlement_safety")).toMatchObject({
      value: "Server gated",
      tone: "good",
    });
    expect(readiness.guardrails).toContain(
      "Entitlement, channel-access, and provider-cost checks run server-side before billable or provider-backed work.",
    );
    expect(readiness.guardrails).toContain("No provider secrets are entered in browser forms.");
  });

  it("builds a deployment setup plan from provider and Telegram blockers", () => {
    const plan = buildProviderDeploymentSetupPlan({
      providers: providerSummary({
        outreach: [
          provider({
            readiness: "blocked",
            missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
            productionBlockers: ["resend-fallback missing RESEND_API_KEY, RESEND_FROM_EMAIL"],
          }),
        ],
        webhooks: [
          provider({
            provider: "stripe-webhook",
            kind: "webhook",
            channels: ["billing"],
            requiredSecrets: ["STRIPE_WEBHOOK_SECRET"],
            missingSecrets: ["STRIPE_WEBHOOK_SECRET"],
            productionBlockers: ["stripe-webhook missing STRIPE_WEBHOOK_SECRET"],
          }),
        ],
        summary: {
          configured: 3,
          guarded: 1,
          blocked: 2,
          disabled: 0,
          productionBlockers: [
            "resend-fallback missing RESEND_API_KEY, RESEND_FROM_EMAIL",
            "stripe-webhook missing STRIPE_WEBHOOK_SECRET",
          ],
        },
      }),
      telegram: telegram({
        deployment: {
          botTokenConfigured: false,
          webhookSecretConfigured: false,
        },
      }),
    });

    expect(plan.summary).toContain("missing secrets");
    expect(plan.steps.find((step) => step.id === "deployment_secrets")).toMatchObject({
      status: "needs_secret",
      tone: "blocked",
      owner: "Deployment owner",
      secretNames: expect.arrayContaining([
        "RESEND_API_KEY",
        "RESEND_FROM_EMAIL",
        "STRIPE_WEBHOOK_SECRET",
      ]),
      providerNames: expect.arrayContaining(["resend-fallback", "stripe-webhook"]),
    });
    expect(plan.steps.find((step) => step.id === "webhook_verification")).toMatchObject({
      status: "needs_verification",
      tone: "warn",
      providerNames: ["stripe-webhook"],
    });
    expect(plan.steps.find((step) => step.id === "telegram_activation")).toMatchObject({
      status: "needs_secret",
      secretNames: expect.arrayContaining([
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_WEBHOOK_SECRET",
      ]),
    });
    expect(plan.guardrails).toContain("Do not paste raw provider secrets into browser forms.");
  });

  it("keeps guarded providers separate from ready deployment setup", () => {
    const plan = buildProviderDeploymentSetupPlan({
      providers: providerSummary(),
      telegram: telegram({
        integration: {
          ...telegram().integration,
          status: "pending_verification",
          lastVerifiedAt: null,
        },
      }),
    });

    expect(plan.steps.find((step) => step.id === "deployment_secrets")).toMatchObject({
      status: "ready",
      tone: "good",
    });
    expect(plan.steps.find((step) => step.id === "telegram_activation")).toMatchObject({
      status: "needs_verification",
      tone: "warn",
    });
    expect(plan.steps.find((step) => step.id === "live_channel_review")).toMatchObject({
      status: "guarded",
      tone: "warn",
      providerNames: ["website-crawler"],
    });
  });

  it("blocks incident response readiness when launch blockers still exist", () => {
    const plan = buildIncidentResponseReadinessPlan({
      providers: providerSummary({
        outreach: [
          provider({
            readiness: "blocked",
            missingSecrets: ["RESEND_API_KEY"],
            productionBlockers: ["resend-fallback missing RESEND_API_KEY"],
          }),
        ],
        summary: {
          configured: 4,
          guarded: 1,
          blocked: 1,
          disabled: 0,
          productionBlockers: ["resend-fallback missing RESEND_API_KEY"],
        },
      }),
      telegram: telegram({
        deployment: {
          botTokenConfigured: false,
          webhookSecretConfigured: false,
        },
      }),
    });

    expect(plan).toMatchObject({
      posture: "blocked",
      tone: "blocked",
      title: "Incident response is blocked",
    });
    expect(plan.launchBlockers).toEqual(
      expect.arrayContaining([
        "resend-fallback missing RESEND_API_KEY",
        "TELEGRAM_BOT_TOKEN is missing.",
        "TELEGRAM_WEBHOOK_SECRET is missing.",
      ]),
    );
    expect(plan.steps.find((step) => step.id === "readiness_monitor")).toMatchObject({
      status: "blocked",
      tone: "blocked",
      requiredConfig: expect.arrayContaining([
        "PRODUCTION_WEB_APP_URL",
        "PRODUCTION_API_HEALTHCHECK_URL",
      ]),
    });
  });

  it("keeps incident response guarded until alert routing and escalation ownership are configured", () => {
    const plan = buildIncidentResponseReadinessPlan({
      providers: providerSummary({
        sources: [
          provider({
            provider: "website-crawler",
            kind: "lead-source",
            channels: ["website"],
            requiredSecrets: [],
          }),
        ],
        summary: {
          configured: 6,
          guarded: 0,
          blocked: 0,
          disabled: 0,
          productionBlockers: [],
        },
      }),
      telegram: telegram(),
    });

    expect(plan).toMatchObject({
      posture: "guarded",
      tone: "warn",
      title: "Incident response is owner-operated",
      launchBlockers: [],
    });
    expect(plan.steps.find((step) => step.id === "triage_evidence")).toMatchObject({
      status: "ready",
      tone: "good",
    });
    expect(plan.steps.find((step) => step.id === "alert_routing")).toMatchObject({
      status: "needs_configuration",
      tone: "warn",
      requiredConfig: expect.arrayContaining([
        "PRODUCTION_READINESS_ALERT_WEBHOOK_URL",
      ]),
    });
    expect(plan.steps.find((step) => step.id === "escalation_runbook")).toMatchObject({
      status: "needs_owner",
      tone: "warn",
    });
    expect(plan.guardrails[0]).toContain("does not replace external observability");
  });
});
