import {
  actionProposalListResponseSchema,
  dashboardResponseSchema,
  telegramIntegrationResponseSchema,
  telegramNotificationDeliveryResponseSchema,
  telegramNotificationReadinessConfigSchema,
  type ActionProposalListResponse,
  type DashboardResponse,
  type TelegramIntegrationResponse,
  type TelegramNotificationDeliveryResponse,
  type TelegramNotificationReadinessConfig,
} from "@sales/shared";
import { maskTelegramChatId, sendTelegramMessage } from "./telegram";

type TelegramNotificationType =
  TelegramNotificationDeliveryResponse["notificationType"];

type DeliveryInput = {
  notificationType: TelegramNotificationType;
  dashboard: DashboardResponse;
  proposals: ActionProposalListResponse;
  telegram: TelegramIntegrationResponse;
  config: Partial<TelegramNotificationReadinessConfig>;
  targetChatId: string | null;
  targetChatMatchesWorkspace: boolean;
  dryRun?: boolean;
  generatedAt?: string;
  transport?: (
    chatId: string,
    text: string,
  ) => Promise<{ sent: boolean; detail: string }>;
};

const version = "2026-06-06.telegram-notification-delivery";

const notificationLabels: Record<TelegramNotificationType, string> = {
  operator_brief: "Operator brief digest",
  approval_digest: "Approval workload digest",
  provider_alert: "Provider readiness alert",
  conversion_alert: "Conversion follow-up alert",
  incident_alert: "Incident escalation alert",
};

const guardrails = [
  "Summary-only Telegram notification.",
  "No approval, outreach dispatch, call dispatch, billing change, provider configuration, or AI-worker execution was performed.",
  "Sensitive lead payloads, provider secrets, payment data, and raw webhook bodies stay out of Telegram.",
];

function notificationTypeEnabled(
  type: TelegramNotificationType,
  config: TelegramNotificationReadinessConfig,
) {
  if (type === "operator_brief") return config.digestScheduleConfigured;
  if (type === "approval_digest") return config.approvalAlertsConfigured;
  if (type === "provider_alert") return config.providerAlertsConfigured;
  if (type === "conversion_alert") return config.conversionAlertsConfigured;
  return config.incidentAlertsConfigured;
}

function normalizeConfig(input: Partial<TelegramNotificationReadinessConfig>) {
  return telegramNotificationReadinessConfigSchema.parse({
    notificationsEnabled: input.notificationsEnabled ?? false,
    targetChatConfigured: input.targetChatConfigured ?? false,
    targetChatMatchesWorkspace: input.targetChatMatchesWorkspace ?? false,
    policyConfigured: input.policyConfigured ?? false,
    quietHoursConfigured: input.quietHoursConfigured ?? false,
    escalationOwner: input.escalationOwner ?? null,
    digestScheduleConfigured: input.digestScheduleConfigured ?? false,
    approvalAlertsConfigured: input.approvalAlertsConfigured ?? false,
    providerAlertsConfigured: input.providerAlertsConfigured ?? false,
    conversionAlertsConfigured: input.conversionAlertsConfigured ?? false,
    incidentAlertsConfigured: input.incidentAlertsConfigured ?? false,
    deliveryAuditConfigured: input.deliveryAuditConfigured ?? false,
    payloadReviewConfigured: input.payloadReviewConfigured ?? false,
    maxNotificationsPerHour: input.maxNotificationsPerHour ?? 12,
  });
}

function compactList(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value?.trim()));
}

