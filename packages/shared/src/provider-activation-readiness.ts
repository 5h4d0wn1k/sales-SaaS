import { z } from "zod";
import {
  providerHealthSchema,
  providerSummarySchema,
  type ProviderHealth,
  type ProviderSummary,
} from "./domain";

export const providerActivationReadinessStatusSchema = z.enum([
  "ready",
  "needs_configuration",
  "missing",
  "blocked",
]);

export const providerActivationReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const providerActivationReadinessStepSchema = z.object({
  id: z.enum([
    "deployment_secret_inventory",
    "credential_vault",
    "rotation_schedule",
    "workspace_activation_policy",
    "rollback_controls",
    "webhook_verification",
  ]),
  title: z.string(),
  status: providerActivationReadinessStatusSchema,
  tone: providerActivationReadinessToneSchema,
  detail: z.string(),
  requiredConfig: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  affectedProviders: z.array(z.string()).default([]),
});

export const providerActivationReadinessProviderSchema = z.object({
  provider: z.string(),
  kind: providerHealthSchema.shape.kind,
  mode: providerHealthSchema.shape.mode,
  readiness: providerHealthSchema.shape.readiness,
  credentialState: z.enum(["not_required", "configured", "missing"]),
  missingSecretCount: z.number().int().min(0),
  activationState: z.enum(["ready", "guarded", "blocked", "disabled"]),
  detail: z.string(),
});

