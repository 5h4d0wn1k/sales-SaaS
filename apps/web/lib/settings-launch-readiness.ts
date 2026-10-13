import type { ProviderHealth, ProviderSummary, TelegramIntegrationResponse } from "@sales/shared";

export type SettingsLaunchReadinessTone = "good" | "warn" | "blocked" | "neutral";
export type SettingsLaunchReadinessPosture = "ready" | "guarded" | "blocked";

export type SettingsLaunchReadinessLane = {
  id:
    | "provider_runtime"
    | "webhook_safety"
    | "telegram_control"
    | "entitlement_safety"
    | "launch_blockers";
  label: string;
  value: string;
  detail: string;
  tone: SettingsLaunchReadinessTone;
};

export type SettingsLaunchReadiness = {
  posture: SettingsLaunchReadinessPosture;
  tone: SettingsLaunchReadinessTone;
  title: string;
  summary: string;
  blockers: string[];
  nextSteps: string[];
  lanes: SettingsLaunchReadinessLane[];
  guardrails: string[];
};

export type ProviderDeploymentSetupStatus =
  | "ready"
  | "needs_secret"
  | "needs_verification"
  | "guarded"
  | "blocked";

export type ProviderDeploymentSetupStep = {
  id:
    | "deployment_secrets"
    | "webhook_verification"
    | "telegram_activation"
    | "live_channel_review";
  title: string;
  owner: string;
  status: ProviderDeploymentSetupStatus;
  tone: SettingsLaunchReadinessTone;
  detail: string;
  secretNames: string[];
  providerNames: string[];
  evidence: string[];
};

export type ProviderDeploymentSetupPlan = {
  title: string;
  summary: string;
  steps: ProviderDeploymentSetupStep[];
  guardrails: string[];
};

export type IncidentResponseReadinessStatus =
  | "ready"
  | "needs_configuration"
  | "needs_owner"
  | "guarded"
  | "blocked";

export type IncidentResponseReadinessStep = {
  id:
    | "readiness_monitor"
    | "alert_routing"
    | "triage_evidence"
    | "escalation_runbook";
  title: string;
  owner: string;
  status: IncidentResponseReadinessStatus;
  tone: SettingsLaunchReadinessTone;
  detail: string;
  requiredConfig: string[];
  evidence: string[];
};

export type IncidentResponseReadinessPlan = {
  posture: SettingsLaunchReadinessPosture;
  tone: SettingsLaunchReadinessTone;
  title: string;
  summary: string;
  steps: IncidentResponseReadinessStep[];
  launchBlockers: string[];
  guardrails: string[];
};

function allProviders(summary: ProviderSummary): ProviderHealth[] {
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
  return Array.from(new Set(values.filter(Boolean)));
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function setupTone(status: ProviderDeploymentSetupStatus): SettingsLaunchReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "blocked" || status === "needs_secret") {
    return "blocked";
  }

  return "warn";
}

function incidentTone(status: IncidentResponseReadinessStatus): SettingsLaunchReadinessTone {
  if (status === "ready") {
    return "good";
  }

  if (status === "blocked") {
    return "blocked";
  }

  return "warn";
}

function telegramSecretBlockers(telegram: TelegramIntegrationResponse | null) {
  if (!telegram) {
    return ["Telegram readiness is unavailable."];
  }

  return [
    ...(telegram.deployment.botTokenConfigured ? [] : ["TELEGRAM_BOT_TOKEN is missing."]),
    ...(telegram.deployment.webhookSecretConfigured
      ? []
      : ["TELEGRAM_WEBHOOK_SECRET is missing."]),
  ];
}

function telegramControlDetail(telegram: TelegramIntegrationResponse | null) {
  if (!telegram) {
    return "Telegram command-center evidence did not load.";
  }

  if (!telegram.deployment.botTokenConfigured || !telegram.deployment.webhookSecretConfigured) {
    return "Telegram control cannot launch until deployment-side bot and webhook secrets are configured.";
  }

  if (telegram.integration.status === "active") {
    return "Telegram chat binding is active with audited command handling.";
  }

  if (telegram.integration.status === "pending_verification") {
    return "Telegram binding is saved and waiting for the first verified webhook command.";
  }

  if (telegram.integration.status === "disabled") {
    return "Telegram command-center access is disabled for this workspace.";
  }

  return "Telegram command-center chat binding has not been configured.";
}

