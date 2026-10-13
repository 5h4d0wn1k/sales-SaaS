import { z } from "zod";
import {
  actionProposalListResponseSchema,
  dashboardResponseSchema,
  telegramIntegrationResponseSchema,
  type ActionProposalListResponse,
  type DashboardResponse,
  type TelegramIntegrationResponse,
} from "./domain";

export const telegramNotificationReadinessPostureSchema = z.enum([
  "ready",
  "guarded",
  "blocked",
]);

export const telegramNotificationReadinessToneSchema = z.enum([
  "good",
  "warn",
  "blocked",
  "neutral",
]);

export const telegramNotificationReadinessControlStatusSchema = z.enum([
  "met",
  "watch",
  "missing",
  "blocked",
]);

export const telegramNotificationTypeIdSchema = z.enum([
  "operator_brief",
  "approval_digest",
  "provider_alert",
  "conversion_alert",
  "incident_alert",
]);

export const telegramNotificationReadinessConfigSchema = z.object({
  notificationsEnabled: z.boolean().default(false),
  targetChatConfigured: z.boolean().default(false),
  targetChatMatchesWorkspace: z.boolean().default(false),
  policyConfigured: z.boolean().default(false),
  quietHoursConfigured: z.boolean().default(false),
  escalationOwner: z.string().trim().min(1).nullable().default(null),
  digestScheduleConfigured: z.boolean().default(false),
  approvalAlertsConfigured: z.boolean().default(false),
  providerAlertsConfigured: z.boolean().default(false),
  conversionAlertsConfigured: z.boolean().default(false),
  incidentAlertsConfigured: z.boolean().default(false),
  deliveryAuditConfigured: z.boolean().default(false),
  payloadReviewConfigured: z.boolean().default(false),
  maxNotificationsPerHour: z.number().int().min(1).max(120).default(12),
});

export const telegramNotificationReadinessControlSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: telegramNotificationReadinessControlStatusSchema,
  tone: telegramNotificationReadinessToneSchema,
  detail: z.string(),
  evidence: z.array(z.string()).default([]),
});

export const telegramNotificationTypeSchema = z.object({
  id: telegramNotificationTypeIdSchema,
  label: z.string(),
  status: z.enum(["enabled", "disabled"]),
  detail: z.string(),
  guardrails: z.array(z.string()).default([]),
});

export const telegramNotificationReadinessResponseSchema = z.object({
  surface: z.literal("telegram-notification-readiness"),
  version: z.string(),
  generatedAt: z.string(),
  workspace: z.object({
    name: z.string(),
    planKey: z.string(),
  }),
  posture: telegramNotificationReadinessPostureSchema,
  summary: z.object({
    integrationStatus: z.string(),
    enabledNotificationCount: z.number().int().min(0),
    notificationTypeCount: z.number().int().min(0),
    pendingApprovalCount: z.number().int().min(0),
    actionItemCount: z.number().int().min(0),
    maxNotificationsPerHour: z.number().int().min(1),
    escalationOwnerConfigured: z.boolean(),
    deliveryAuditConfigured: z.boolean(),
    targetChatConfigured: z.boolean(),
    targetChatMatchesWorkspace: z.boolean(),
  }),
  controls: z.array(telegramNotificationReadinessControlSchema),
  notificationTypes: z.array(telegramNotificationTypeSchema),
  guardrails: z.array(z.string()),
  unavailableClaims: z.array(z.string()),
});

export const sendTelegramNotificationInputSchema = z.object({
  notificationType: telegramNotificationTypeIdSchema.default("operator_brief"),
  dryRun: z.boolean().default(false),
});

export const telegramNotificationDeliveryResponseSchema = z.object({
  surface: z.literal("telegram-notification-delivery"),
  version: z.string(),
  generatedAt: z.string(),
  notificationType: telegramNotificationTypeIdSchema,
  mode: z.enum(["queued", "preview", "unavailable", "failed", "blocked"]),
  provider: z.literal("telegram"),
  chatIdMask: z.string().nullable(),
  messagePreview: z.string(),
  detail: z.string(),
  guardrails: z.array(z.string()),
  auditEventId: z.string().nullable(),
});

export type TelegramNotificationReadinessPosture = z.infer<
  typeof telegramNotificationReadinessPostureSchema
>;
export type TelegramNotificationReadinessTone = z.infer<
  typeof telegramNotificationReadinessToneSchema
