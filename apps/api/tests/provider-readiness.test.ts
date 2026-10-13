import { afterEach, describe, expect, it, vi } from "vitest";
import {
  providerActivationReadinessResponseSchema,
  providerCostCurveResponseSchema,
  providerSummarySchema,
} from "@sales/shared";

const ENV_NAMES = [
  "SMTP_HOST",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "FRONTEND_URL",
  "CONTACT_INTAKE_TO_EMAIL",
  "RESEND_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "TWILIO_TWIML_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "SOURCE_PROVIDER_API_KEY",
  "WEBSITE_SOURCE_PROVIDER_API_KEY",
  "SEARCH_SOURCE_PROVIDER_API_KEY",
  "DIRECTORY_SOURCE_PROVIDER_API_KEY",
  "PROVIDER_CREDENTIAL_VAULT_CONFIGURED",
  "PROVIDER_CREDENTIAL_VAULT_URL",
  "PROVIDER_ROTATION_CADENCE_DAYS",
  "PROVIDER_WORKSPACE_ACTIVATION_CONFIGURED",
  "PROVIDER_WORKSPACE_ACTIVATION_POLICY_URL",
  "PROVIDER_ROLLBACK_RUNBOOK_CONFIGURED",
  "PROVIDER_ROLLBACK_RUNBOOK_URL",
] as const;

const previousEnv = Object.fromEntries(
  ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof ENV_NAMES)[number], string | undefined>;

function clearProviderEnv() {
  for (const name of ENV_NAMES) {
    delete process.env[name];
  }
}