function telegramControlValue(telegram: TelegramIntegrationResponse | null) {
  if (!telegram) {
    return "Unavailable";
  }

  return telegram.integration.status.replace(/_/g, " ");
}

export function buildSettingsLaunchReadiness(input: {
  providers: ProviderSummary;
  telegram: TelegramIntegrationResponse | null;
}): SettingsLaunchReadiness {
  const providers = input.providers;
  const providerList = allProviders(providers);
  const totalProviders = providerList.length;
  const configuredProviderCount = providerList.filter(
    (provider) => provider.readiness === "configured",
  ).length;
  const guardedProviderCount = providerList.filter(
    (provider) => provider.readiness === "guarded",
  ).length;
  const blockedProviderCount = providerList.filter(
    (provider) => provider.readiness === "blocked" || provider.readiness === "disabled",
  ).length;
  const webhookTotal = providers.webhooks.length;
  const configuredWebhookCount = providers.webhooks.filter(
    (provider) => provider.readiness === "configured",
  ).length;
  const webhookBlockerCount = providers.webhooks.filter(
    (provider) => provider.readiness === "blocked" || provider.missingSecrets.length > 0,
  ).length;
  const missingSecrets = unique(providerList.flatMap((provider) => provider.missingSecrets));
  const providerBlockers = unique(providers.summary.productionBlockers);
  const telegramBlockers = telegramSecretBlockers(input.telegram);
  const blockers = unique([...providerBlockers, ...telegramBlockers]);
  const telegramSecretsReady =
    input.telegram?.deployment.botTokenConfigured &&
    input.telegram.deployment.webhookSecretConfigured;
  const telegramActive = input.telegram?.integration.status === "active";
  const posture: SettingsLaunchReadinessPosture =
    blockers.length > 0 || blockedProviderCount > 0
      ? "blocked"
      : guardedProviderCount > 0 || !telegramSecretsReady || !telegramActive
        ? "guarded"
        : "ready";
  const tone: SettingsLaunchReadinessTone =
    posture === "blocked" ? "blocked" : posture === "guarded" ? "warn" : "good";
  const nextSteps = unique([
    ...(missingSecrets.length > 0
      ? [`Configure missing deployment secrets: ${missingSecrets.join(", ")}.`]
      : []),
    ...(providerBlockers.length > 0
      ? ["Clear provider production blockers before live launch."]
      : []),
    ...(input.telegram && !telegramSecretsReady
      ? ["Configure Telegram bot and webhook secrets server-side before enabling chat control."]
      : []),
    ...(input.telegram && telegramSecretsReady && !telegramActive
      ? ["Send one verified command from the bound Telegram chat to activate the integration."]
      : []),
    ...(providers.summary.guarded > 0
      ? ["Review guarded provider rows and decide which channels are safe to keep in beta mode."]
      : []),
  ]).slice(0, 5);

  if (nextSteps.length === 0) {
    nextSteps.push("Keep monitoring provider events, audit evidence, and suppression checks before scaling volume.");
  }

  return {
    posture,
    tone,
    title:
      posture === "ready"
        ? "Launch controls are ready"
        : posture === "guarded"
          ? "Launch is guarded"
          : "Launch is blocked",
    summary:
      `${configuredProviderCount}/${totalProviders} providers configured, ` +
      `${guardedProviderCount} guarded, ${blockedProviderCount} blocked or disabled, ` +
      `${blockers.length} launch blocker${blockers.length === 1 ? "" : "s"}.`,
    blockers,
    nextSteps,
    lanes: [
      {
        id: "provider_runtime",
        label: "Provider runtime",
        value: `${configuredProviderCount}/${totalProviders}`,
        detail:
          blockedProviderCount > 0
            ? `${blockedProviderCount} provider${blockedProviderCount === 1 ? "" : "s"} blocked or disabled.`
            : guardedProviderCount > 0
              ? `${guardedProviderCount} provider${guardedProviderCount === 1 ? "" : "s"} still guarded.`
              : "Configured providers are ready for gated live work.",
        tone:
          blockedProviderCount > 0 ? "blocked" : guardedProviderCount > 0 ? "warn" : "good",
      },
      {
        id: "webhook_safety",
        label: "Webhook safety",
        value: webhookTotal > 0 ? `${configuredWebhookCount}/${webhookTotal}` : "0/0",
        detail:
          webhookTotal === 0
            ? "No webhook providers are declared."
            : webhookBlockerCount > 0
              ? `${webhookBlockerCount} webhook path${webhookBlockerCount === 1 ? "" : "s"} need verification secrets.`
              : "Webhook paths have signature or secret-header requirements visible.",
        tone: webhookBlockerCount > 0 ? "blocked" : webhookTotal > 0 ? "good" : "neutral",
      },
      {
        id: "telegram_control",
        label: "Telegram control",
        value: telegramControlValue(input.telegram),
        detail: telegramControlDetail(input.telegram),
        tone:
          telegramBlockers.length > 0
            ? "blocked"
            : telegramActive
              ? "good"
              : "warn",
      },
      {
        id: "entitlement_safety",
        label: "Entitlement gates",
        value: "Server gated",
        detail:
          "Lead creation, source runs, outreach dispatch, voice calls, provider-cost budgets, and AI worker task proposals are checked before billable or provider work.",
        tone: "good",
      },
      {
        id: "launch_blockers",
        label: "Launch blockers",
        value: String(blockers.length),
        detail:
          blockers.length > 0
            ? "Clear blockers before presenting this workspace as production launch-ready."
            : "No provider or Telegram deployment blocker is visible in current readiness evidence.",
        tone: blockers.length > 0 ? "blocked" : "good",
      },
    ],
    guardrails: [
      "No provider secrets are entered in browser forms.",
      "Webhook signatures or secret headers must verify before provider events mutate state.",
      "Telegram commands remain allowlisted, audited, rate-limited, and approval-gated for risky requests.",
      "Entitlement, channel-access, and provider-cost checks run server-side before billable or provider-backed work.",
      "Provider launch readiness does not bypass role, email-verification, entitlement, suppression, or audit gates.",
    ],
  };
}