>;
export type TelegramNotificationReadinessConfig = z.infer<
  typeof telegramNotificationReadinessConfigSchema
>;
export type TelegramNotificationReadinessResponse = z.infer<
  typeof telegramNotificationReadinessResponseSchema
>;
export type SendTelegramNotificationInput = z.infer<
  typeof sendTelegramNotificationInputSchema
>;
export type TelegramNotificationDeliveryResponse = z.infer<
  typeof telegramNotificationDeliveryResponseSchema
>;

type BuildTelegramNotificationReadinessInput = {
  dashboard: DashboardResponse;
  telegram: TelegramIntegrationResponse;
  proposals: ActionProposalListResponse;
  config?: Partial<TelegramNotificationReadinessConfig> | null;
  generatedAt?: string;
};

const notificationTypeDefinitions = [
  {
    id: "operator_brief",
    label: "Operator brief digest",
    configKey: "digestScheduleConfigured",
    detail:
      "Scheduled summaries can notify the bound chat about workspace status, approvals, provider posture, and next actions.",
  },
  {
    id: "approval_digest",
    label: "Approval workload digest",
    configKey: "approvalAlertsConfigured",
    detail:
      "Approval digests can surface pending review work without approving or rejecting from Telegram.",
  },
  {
    id: "provider_alert",
    label: "Provider readiness alert",
    configKey: "providerAlertsConfigured",
    detail:
      "Provider alerts can notify operators about readiness blockers without changing provider configuration.",
  },
  {
    id: "conversion_alert",
    label: "Conversion follow-up alert",
    configKey: "conversionAlertsConfigured",
    detail:
      "Conversion alerts can flag meeting or follow-up pressure without scheduling or contacting leads.",
  },
  {
    id: "incident_alert",
    label: "Incident escalation alert",
    configKey: "incidentAlertsConfigured",
    detail:
      "Incident alerts can notify the configured owner about production readiness or webhook issues.",
  },
] as const;

function toneForStatus(
  status: z.infer<typeof telegramNotificationReadinessControlStatusSchema>,
): TelegramNotificationReadinessTone {
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
  status: z.infer<typeof telegramNotificationReadinessControlStatusSchema>;
  detail: string;
  evidence?: string[];
}) {
  return {
    ...input,
    tone: toneForStatus(input.status),
    evidence: input.evidence ?? [],
  };
}

function normalizeConfig(
  input: Partial<TelegramNotificationReadinessConfig> | null | undefined,
) {
  const parsed = telegramNotificationReadinessConfigSchema.partial().parse(
    input ?? {},
  );

  return telegramNotificationReadinessConfigSchema.parse({
    notificationsEnabled: parsed.notificationsEnabled ?? false,
    targetChatConfigured: parsed.targetChatConfigured ?? false,
    targetChatMatchesWorkspace: parsed.targetChatMatchesWorkspace ?? false,
    policyConfigured: parsed.policyConfigured ?? false,
    quietHoursConfigured: parsed.quietHoursConfigured ?? false,
    escalationOwner: parsed.escalationOwner ?? null,
    digestScheduleConfigured: parsed.digestScheduleConfigured ?? false,
    approvalAlertsConfigured: parsed.approvalAlertsConfigured ?? false,
    providerAlertsConfigured: parsed.providerAlertsConfigured ?? false,
    conversionAlertsConfigured: parsed.conversionAlertsConfigured ?? false,
    incidentAlertsConfigured: parsed.incidentAlertsConfigured ?? false,
    deliveryAuditConfigured: parsed.deliveryAuditConfigured ?? false,
    payloadReviewConfigured: parsed.payloadReviewConfigured ?? false,
    maxNotificationsPerHour: parsed.maxNotificationsPerHour ?? 12,
  });
}