function buildMessage(input: {
  notificationType: TelegramNotificationType;
  dashboard: DashboardResponse;
  proposals: ActionProposalListResponse;
  generatedAt: string;
}) {
  const highUrgencyCount = input.dashboard.actionItems.filter(
    (item) => item.urgency === "high",
  ).length;
  const providerAction = input.dashboard.actionItems.find((item) =>
    `${item.title} ${item.detail}`.toLowerCase().includes("provider"),
  );
  const nextAction = input.dashboard.actionItems[0];
  const meetingCount = input.dashboard.meetings.length;
  const leadCount = input.dashboard.leads.length;

  return compactList([
    `salesxgrowth ${notificationLabels[input.notificationType]}`,
    `Workspace: ${input.dashboard.workspace.workspaceName}`,
    `Plan: ${input.dashboard.subscription.planKey}`,
    `Pending approvals: ${input.proposals.summary.pending}`,
    `Action items: ${input.dashboard.actionItems.length} (${highUrgencyCount} high urgency)`,
    `Leads visible: ${leadCount}`,
    `Meetings visible: ${meetingCount}`,
    providerAction ? `Provider attention: ${providerAction.title}` : null,
    nextAction ? `Next in-app review: ${nextAction.title}` : null,
    `Generated: ${input.generatedAt}`,
    "Guardrail: this notification did not approve, dispatch, bill, configure providers, or run AI-worker tools.",
  ]).join("\n");
}

function response(input: {
  notificationType: TelegramNotificationType;
  mode: TelegramNotificationDeliveryResponse["mode"];
  chatIdMask: string | null;
  messagePreview: string;
  detail: string;
  generatedAt: string;
}) {
  return telegramNotificationDeliveryResponseSchema.parse({
    surface: "telegram-notification-delivery",
    version,
    generatedAt: input.generatedAt,
    notificationType: input.notificationType,
    mode: input.mode,
    provider: "telegram",
    chatIdMask: input.chatIdMask,
    messagePreview: input.messagePreview,
    detail: input.detail,
    guardrails,
    auditEventId: null,
  });
}

export async function deliverTelegramOperationalNotification(
  input: DeliveryInput,
) {
  const dashboard = dashboardResponseSchema.parse(input.dashboard);
  const proposals = actionProposalListResponseSchema.parse(input.proposals);
  const telegram = telegramIntegrationResponseSchema.parse(input.telegram);
  const config = normalizeConfig(input.config);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const targetChatId = input.targetChatId?.trim() || null;
  const chatIdMask = targetChatId
    ? maskTelegramChatId(targetChatId)
    : telegram.integration.chatIdMask;
  const messagePreview = buildMessage({
    notificationType: input.notificationType,
    dashboard,
    proposals,
    generatedAt,
  });

  if (!config.notificationsEnabled) {
    return response({
      notificationType: input.notificationType,
      mode: "blocked",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "Telegram notifications are disabled. Set TELEGRAM_NOTIFICATIONS_ENABLED before test delivery.",
    });
  }

  if (!config.policyConfigured) {
    return response({
      notificationType: input.notificationType,
      mode: "blocked",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "Telegram notification policy is missing, so delivery is blocked.",
    });
  }

  if (!notificationTypeEnabled(input.notificationType, config)) {
    return response({
      notificationType: input.notificationType,
      mode: "blocked",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail: `${notificationLabels[input.notificationType]} is not enabled for Telegram delivery.`,
    });
  }

  if (!targetChatId) {
    return response({
      notificationType: input.notificationType,
      mode: "unavailable",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID is not configured server-side.",
    });
  }

  if (!input.targetChatMatchesWorkspace) {
    return response({
      notificationType: input.notificationType,
      mode: "blocked",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "TELEGRAM_NOTIFICATION_TARGET_CHAT_ID does not match the active workspace chat binding.",
    });
  }

  if (input.dryRun || (process.env.NODE_ENV === "test" && !input.transport)) {
    return response({
      notificationType: input.notificationType,
      mode: "preview",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "Telegram notification delivery preview generated. No network message was sent.",
    });
  }

  if (!config.payloadReviewConfigured) {
    return response({
      notificationType: input.notificationType,
      mode: "blocked",
      chatIdMask,
      messagePreview,
      generatedAt,
      detail:
        "Telegram notification payload review is not configured, so live transport is blocked.",
    });
  }

  const transport = input.transport ?? sendTelegramMessage;
  const delivery = await transport(targetChatId, messagePreview);

  return response({
    notificationType: input.notificationType,
    mode: delivery.sent ? "queued" : "failed",
    chatIdMask,
    messagePreview,
    generatedAt,
    detail: delivery.detail,
  });
}
