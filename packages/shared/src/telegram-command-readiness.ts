import { z } from "zod";
import {
  actionProposalListResponseSchema,
  dashboardResponseSchema,
  telegramCommandSchema,
  telegramDefaultAllowedCommands,
  telegramIntegrationResponseSchema,
  type ActionProposalListResponse,
  type DashboardResponse,
  type TelegramCommand,
  type TelegramIntegrationResponse,
} from "./domain";

export const telegramCommandReadinessPostureSchema = z.enum([
  "ready",
  "guarded",
  "blocked",
]);

export const telegramCommandReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const telegramCommandReadinessControlStatusSchema = z.enum([
  "met",
  "watch",
  "missing",
  "blocked",
]);

export const telegramCommandReadinessCommandModeSchema = z.enum([
  "read_only",
  "approval_gated",
]);

export const telegramCommandReadinessCommandStatusSchema = z.enum([
  "enabled",
  "disabled",
]);

export const telegramCommandReadinessControlSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: telegramCommandReadinessControlStatusSchema,
  tone: telegramCommandReadinessToneSchema,
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const telegramCommandReadinessCommandSchema = z.object({
  command: telegramCommandSchema,
  label: z.string(),
  mode: telegramCommandReadinessCommandModeSchema,
  status: telegramCommandReadinessCommandStatusSchema,
  detail: z.string(),
  guardrails: z.array(z.string()).default([]),
});