export function buildProviderDeploymentSetupPlan(input: {
  providers: ProviderSummary;
  telegram: TelegramIntegrationResponse | null;
}): ProviderDeploymentSetupPlan {
  const providers = allProviders(input.providers);
  const missingSecrets = unique(providers.flatMap((provider) => provider.missingSecrets));
  const missingSecretProviders = providers.filter((provider) => provider.missingSecrets.length > 0);
  const productionBlockers = unique(
    providers.flatMap((provider) => provider.productionBlockers),
  );
  const webhookProviders = input.providers.webhooks;
  const webhookNeedsVerification = webhookProviders.filter(
    (provider) =>
      provider.readiness !== "configured" ||
      provider.missingSecrets.length > 0 ||
      provider.productionBlockers.length > 0,
  );
  const guardedProviders = providers.filter((provider) => provider.readiness === "guarded");
  const blockedProviders = providers.filter(
    (provider) => provider.readiness === "blocked" || provider.readiness === "disabled",
  );
  const configuredProviders = providers.filter((provider) => provider.readiness === "configured");
  const telegramMissingSecrets = input.telegram
    ? [
        ...(input.telegram.deployment.botTokenConfigured ? [] : ["TELEGRAM_BOT_TOKEN"]),
        ...(input.telegram.deployment.webhookSecretConfigured
          ? []
          : ["TELEGRAM_WEBHOOK_SECRET"]),
      ]
    : ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"];
  const telegramSecretsReady =
    input.telegram?.deployment.botTokenConfigured &&
    input.telegram.deployment.webhookSecretConfigured;
  const telegramStatus = input.telegram?.integration.status ?? "not_configured";
  const telegramStatusLabel = telegramStatus.replace(/_/g, " ");

  const secretStatus: ProviderDeploymentSetupStatus =
    missingSecrets.length > 0 ? "needs_secret" : "ready";
  const webhookStatus: ProviderDeploymentSetupStatus =
    webhookProviders.length === 0
      ? "guarded"
      : webhookNeedsVerification.length > 0
        ? "needs_verification"
        : "ready";
  const telegramSetupStatus: ProviderDeploymentSetupStatus =
    !input.telegram || !telegramSecretsReady
      ? "needs_secret"
      : telegramStatus === "active"
        ? "ready"
        : telegramStatus === "disabled"
          ? "blocked"
          : "needs_verification";
  const channelStatus: ProviderDeploymentSetupStatus =
    blockedProviders.length > 0
      ? "blocked"
      : guardedProviders.length > 0
        ? "guarded"
        : "ready";

  const steps: ProviderDeploymentSetupStep[] = [
    {
      id: "deployment_secrets",
      title: "Configure deployment-side provider secrets",
      owner: "Deployment owner",
      status: secretStatus,
      tone: setupTone(secretStatus),
      detail:
        missingSecrets.length > 0
          ? `Set ${pluralize(missingSecrets.length, "missing secret")} in the hosting environment before live provider work.`
          : "Required provider secret names are present in deployment readiness evidence.",
      secretNames: missingSecrets,
      providerNames: missingSecretProviders.map((provider) => provider.provider),
      evidence:
        missingSecrets.length > 0
          ? missingSecretProviders.map(
              (provider) => `${provider.provider}: ${provider.missingSecrets.join(", ")}`,
            )
          : ["Provider readiness reports no missing required secrets."],
    },
    {
      id: "webhook_verification",
      title: "Verify provider webhooks before state mutation",
      owner: "Engineering owner",
      status: webhookStatus,
      tone: setupTone(webhookStatus),
      detail:
        webhookProviders.length === 0
          ? "No webhook providers are declared yet; keep external mutation paths disabled."
          : webhookNeedsVerification.length > 0
            ? `${pluralize(webhookNeedsVerification.length, "webhook path")} need signature or secret-header readiness.`
            : "Declared webhook providers show verification readiness.",
      secretNames: unique(webhookNeedsVerification.flatMap((provider) => provider.missingSecrets)),
      providerNames: webhookNeedsVerification.map((provider) => provider.provider),
      evidence:
        webhookNeedsVerification.length > 0
          ? webhookNeedsVerification.map(
              (provider) =>
                `${provider.provider}: ${provider.productionBlockers[0] ?? provider.readiness}`,
            )
          : webhookProviders.length > 0
            ? webhookProviders.map((provider) => `${provider.provider}: ${provider.readiness}`)
            : ["No webhook provider rows are available."],
    },
    {
      id: "telegram_activation",
      title: "Activate Telegram command center safely",
      owner: "Workspace owner or admin",
      status: telegramSetupStatus,
      tone: setupTone(telegramSetupStatus),
      detail:
        telegramSetupStatus === "ready"
          ? "Telegram is active for audited allowlisted commands."
          : telegramSetupStatus === "needs_secret"
            ? "Configure bot and webhook secrets server-side before binding chat control."
            : telegramSetupStatus === "blocked"
              ? "Telegram command-center access is disabled for this workspace."
              : "Send a verified command from the bound chat to finish activation.",
      secretNames: telegramSetupStatus === "needs_secret" ? telegramMissingSecrets : [],
      providerNames: ["telegram-command-center"],
      evidence: [
        `Status: ${telegramStatusLabel}`,
        ...(input.telegram
          ? [
              input.telegram.deployment.botTokenConfigured
                ? "Bot token configured"
                : "Bot token missing",
              input.telegram.deployment.webhookSecretConfigured
                ? "Webhook secret configured"
                : "Webhook secret missing",
            ]
          : ["Telegram readiness evidence unavailable"]),
      ],
    },
    {
      id: "live_channel_review",
      title: "Review guarded and blocked live channels",
      owner: "Revenue operations owner",
      status: channelStatus,
      tone: setupTone(channelStatus),
      detail:
        blockedProviders.length > 0
          ? `${pluralize(blockedProviders.length, "provider")} are blocked or disabled and cannot be treated as launch-ready.`
          : guardedProviders.length > 0
            ? `${pluralize(guardedProviders.length, "provider")} remain guarded or mock-backed; keep them in beta review.`
            : "Configured providers are ready for server-side gated live work.",
      secretNames: [],
      providerNames:
        blockedProviders.length > 0
          ? blockedProviders.map((provider) => provider.provider)
          : guardedProviders.map((provider) => provider.provider),
      evidence:
        productionBlockers.length > 0
          ? productionBlockers
          : [
              `${pluralize(configuredProviders.length, "provider")} configured`,
              `${pluralize(guardedProviders.length, "provider")} guarded`,
              `${pluralize(blockedProviders.length, "provider")} blocked or disabled`,
            ],
    },
  ];

  const readySteps = steps.filter((step) => step.status === "ready").length;

  return {
    title: "Deployment setup plan",
    summary:
      `${readySteps}/${steps.length} setup areas ready; ` +
      `${pluralize(missingSecrets.length, "missing secret")}; ` +
      `${pluralize(productionBlockers.length, "production blocker")}.`,
    steps,
    guardrails: [
      "Do not paste raw provider secrets into browser forms.",
      "Store provider credentials in deployment secrets or an approved vault only.",
      "Keep guarded or mock-backed providers out of high-volume launch promises.",
      "Webhook verification must pass before provider callbacks mutate workspace or billing state.",
      "Telegram setup does not approve campaigns, calls, billing, providers, or AI-worker execution.",
    ],
  };
}