export const providerActivationReadinessResponseSchema = z.object({
  surface: z.literal("provider-activation-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  posture: z.enum(["ready", "guarded", "blocked"]),
  summary: z.object({
    ready: z.number().int().min(0),
    needsConfiguration: z.number().int().min(0),
    missing: z.number().int().min(0),
    blocked: z.number().int().min(0),
    providersReady: z.number().int().min(0),
    providersGuarded: z.number().int().min(0),
    providersBlocked: z.number().int().min(0),
    providersDisabled: z.number().int().min(0),
    missingSecretNames: z.array(z.string()),
  }),
  steps: z.array(providerActivationReadinessStepSchema),
  providers: z.array(providerActivationReadinessProviderSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type ProviderActivationReadinessStatus = z.infer<
  typeof providerActivationReadinessStatusSchema
>;
export type ProviderActivationReadinessTone = z.infer<
  typeof providerActivationReadinessToneSchema
>;
export type ProviderActivationReadinessStep = z.infer<
  typeof providerActivationReadinessStepSchema
>;
export type ProviderActivationReadinessResponse = z.infer<
  typeof providerActivationReadinessResponseSchema
>;

export type ProviderActivationReadinessConfig = {
  credentialVaultConfigured?: boolean;
  rotationCadenceDays?: number | null;
  workspaceActivationPolicyConfigured?: boolean;
  rollbackRunbookConfigured?: boolean;
};

function allProviders(summary: ProviderSummary) {
  return [
    ...summary.sources,
    ...summary.outreach,
    ...summary.voice,
    ...summary.billing,
    ...summary.webhooks,
    ...summary.chat,
  ];
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function statusTone(
  status: ProviderActivationReadinessStatus,
): ProviderActivationReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "blocked" || status === "missing") {
    return "blocked";
  }

  return "warn";
}

function rotationStatus(days?: number | null): ProviderActivationReadinessStatus {
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
    return "missing";
  }

  return days <= 90 ? "ready" : "needs_configuration";
}

function providerActivationState(provider: ProviderHealth) {
  if (provider.readiness === "disabled") {
    return "disabled" as const;
  }

  if (provider.readiness === "blocked" || provider.missingSecrets.length > 0) {
    return "blocked" as const;
  }

  if (provider.readiness === "configured") {
    return "ready" as const;
  }

  return "guarded" as const;
}

export function buildProviderActivationReadiness(input: {
  providers: ProviderSummary;
  config?: ProviderActivationReadinessConfig;
  generatedAt?: string;
}): ProviderActivationReadinessResponse {
  const providerSummary = providerSummarySchema.parse(input.providers);
  const config = input.config ?? {};
  const providers = allProviders(providerSummary);
  const missingSecretNames = unique(
    providers.flatMap((provider) => provider.missingSecrets),
  ).sort();
  const providersWithMissingSecrets = providers.filter(
    (provider) => provider.missingSecrets.length > 0,
  );
  const configuredProviders = providers.filter(
    (provider) => provider.readiness === "configured",
  );
  const blockedProviders = providers.filter(
    (provider) => provider.readiness === "blocked",
  );
  const webhookProviders = providerSummary.webhooks;
  const blockedWebhooks = webhookProviders.filter(
    (provider) => provider.readiness === "blocked" || provider.missingSecrets.length > 0,
  );
  const guardedWebhooks = webhookProviders.filter(
    (provider) => provider.readiness === "guarded",
  );
  const secretInventoryStatus: ProviderActivationReadinessStatus =
    missingSecretNames.length > 0 ? "blocked" : "ready";
  const vaultStatus: ProviderActivationReadinessStatus = config.credentialVaultConfigured
    ? "ready"
    : "needs_configuration";
  const rotation = rotationStatus(config.rotationCadenceDays);
  const workspacePolicyStatus: ProviderActivationReadinessStatus =
    config.workspaceActivationPolicyConfigured ? "ready" : "needs_configuration";
  const rollbackStatus: ProviderActivationReadinessStatus = config.rollbackRunbookConfigured
    ? "ready"
    : "needs_configuration";
  const webhookStatus: ProviderActivationReadinessStatus =
    webhookProviders.length === 0
      ? "missing"
      : blockedWebhooks.length > 0
        ? "blocked"
        : guardedWebhooks.length > 0
          ? "needs_configuration"
          : "ready";

  const steps: ProviderActivationReadinessStep[] = [
    {
      id: "deployment_secret_inventory",
      title: "Deployment secret inventory",
      status: secretInventoryStatus,
      tone: statusTone(secretInventoryStatus),
      detail:
        secretInventoryStatus === "ready"
          ? "All required provider secret names have a deployment-side value present."
          : `${missingSecretNames.length} required provider secret name${missingSecretNames.length === 1 ? "" : "s"} need deployment-side configuration before activation.`,
      requiredConfig: missingSecretNames.length > 0
        ? missingSecretNames
        : ["Provider required secret names from /v1/providers"],
      evidence: [
        `${configuredProviders.length} configured provider${configuredProviders.length === 1 ? "" : "s"}`,
        `${providersWithMissingSecrets.length} provider${providersWithMissingSecrets.length === 1 ? "" : "s"} with missing secret names`,
      ],
      affectedProviders: providersWithMissingSecrets.map((provider) => provider.provider),
    },
    {
      id: "credential_vault",
      title: "Credential vault policy",
      status: vaultStatus,
      tone: statusTone(vaultStatus),
      detail:
        vaultStatus === "ready"
          ? "A deployment-owned credential vault or secret manager is marked configured."
          : "Configure a deployment-owned credential vault or secret manager before claiming safe provider activation.",
      requiredConfig: ["PROVIDER_CREDENTIAL_VAULT_CONFIGURED"],
      evidence: [
        vaultStatus === "ready"
          ? "credential vault configured"
          : "credential vault not configured",
      ],
      affectedProviders: providers
        .filter((provider) => provider.requiredSecrets.length > 0)
        .map((provider) => provider.provider),
    },
    {
      id: "rotation_schedule",
      title: "Rotation schedule",
      status: rotation,
      tone: statusTone(rotation),
      detail:
        rotation === "ready"
          ? `Provider credential rotation cadence is declared at ${config.rotationCadenceDays} days.`
          : rotation === "needs_configuration"
            ? `Provider credential rotation cadence is ${config.rotationCadenceDays} days; tighten to 90 days or less before production activation.`
            : "Declare a provider credential rotation cadence before production activation.",
      requiredConfig: ["PROVIDER_ROTATION_CADENCE_DAYS"],
      evidence:
        typeof config.rotationCadenceDays === "number" && Number.isFinite(config.rotationCadenceDays)
          ? [`configured days ${config.rotationCadenceDays}`]
          : ["rotation cadence not configured"],
      affectedProviders: providers
        .filter((provider) => provider.requiredSecrets.length > 0)
        .map((provider) => provider.provider),
    },
    {
      id: "workspace_activation_policy",
      title: "Workspace activation policy",
      status: workspacePolicyStatus,
      tone: statusTone(workspacePolicyStatus),
      detail:
        workspacePolicyStatus === "ready"
          ? "Per-workspace provider activation policy is marked configured."
          : "Define how each workspace is allowed to activate providers before secrets can power live work.",
      requiredConfig: ["PROVIDER_WORKSPACE_ACTIVATION_CONFIGURED"],
      evidence: [
        workspacePolicyStatus === "ready"
          ? "workspace activation policy configured"
          : "workspace activation policy not configured",
      ],
      affectedProviders: providers.map((provider) => provider.provider),
    },
    {
      id: "rollback_controls",
      title: "Rollback and disable controls",
      status: rollbackStatus,
      tone: statusTone(rollbackStatus),
      detail:
        rollbackStatus === "ready"
          ? "A provider rollback or emergency-disable runbook is marked configured."
          : "Document provider rollback, emergency-disable, and customer communication steps before activation.",
      requiredConfig: ["PROVIDER_ROLLBACK_RUNBOOK_CONFIGURED"],
      evidence: [
        rollbackStatus === "ready"
          ? "rollback runbook configured"
          : "rollback runbook not configured",
      ],
      affectedProviders: providers.map((provider) => provider.provider),
    },
    {
      id: "webhook_verification",
      title: "Webhook verification",
      status: webhookStatus,
      tone: statusTone(webhookStatus),
      detail:
        webhookStatus === "ready"
          ? "Provider webhook verification checks are configured for callback-driven state changes."
          : webhookStatus === "blocked"
            ? `${blockedWebhooks.length} webhook provider${blockedWebhooks.length === 1 ? "" : "s"} have missing verification secrets.`
            : webhookStatus === "missing"
              ? "No webhook readiness providers are visible for callback-driven state changes."
              : "Webhook providers exist but still need production configuration before activation.",
      requiredConfig: unique(
        webhookProviders.flatMap((provider) => provider.requiredSecrets),
      ),
      evidence: [
        `${webhookProviders.length} webhook provider${webhookProviders.length === 1 ? "" : "s"} tracked`,
        `${blockedWebhooks.length} blocked webhook provider${blockedWebhooks.length === 1 ? "" : "s"}`,
      ],
      affectedProviders: [
        ...blockedWebhooks.map((provider) => provider.provider),
        ...guardedWebhooks.map((provider) => provider.provider),
      ],
    },
  ];

  const providerRows = providers.map((provider) => {
    const missingSecretCount = provider.missingSecrets.length;
    const activationState = providerActivationState(provider);

    return {
      provider: provider.provider,
      kind: provider.kind,
      mode: provider.mode,
      readiness: provider.readiness,
      credentialState:
        provider.requiredSecrets.length === 0
          ? "not_required" as const
          : missingSecretCount > 0
            ? "missing" as const
            : "configured" as const,
      missingSecretCount,
      activationState,
      detail:
        activationState === "ready"
          ? `${provider.provider} is configured for guarded live use.`
          : activationState === "blocked"
            ? `${provider.provider} cannot activate until deployment-side secret names and blockers are resolved.`
            : activationState === "disabled"
              ? `${provider.provider} is disabled for this deployment.`
              : `${provider.provider} remains guarded and should stay behind review before live work.`,
    };
  });

  const ready = steps.filter((step) => step.status === "ready").length;
  const needsConfiguration = steps.filter((step) => step.status === "needs_configuration").length;
  const missing = steps.filter((step) => step.status === "missing").length;
  const blocked = steps.filter((step) => step.status === "blocked").length;
  const providersReady = providerRows.filter((provider) => provider.activationState === "ready")
    .length;
  const providersGuarded = providerRows.filter((provider) => provider.activationState === "guarded")
    .length;
  const providersBlocked = providerRows.filter((provider) => provider.activationState === "blocked")
    .length;
  const providersDisabled = providerRows.filter((provider) => provider.activationState === "disabled")
    .length;
  const posture =
    blocked > 0 || missing > 0 || blockedProviders.length > 0
      ? "blocked"
      : needsConfiguration > 0
        ? "guarded"
        : "ready";

  return providerActivationReadinessResponseSchema.parse({
    surface: "provider-activation-readiness",
    version: "2026-06-05.provider-activation-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    posture,
    summary: {
      ready,
      needsConfiguration,
      missing,
      blocked,
      providersReady,
      providersGuarded,
      providersBlocked,
      providersDisabled,
      missingSecretNames,
    },
    steps,
    providers: providerRows,
    guardrails: [
      "Provider activation readiness is read-only; it never accepts, stores, rotates, or displays raw provider secret values.",
      "Deployment secrets, vault policy, rotation cadence, workspace activation policy, rollback controls, and webhook verification must all be ready before live provider activation is claimed.",
      "Approving a provider setup request does not configure credentials, mutate billing, run outreach, place calls, or change webhook state by itself.",
    ],
    unavailableClaims: [
      "Browser-based provider credential entry",
      "Automated credential vault writes",
      "Automated provider credential rotation",
      "Per-workspace live provider activation",
    ],
  });
}