export function buildTelegramNotificationReadiness(
  input: BuildTelegramNotificationReadinessInput,
) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const telegram = telegramIntegrationResponseSchema.parse(input.telegram);
  const proposals = actionProposalListResponseSchema.parse(input.proposals);
  const config = normalizeConfig(input.config);
  const disabled = telegram.integration.status === "disabled";
  const bindingConfigured =
    telegram.integration.status !== "not_configured" &&
    telegram.integration.chatIdMask !== null;
  const active = telegram.integration.status === "active";
  const verified = active || telegram.integration.lastVerifiedAt !== null;
  const enabledNotificationTypes = notificationTypeDefinitions.filter(
    (definition) => config[definition.configKey],
  );
  const pendingApprovalCount = proposals.summary.pending;
  const actionItemCount = dashboard.actionItems.length;

  const controls = [
    control({
      id: "notification_switch",
      label: "Notification switch",
      status: config.notificationsEnabled ? "met" : "missing",
      detail: config.notificationsEnabled
        ? "Telegram notifications are enabled for readiness evaluation."
        : "Enable TELEGRAM_NOTIFICATIONS_ENABLED before planning customer-facing Telegram notifications.",
      evidence: ["TELEGRAM_NOTIFICATIONS_ENABLED"],
    }),
    control({
      id: "bot_token",
      label: "Bot token",
      status: telegram.deployment.botTokenConfigured ? "met" : "missing",
      detail: telegram.deployment.botTokenConfigured
        ? "TELEGRAM_BOT_TOKEN is configured server-side."
        : "Configure TELEGRAM_BOT_TOKEN before sending or testing Telegram notifications.",
      evidence: ["TELEGRAM_BOT_TOKEN"],
    }),
    control({
      id: "chat_binding",
      label: "Workspace chat binding",
      status: disabled ? "blocked" : bindingConfigured ? "met" : "missing",
      detail: disabled
        ? "Telegram access is disabled for this workspace."
        : bindingConfigured
          ? `A masked chat binding exists for ${telegram.integration.chatIdMask}.`
          : "Bind a Telegram chat ID before notifications can target an operator chat.",
      evidence: ["/v1/integrations/telegram"],
    }),
    control({
      id: "target_chat_secret",
      label: "Notification target secret",
      status: !config.targetChatConfigured
        ? "missing"
        : config.targetChatMatchesWorkspace
          ? "met"
          : "blocked",
      detail: !config.targetChatConfigured
        ? "Configure TELEGRAM_NOTIFICATION_TARGET_CHAT_ID server-side before proactive notifications can target a chat."
        : config.targetChatMatchesWorkspace
          ? "The deployment-side notification target matches this workspace chat binding."
          : "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID does not resolve to this workspace binding.",
      evidence: [
        "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID",
        "/v1/integrations/telegram",
      ],
    }),
    control({
      id: "verified_webhook",
      label: "Verified Telegram activity",
      status: disabled ? "blocked" : verified ? "met" : "watch",
      detail: verified
        ? "The workspace has verified Telegram webhook activity."
        : "Wait for a verified Telegram update before treating notifications as deliverable.",
      evidence: ["lastVerifiedAt", "lastUpdateId"],
    }),
    control({
      id: "notification_policy",
      label: "Notification policy",
      status: config.policyConfigured ? "met" : "missing",
      detail: config.policyConfigured
        ? "Notification policy is configured for allowed message classes and sensitive-data boundaries."
        : "Configure the notification policy before sending operational alerts to a customer chat.",
      evidence: ["TELEGRAM_NOTIFICATION_POLICY_CONFIGURED"],
    }),
    control({
      id: "quiet_hours",
      label: "Quiet hours",
      status: config.quietHoursConfigured ? "met" : "watch",
      detail: config.quietHoursConfigured
        ? "Quiet-hours handling is configured for Telegram notifications; scheduled dispatch requires a concrete HH:mm window and timezone before transport."
        : "Quiet-hours handling is missing; scheduled notification dispatch is blocked until timing controls are configured.",
      evidence: [
        "TELEGRAM_NOTIFICATION_QUIET_HOURS_CONFIGURED",
        "TELEGRAM_NOTIFICATION_QUIET_HOURS_START",
        "TELEGRAM_NOTIFICATION_QUIET_HOURS_END",
        "TELEGRAM_NOTIFICATION_TIME_ZONE",
      ],
    }),
    control({
      id: "escalation_owner",
      label: "Escalation owner",
      status: config.escalationOwner ? "met" : "missing",
      detail: config.escalationOwner
        ? "A notification escalation owner is configured."
        : "Assign TELEGRAM_NOTIFICATION_ESCALATION_OWNER before incident or approval alerts are considered production-ready.",
      evidence: ["TELEGRAM_NOTIFICATION_ESCALATION_OWNER"],
    }),
    control({
      id: "delivery_rate_cap",
      label: "Delivery rate cap",
      status: config.maxNotificationsPerHour <= 30 ? "met" : "watch",
      detail: `Configured notification cap is ${config.maxNotificationsPerHour} per hour; test and scheduled delivery claim a workspace delivery-ledger entry before Telegram transport.`,
      evidence: ["TELEGRAM_NOTIFICATION_MAX_PER_HOUR"],
    }),
    control({
      id: "delivery_audit",
      label: "Delivery audit",
      status: config.deliveryAuditConfigured ? "met" : "watch",
      detail: config.deliveryAuditConfigured
        ? "Notification delivery audit evidence is configured."
        : "Delivery audit evidence is missing; notification operations need manual review.",
      evidence: ["TELEGRAM_NOTIFICATION_DELIVERY_AUDIT_CONFIGURED"],
    }),
    control({
      id: "payload_review",
      label: "Payload review",
      status: config.payloadReviewConfigured ? "met" : "blocked",
      detail: config.payloadReviewConfigured
        ? "Customer-safe Telegram notification payload review is configured before live transport."
        : "Configure TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_CONFIGURED or TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_URL before live Telegram transport.",
      evidence: [
        "TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_CONFIGURED",
        "TELEGRAM_NOTIFICATION_PAYLOAD_REVIEW_URL",
      ],
    }),
    control({
      id: "notification_types",
      label: "Notification type coverage",
      status: enabledNotificationTypes.length > 0 ? "met" : "missing",
      detail: enabledNotificationTypes.length > 0
        ? `${enabledNotificationTypes.length} Telegram notification type${enabledNotificationTypes.length === 1 ? "" : "s"} are enabled.`
        : "Enable at least one notification type before treating Telegram notifications as useful.",
      evidence: [
        "TELEGRAM_NOTIFICATION_DIGEST_CONFIGURED",
        "TELEGRAM_NOTIFICATION_APPROVAL_ALERTS_CONFIGURED",
      ],
    }),
  ];
  const blockingControls = controls.filter((entry) =>
    ["missing", "blocked"].includes(entry.status),
  );
  const watchControls = controls.filter((entry) => entry.status === "watch");
  const posture: TelegramNotificationReadinessPosture =
    blockingControls.length > 0
      ? "blocked"
      : watchControls.length > 0 ||
          enabledNotificationTypes.length < notificationTypeDefinitions.length
        ? "guarded"
        : "ready";

  return telegramNotificationReadinessResponseSchema.parse({
    surface: "telegram-notification-readiness",
    version: "2026-06-06.telegram-notification-readiness",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    workspace: {
      name: dashboard.workspace.workspaceName,
      planKey: dashboard.subscription.planKey,
    },
    posture,
    summary: {
      integrationStatus: telegram.integration.status,
      enabledNotificationCount: enabledNotificationTypes.length,
      notificationTypeCount: notificationTypeDefinitions.length,
      pendingApprovalCount,
      actionItemCount,
      maxNotificationsPerHour: config.maxNotificationsPerHour,
      escalationOwnerConfigured: Boolean(config.escalationOwner),
      deliveryAuditConfigured: config.deliveryAuditConfigured,
      targetChatConfigured: config.targetChatConfigured,
      targetChatMatchesWorkspace: config.targetChatMatchesWorkspace,
    },
    controls,
    notificationTypes: notificationTypeDefinitions.map((definition) => {
      const enabled = config[definition.configKey];
      return {
        id: definition.id,
        label: definition.label,
        status: enabled ? "enabled" : "disabled",
        detail: enabled
          ? definition.detail
          : `${definition.label} is not configured for Telegram delivery yet.`,
        guardrails: [
          "Summary-only notification",
          "No approval or provider mutation",
          "Sensitive payloads stay out of chat",
        ],
      };
    }),
    guardrails: [
      "Telegram notification readiness is read-only and does not send Telegram messages, approve work, dispatch outreach, change billing, configure providers, or run AI-worker tools.",
      "Future notifications must be summary-only, rate-capped, quiet-hours aware, and linked back to in-app review for sensitive actions.",
      "Live Telegram transport requires customer-safe payload review before a network message is sent.",
      "Notification readiness depends on a bound chat, verified Telegram activity, policy controls, escalation ownership, and delivery audit evidence.",
    ],
    unavailableClaims: [
      "No Telegram notification is sent by this readiness surface.",
      "No campaign approval, outreach dispatch, call dispatch, provider mutation, billing change, or AI-worker execution can happen from a notification.",
      "No customer notification SLA, pager-backed incident response, guaranteed meeting, or guaranteed revenue outcome is implied.",
      "No sensitive lead payload, provider secret, payment data, or raw webhook body should be delivered into Telegram.",
    ],
  });
}