export function buildIncidentResponseReadinessPlan(input: {
  providers: ProviderSummary | null;
  telegram: TelegramIntegrationResponse | null;
}): IncidentResponseReadinessPlan {
  const providerBlockers = unique(input.providers?.summary.productionBlockers ?? []);
  const telegramSecrets = telegramSecretBlockers(input.telegram);
  const telegramBlockers = input.telegram ? telegramSecrets : ["Telegram readiness is unavailable."];
  const launchBlockers = unique([
    ...providerBlockers,
    ...telegramBlockers,
    ...(input.providers ? [] : ["Provider readiness is unavailable."]),
  ]);
  const hasProviderEvidence = Boolean(input.providers);
  const hasTelegramEvidence = Boolean(input.telegram);
  const launchBlocked = launchBlockers.length > 0;
  const monitorStatus: IncidentResponseReadinessStatus = launchBlocked
    ? "blocked"
    : "guarded";
  const alertStatus: IncidentResponseReadinessStatus = "needs_configuration";
  const triageStatus: IncidentResponseReadinessStatus =
    hasProviderEvidence && hasTelegramEvidence ? "ready" : "blocked";
  const runbookStatus: IncidentResponseReadinessStatus = "needs_owner";
  const steps: IncidentResponseReadinessStep[] = [
    {
      id: "readiness_monitor",
      title: "Schedule production readiness probes",
      owner: "Deployment owner",
      status: monitorStatus,
      tone: incidentTone(monitorStatus),
      detail: launchBlocked
        ? "Clear launch blockers before treating scheduled readiness checks as production coverage."
        : "The repository includes a scheduled readiness-monitor workflow, but deployed URL variables must be configured outside the app.",
      requiredConfig: [
        "PRODUCTION_WEB_APP_URL",
        "PRODUCTION_API_HEALTHCHECK_URL",
        "PRODUCTION_WEB_READINESSCHECK_URL",
        "PRODUCTION_API_READINESSCHECK_URL",
        "PRODUCTION_WORKFLOWS_HEALTHCHECK_URL",
      ],
      evidence: launchBlocked
        ? launchBlockers.slice(0, 4)
        : [
            ".github/workflows/readiness-monitor.yml",
            "scripts/cloudflare-smoke.sh",
            "Readiness warnings fail monitor runs unless explicitly allowed.",
          ],
    },
    {
      id: "alert_routing",
      title: "Route failed probes to an owner-visible channel",
      owner: "Operations owner",
      status: alertStatus,
      tone: incidentTone(alertStatus),
      detail:
        "GitHub scheduled-run failures are the fallback alert; configure the optional webhook for Slack, Discord, or a generic incident endpoint before scaling paid customers.",
      requiredConfig: [
        "PRODUCTION_READINESS_ALERT_WEBHOOK_URL",
        "PRODUCTION_READINESS_ALERT_WEBHOOK_FORMAT",
      ],
      evidence: [
        "Webhook alert is optional in the workflow.",
        "Without the webhook, GitHub Actions is the owner-facing failure signal.",
      ],
    },
    {
      id: "triage_evidence",
      title: "Keep first-response triage evidence available",
      owner: "Engineering owner",
      status: triageStatus,
      tone: incidentTone(triageStatus),
      detail:
        triageStatus === "ready"
          ? "Provider readiness, Telegram readiness, request IDs, response timing, audit evidence, and dashboard health signals are available for first triage."
          : "Provider and Telegram readiness evidence must load before an operator can triage incidents from Settings.",
      requiredConfig: [],
      evidence: [
        hasProviderEvidence
          ? "Provider readiness loaded from /v1/providers."
          : "Provider readiness unavailable.",
        hasTelegramEvidence
          ? "Telegram readiness loaded from /v1/integrations/telegram."
          : "Telegram readiness unavailable.",
        "Recent audit evidence and request IDs remain summarized, not raw payload dumps.",
      ],
    },
    {
      id: "escalation_runbook",
      title: "Assign incident owner and escalation policy",
      owner: "Founder or service owner",
      status: runbookStatus,
      tone: incidentTone(runbookStatus),
      detail:
        "Current operations are owner-operated. Define paging/escalation ownership and customer-notification rules before claiming mature incident response.",
      requiredConfig: [
        "primary incident owner",
        "backup incident owner",
        "customer notification channel",
        "rollback decision owner",
      ],
      evidence: [
        "docs/reliability/production-readiness-review.md",
        "docs/platform/service-ownership.md",
        "docs/platform/deploy-and-rollback-policy.md",
      ],
    },
  ];
  const blockedCount = steps.filter((step) => step.tone === "blocked").length;
  const warningCount = steps.filter((step) => step.tone === "warn").length;
  const ownerSetupSummary =
    warningCount === 1
      ? "1 area needs owner setup"
      : `${warningCount} areas need owner setup`;
  const posture: SettingsLaunchReadinessPosture =
    blockedCount > 0 ? "blocked" : warningCount > 0 ? "guarded" : "ready";
  const tone: SettingsLaunchReadinessTone =
    posture === "blocked" ? "blocked" : posture === "guarded" ? "warn" : "good";

  return {
    posture,
    tone,
    title:
      posture === "blocked"
        ? "Incident response is blocked"
        : posture === "guarded"
          ? "Incident response is owner-operated"
          : "Incident response is ready",
    summary:
      `${steps.filter((step) => step.status === "ready").length}/${steps.length} incident areas ready; ` +
      `${ownerSetupSummary}; ` +
      `${pluralize(blockedCount, "area")} blocked.`,
    steps,
    launchBlockers,
    guardrails: [
      "This plan does not replace external observability, pager tooling, SIEM, or a formal on-call rotation.",
      "Do not claim mature incident response until alert routing, escalation ownership, and customer-notification rules are configured.",
      "Readiness probes should fail on warnings unless an exception is explicitly accepted for a rollout window.",
      "Triage evidence must stay sanitized; raw provider payloads, request bodies, IP values, and user-agent values are not shown in the app.",
    ],
  };
}