export const telegramCommandReadinessResponseSchema = z.object({
  surface: z.literal("telegram-command-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: telegramCommandReadinessPostureSchema,
  summary: z.object({
    integrationStatus: z.string(),
    enabledCommandCount: z.number().int().min(0),
    readOnlyCommandCount: z.number().int().min(0),
    approvalGatedCommandCount: z.number().int().min(0),
    blockedMutationCount: z.number().int().min(0),
    recentCommandCount: z.number().int().min(0),
    pendingTelegramPauseProposals: z.number().int().min(0),
    rateLimit: z.object({
      limit: z.number().int().min(1),
      windowSeconds: z.number().int().min(1),
      durableStore: z.boolean(),
    }),
  }),
  controls: z.array(telegramCommandReadinessControlSchema),
  commands: z.array(telegramCommandReadinessCommandSchema),
  blockedMutations: z.array(z.string()),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export type TelegramCommandReadinessPosture = z.infer<
  typeof telegramCommandReadinessPostureSchema
>;
export type TelegramCommandReadinessTone = z.infer<
  typeof telegramCommandReadinessToneSchema
>;
export type TelegramCommandReadinessResponse = z.infer<
  typeof telegramCommandReadinessResponseSchema
>;

type BuildTelegramCommandReadinessInput = {
  dashboard: DashboardResponse;
  telegram: TelegramIntegrationResponse;
  proposals: ActionProposalListResponse;
  storageMode: "memory" | "postgres";
  rateLimit: {
    limit: number;
    windowSeconds: number;
  };
  generatedAt?: string;
};

const commandLabels: Record<TelegramCommand, string> = {
  status: "Workspace status",
  brief: "Operator brief",
  approvals: "Approval summary",
  providers: "Provider readiness",
  suppressions: "Suppression posture",
  sequence: "Sequence readiness",
  forecast: "Revenue forecast",
  help: "Command help",
  pause: "Pause proposal",
};

const readOnlyCommands = telegramDefaultAllowedCommands.filter(
  (command) => command !== "pause",
);

const blockedMutations = [
  "Approve or reject actions from Telegram",
  "Dispatch campaigns, calls, SMS, or social actions from Telegram",
  "Change billing, plan, seat, or provider configuration from Telegram",
  "Run AI-worker tools or external automations from Telegram",
];

function toneForStatus(
  status: z.infer<typeof telegramCommandReadinessControlStatusSchema>,
): TelegramCommandReadinessTone {
  if (status === "met") {
    return "good";
  }

  if (status === "watch" || status === "missing") {
    return "warn";
  }

  return "blocked";
}

function control(input: {
  id: string;
  label: string;
  status: z.infer<typeof telegramCommandReadinessControlStatusSchema>;
  detail: string;
  evidence?: string[];
}) {
  return {
    ...input,
    tone: toneForStatus(input.status),
    evidence: input.evidence ?? [],
  };
}

function commandMode(command: TelegramCommand) {
  return command === "pause" ? "approval_gated" : "read_only";
}

function commandDetail(command: TelegramCommand, enabled: boolean) {
  if (!enabled) {
    return `/${command} is implemented but not allowlisted for this workspace.`;
  }

  if (command === "pause") {
    return "/pause creates an Approval Inbox proposal and never changes campaign state directly.";
  }

  return `/${command} returns read-only workspace context without creating provider work or mutations.`;
}

function commandGuardrails(command: TelegramCommand) {
  if (command === "pause") {
    return [
      "Creates action proposal only",
      "Owner/admin in-app review required",
      "No webhook-time campaign mutation",
    ];
  }

  return [
    "Read-only reply",
    "Workspace chat binding required",
    "Audited command response",
  ];
}

export function buildTelegramCommandReadiness(
  input: BuildTelegramCommandReadinessInput,
) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const telegram = telegramIntegrationResponseSchema.parse(input.telegram);
  const proposals = actionProposalListResponseSchema.parse(input.proposals);
  const enabledCommands = telegram.liveCommands.filter((command) =>
    telegram.integration.allowedCommands.includes(command),
  );
  const enabledReadOnlyCommands = enabledCommands.filter(
    (command) => command !== "pause",
  );
  const enabledApprovalGatedCommands = enabledCommands.filter(
    (command) => command === "pause",
  );
  const pendingTelegramPauseProposals = proposals.proposals.filter(
    (proposal) =>
      proposal.status === "pending" && proposal.type === "telegram_pause",
  ).length;
  const bindingConfigured =
    telegram.integration.status !== "not_configured" &&
    telegram.integration.chatIdMask !== null;
  const disabled = telegram.integration.status === "disabled";
  const active = telegram.integration.status === "active";
  const verified = active || telegram.integration.lastVerifiedAt !== null;
  const durableStore = input.storageMode === "postgres";
  const allReadOnlyCommandsEnabled = readOnlyCommands.every((command) =>
    enabledCommands.includes(command),
  );
  const pauseEnabled = enabledCommands.includes("pause");

  const controls = [
    control({
      id: "bot_token",
      label: "Bot token",
      status: telegram.deployment.botTokenConfigured ? "met" : "missing",
      detail: telegram.deployment.botTokenConfigured
        ? "TELEGRAM_BOT_TOKEN is configured server-side."
        : "Configure TELEGRAM_BOT_TOKEN before expecting Telegram replies.",
      evidence: ["TELEGRAM_BOT_TOKEN"],
    }),
    control({
      id: "webhook_secret",
      label: "Webhook secret",
      status: telegram.deployment.webhookSecretConfigured ? "met" : "missing",
      detail: telegram.deployment.webhookSecretConfigured
        ? "Webhook secret verification is available for Telegram updates."
        : "Configure TELEGRAM_WEBHOOK_SECRET before accepting Telegram updates.",
      evidence: ["x-telegram-bot-api-secret-token"],
    }),
    control({
      id: "chat_binding",
      label: "Workspace chat binding",
      status: disabled ? "blocked" : bindingConfigured ? "met" : "missing",
      detail: disabled
        ? "Telegram access is disabled for this workspace."
        : bindingConfigured
          ? `A masked chat binding exists for ${telegram.integration.chatIdMask}.`
          : "Bind a Telegram chat ID from Settings before commands can run.",
      evidence: ["/v1/integrations/telegram"],
    }),
    control({
      id: "webhook_verification",
      label: "Verified webhook activity",
      status: disabled ? "blocked" : verified ? "met" : "watch",
      detail: verified
        ? "At least one webhook verification has activated the integration."
        : "The binding is pending the first verified Telegram update.",
      evidence: ["lastVerifiedAt", "lastUpdateId"],
    }),
    control({
      id: "read_only_allowlist",
      label: "Read-only command allowlist",
      status: allReadOnlyCommandsEnabled ? "met" : "missing",
      detail: allReadOnlyCommandsEnabled
        ? `${enabledReadOnlyCommands.length} read-only commands are enabled.`
        : "Enable the complete read-only command set before treating Telegram as operator-ready.",
      evidence: ["telegramDefaultAllowedCommands"],
    }),
    control({
      id: "approval_bridge",
      label: "Approval proposal bridge",
      status: pauseEnabled ? "met" : "missing",
      detail: pauseEnabled
        ? "/pause is enabled and creates an in-app Approval Inbox proposal."
        : "Enable /pause only when the Approval Inbox proposal path is acceptable for the workspace.",
      evidence: ["telegram_pause action proposal"],
    }),
    control({
      id: "mutation_boundaries",
      label: "Direct mutation boundaries",
      status: "met",
      detail:
        "Telegram commands cannot directly approve, dispatch, bill, configure providers, or run AI-worker tools.",
      evidence: ["command-center policy", "webhook command handler"],
    }),
    control({
      id: "rate_limit",
      label: "Per-chat command throttle",
      status: durableStore ? "met" : "watch",
      detail: durableStore
        ? `Postgres-backed per-chat throttle allows ${input.rateLimit.limit} command${input.rateLimit.limit === 1 ? "" : "s"} per ${input.rateLimit.windowSeconds} seconds.`
        : `Demo memory fallback allows ${input.rateLimit.limit} command${input.rateLimit.limit === 1 ? "" : "s"} per ${input.rateLimit.windowSeconds} seconds; use Postgres for durable production throttling.`,
      evidence: ["telegram.rate_limit.claim", "TELEGRAM_COMMAND_RATE_LIMIT_MAX"],
    }),
    control({
      id: "command_audit",
      label: "Command audit evidence",
      status: telegram.recentCommands.length > 0 ? "met" : "watch",
      detail: telegram.recentCommands.length > 0
        ? `${telegram.recentCommands.length} recent Telegram command audit record${telegram.recentCommands.length === 1 ? "" : "s"} are visible.`
        : "No verified Telegram command audit evidence exists yet.",
      evidence: ["telegram command audit"],
    }),
  ];
  const blockingControls = controls.filter((entry) =>
    ["missing", "blocked"].includes(entry.status),
  );
  const watchControls = controls.filter((entry) => entry.status === "watch");
  const posture: TelegramCommandReadinessPosture = blockingControls.length > 0
    ? "blocked"
    : watchControls.length > 0
      ? "guarded"
      : "ready";

  return telegramCommandReadinessResponseSchema.parse({
    surface: "telegram-command-readiness",
    version: "2026-06-05.telegram-command-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    summary: {
      integrationStatus: telegram.integration.status,
      enabledCommandCount: enabledCommands.length,
      readOnlyCommandCount: enabledReadOnlyCommands.length,
      approvalGatedCommandCount: enabledApprovalGatedCommands.length,
      blockedMutationCount: blockedMutations.length,
      recentCommandCount: telegram.recentCommands.length,
      pendingTelegramPauseProposals,
      rateLimit: {
        limit: input.rateLimit.limit,
        windowSeconds: input.rateLimit.windowSeconds,
        durableStore,
      },
    },
    controls,
    commands: telegram.liveCommands.map((command) => {
      const enabled = enabledCommands.includes(command);
      return {
        command,
        label: commandLabels[command],
        mode: commandMode(command),
        status: enabled ? "enabled" : "disabled",
        detail: commandDetail(command, enabled),
        guardrails: commandGuardrails(command),
      };
    }),
    blockedMutations,
    guardrails: [
      "Telegram command readiness is read-only and does not bind chats, approve proposals, dispatch outreach, change billing, configure providers, or run AI-worker tools.",
      "Deterministic aliases and slash commands share the same allowlist, webhook verification, replay protection, per-chat throttling, and audit trail.",
      "Approval-gated Telegram commands create in-app proposals only; accountable operators still review and approve mutations inside the app.",
    ],
    unavailableClaims: [
      "Telegram cannot approve, reject, dispatch, bill, configure providers, or mutate outreach directly.",
      "Natural-language Telegram commands are deterministic aliases, not open-ended autonomous agent execution.",
      "Customer-owned dedicated bot tokens, rotation, and per-workspace secret vault storage remain roadmap.",
    ],
  });
}