afterEach(() => {
  for (const name of ENV_NAMES) {
    const value = previousEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  vi.resetModules();
});

async function loadProviderSummary() {
  vi.resetModules();
  const { getProviderSummary } = await import("../src/providers");
  return providerSummarySchema.parse(getProviderSummary());
}

async function requestProviderActivationReadiness() {
  vi.resetModules();
  const { createApp } = await import("../src/app");
  const response = await createApp().request("/v1/providers/activation-readiness");

  return {
    response,
    body: providerActivationReadinessResponseSchema.parse(await response.json()),
  };
}

async function requestProviderCostCurves() {
  vi.resetModules();
  const { createApp } = await import("../src/app");
  const response = await createApp().request("/v1/providers/cost-curves");

  return {
    response,
    body: providerCostCurveResponseSchema.parse(await response.json()),
  };
}

describe("provider integration readiness", () => {
  it("reports deployment-side missing secrets and production blockers without leaking values", async () => {
    clearProviderEnv();

    const summary = await loadProviderSummary();
    const twilio = summary.voice.find((provider) => provider.provider === "twilio-voice");
    const telegram = summary.chat.find((provider) => provider.provider === "telegram-command-center");
    const accountLifecycleEmail = summary.webhooks.find(
      (provider) => provider.provider === "account-lifecycle-email",
    );
    const intakeNotification = summary.webhooks.find(
      (provider) => provider.provider === "contact-intake-notification",
    );
    const serialized = JSON.stringify(summary);

    expect(twilio).toMatchObject({
      readiness: "blocked",
      missingSecrets: [
        "TWILIO_ACCOUNT_SID",
        "TWILIO_AUTH_TOKEN",
        "TWILIO_FROM_NUMBER",
        "TWILIO_TWIML_URL",
      ],
    });
    expect(telegram).toMatchObject({
      readiness: "blocked",
      missingSecrets: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
    });
    expect(accountLifecycleEmail).toMatchObject({
      readiness: "blocked",
      missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "FRONTEND_URL"],
      channels: ["email-verification", "password-reset", "workspace-invites"],
    });
    expect(summary.sources.find((provider) => provider.provider === "website-crawler"))
      .toMatchObject({
        readiness: "guarded",
        missingSecrets: ["WEBSITE_SOURCE_PROVIDER_API_KEY"],
      });
    expect(intakeNotification).toMatchObject({
      readiness: "blocked",
      missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "CONTACT_INTAKE_TO_EMAIL"],
    });
    expect(summary.billing.length).toBeGreaterThan(0);
    expect(summary.webhooks.length).toBeGreaterThan(0);
    expect(summary.summary.productionBlockers.length).toBeGreaterThan(0);
    expect(serialized).not.toContain("secret-value");
  });

  it("moves configured providers into configured readiness when deployment secrets are present", async () => {
    clearProviderEnv();
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.FRONTEND_URL = "https://app.winrate.ai";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    process.env.RESEND_WEBHOOK_SECRET = "secret-value";
    process.env.TWILIO_ACCOUNT_SID = "secret-value";
    process.env.TWILIO_AUTH_TOKEN = "secret-value";
    process.env.TWILIO_FROM_NUMBER = "+15550101010";
    process.env.TWILIO_TWIML_URL = "https://example.com/twiml.xml";
    process.env.STRIPE_SECRET_KEY = "secret-value";
    process.env.STRIPE_WEBHOOK_SECRET = "secret-value";
    process.env.TELEGRAM_BOT_TOKEN = "secret-value";
    process.env.TELEGRAM_WEBHOOK_SECRET = "secret-value";
    process.env.SOURCE_PROVIDER_API_KEY = "secret-value";

    const summary = await loadProviderSummary();

    expect(summary.sources.every((provider) => provider.readiness === "configured")).toBe(true);
    expect(summary.sources.every((provider) => provider.missingSecrets.length === 0)).toBe(true);
    expect(summary.outreach.find((provider) => provider.provider === "resend-fallback")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(summary.voice.find((provider) => provider.provider === "twilio-voice")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(summary.billing.find((provider) => provider.provider === "stripe")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(summary.chat.find((provider) => provider.provider === "telegram-command-center")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(summary.webhooks.find((provider) => provider.provider === "account-lifecycle-email")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(summary.webhooks.find((provider) => provider.provider === "contact-intake-notification")).toMatchObject({
      readiness: "configured",
      missingSecrets: [],
    });
    expect(JSON.stringify(summary)).not.toContain("secret-value");
  });

  it("returns provider activation readiness with missing controls and no secret values", async () => {
    clearProviderEnv();

    const { response, body } = await requestProviderActivationReadiness();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "provider-activation-readiness",
      posture: "blocked",
    });
    expect(body.steps.find((step) => step.id === "deployment_secret_inventory"))
      .toMatchObject({
        status: "blocked",
      });
    expect(body.summary.missingSecretNames).toContain("TWILIO_AUTH_TOKEN");
    expect(body.unavailableClaims).toContain("Browser-based provider credential entry");
    expect(JSON.stringify(body)).not.toContain("secret-value");
  });

  it("marks provider activation ready when provider secrets and activation controls are configured", async () => {
    clearProviderEnv();
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.FRONTEND_URL = "https://app.winrate.ai";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    process.env.RESEND_WEBHOOK_SECRET = "secret-value";
    process.env.TWILIO_ACCOUNT_SID = "secret-value";
    process.env.TWILIO_AUTH_TOKEN = "secret-value";
    process.env.TWILIO_FROM_NUMBER = "+15550101010";
    process.env.TWILIO_TWIML_URL = "https://example.com/twiml.xml";
    process.env.STRIPE_SECRET_KEY = "secret-value";
    process.env.STRIPE_WEBHOOK_SECRET = "secret-value";
    process.env.RAZORPAY_KEY_ID = "secret-value";
    process.env.RAZORPAY_KEY_SECRET = "secret-value";
    process.env.RAZORPAY_WEBHOOK_SECRET = "secret-value";
    process.env.TELEGRAM_BOT_TOKEN = "secret-value";
    process.env.TELEGRAM_WEBHOOK_SECRET = "secret-value";
    process.env.SOURCE_PROVIDER_API_KEY = "secret-value";
    process.env.PROVIDER_CREDENTIAL_VAULT_CONFIGURED = "true";
    process.env.PROVIDER_ROTATION_CADENCE_DAYS = "60";
    process.env.PROVIDER_WORKSPACE_ACTIVATION_CONFIGURED = "true";
    process.env.PROVIDER_ROLLBACK_RUNBOOK_CONFIGURED = "true";

    const { body } = await requestProviderActivationReadiness();
    const serialized = JSON.stringify(body);

    expect(body).toMatchObject({
      posture: "ready",
      summary: {
        ready: 6,
        missingSecretNames: [],
      },
    });
    expect(body.steps.every((step) => step.status === "ready")).toBe(true);
    expect(body.providers.find((provider) => provider.provider === "twilio-voice"))
      .toMatchObject({
        credentialState: "configured",
        activationState: "ready",
      });
    expect(serialized).not.toContain("secret-value");
  });

  it("returns provider cost curves with workspace budget posture and no secret values", async () => {
    clearProviderEnv();
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.TWILIO_ACCOUNT_SID = "secret-value";
    process.env.TWILIO_AUTH_TOKEN = "secret-value";
    process.env.TWILIO_FROM_NUMBER = "+15550101010";
    process.env.TWILIO_TWIML_URL = "https://example.com/twiml.xml";
    process.env.SOURCE_PROVIDER_API_KEY = "secret-value";

    const { response, body } = await requestProviderCostCurves();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      surface: "provider-cost-curves",
      summary: {
        providerCostBudgetCents: 5000,
      },
    });
    expect(body.curves.find((curve) => curve.provider === "resend-fallback"))
      .toMatchObject({
        status: "metered",
        estimatedUnitCostCents: 1,
      });
    expect(body.curves.find((curve) => curve.provider === "twilio-voice"))
      .toMatchObject({
        status: "metered",
        estimatedUnitCostCents: 25,
      });
    expect(body.curves.find((curve) => curve.provider === "website-crawler"))
      .toMatchObject({
        status: "metered",
        estimatedUnitCostCents: 50,
      });
    expect(body.aiWorkerCostCurves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workerType: "sales-researcher",
          status: "metered",
          estimatedUnitCostCents: 1200,
        }),
      ]),
    );
    expect(body.channelQuotas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "email", status: "enforced" }),
        expect.objectContaining({ channel: "sms", status: "roadmap" }),
      ]),
    );
    expect(serialized).not.toContain("secret-value");
  });
});
