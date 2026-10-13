import { telegramDefaultAllowedCommands, type TelegramCommand } from "@sales/shared";

export type TelegramCommandMode = "read_only" | "approval_gated";
export type TelegramNotificationDeliveryStatus =
  | "queued"
  | "previewed"
  | "blocked"
  | "unavailable"
  | "failed"
  | "error";

export type TelegramCommandView = {
  command: TelegramCommand;
  label: string;
  mode: TelegramCommandMode;
  summary: string;
  evidence: string;
  aliasExamples: string[];
};

export const telegramBlockedMutationBoundaries = [
  "Approve campaigns",
  "Dispatch calls or outreach",
  "Change billing or plan state",
  "Configure providers or deployment secrets",
] as const;

const telegramNotificationDeliveryStatuses = [
  "queued",
  "previewed",
  "blocked",
  "unavailable",
  "failed",
  "error",
] as const satisfies readonly TelegramNotificationDeliveryStatus[];

const commandDescriptions: Record<TelegramCommand, Omit<TelegramCommandView, "command">> = {
  status: {
    label: "Workspace status",
    mode: "read_only",
    summary: "Returns workspace posture, binding state, and high-level blockers.",
    evidence: "Audited status response only",
    aliasExamples: ["workspace status", "how are we doing"],
  },
  brief: {
    label: "Operator brief",
    mode: "read_only",
    summary: "Summarizes approvals, provider blockers, pipeline, meetings, and next actions.",
    evidence: "No workspace mutation",
    aliasExamples: ["what needs attention", "what should I do next"],
  },
  approvals: {
    label: "Approval summary",
    mode: "read_only",
    summary: "Shows pending proposal counts and review posture for eligible operators.",
    evidence: "Approval Inbox remains in-app",
    aliasExamples: ["pending approvals", "review queue"],
  },
  providers: {
    label: "Provider readiness",
    mode: "read_only",
    summary: "Reports configured, guarded, missing, or blocked provider readiness.",
    evidence: "No browser-entered secrets",
    aliasExamples: ["provider readiness", "integration status"],
  },
  suppressions: {
    label: "Suppression check",
    mode: "read_only",
    summary: "Surfaces suppression posture before email, call, SMS, or social dispatch.",
    evidence: "Dispatch still checks server gates",
    aliasExamples: ["suppression status", "do not contact"],
  },
  sequence: {
    label: "Sequence readiness",
    mode: "read_only",
    summary: "Returns outreach sequence readiness without creating campaigns or provider work.",
    evidence: "Planning summary only",
    aliasExamples: ["next outreach steps", "show outreach plan"],
  },
  forecast: {
    label: "Revenue forecast",
    mode: "read_only",
    summary: "Shows stage-weighted pipeline and target-gap planning guidance.",
    evidence: "Scenario, not a closed-revenue promise",
    aliasExamples: ["show me the forecast", "pipeline gap"],
  },
  help: {
    label: "Command help",
    mode: "read_only",
    summary: "Lists supported commands and their safe execution boundaries.",
    evidence: "Uses the same allowlist",
    aliasExamples: ["what can you do", "commands"],
  },
  pause: {
    label: "Pause proposal",
    mode: "approval_gated",
    summary: "Creates a pending Approval Inbox proposal instead of changing outreach directly.",
    evidence: "Owner/admin review required",
    aliasExamples: ["pause outreach", "request pause"],
  },
};

export function buildTelegramCommandViews(
  commands: readonly TelegramCommand[] = telegramDefaultAllowedCommands,
) {
  return commands.map((command) => ({
    command,
    ...commandDescriptions[command],
  }));
}

export function getTelegramCommandsByMode(commands?: readonly TelegramCommand[]) {
  const views = buildTelegramCommandViews(commands);

  return {
    readOnly: views.filter((command) => command.mode === "read_only"),
    approvalGated: views.filter((command) => command.mode === "approval_gated"),
  };
}

function normalizeTelegramNotificationDeliveryStatus(
  value: string | undefined,
): TelegramNotificationDeliveryStatus | null {
  if (
    telegramNotificationDeliveryStatuses.includes(
      value as TelegramNotificationDeliveryStatus,
    )
  ) {
    return value as TelegramNotificationDeliveryStatus;
  }

  return null;
}

function notificationDeliveryLabel(status: TelegramNotificationDeliveryStatus) {
  if (status === "queued") {
    return "Queued";
  }

  if (status === "previewed") {
    return "Preview generated";
  }

  if (status === "blocked") {
    return "Blocked";
  }

  if (status === "unavailable") {
    return "Unavailable";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Error";
}

function notificationDeliveryTone(status: TelegramNotificationDeliveryStatus) {
  if (status === "queued" || status === "previewed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  if (status === "blocked" || status === "unavailable") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-rose-200 bg-rose-50 text-rose-900";
}

export function buildTelegramNotificationDeliveryStatusView(input: {
  status?: string;
  mode?: string;
  message?: string;
  notificationType?: string;
  chatIdMask?: string;
  auditEventId?: string;
}) {
  const status = normalizeTelegramNotificationDeliveryStatus(input.status);

  if (!status) {
    return null;
  }

  return {
    status,
    mode: input.mode?.trim() || status,
    label: notificationDeliveryLabel(status),
    tone: notificationDeliveryTone(status),
    message:
      input.message?.trim() ||
      "Telegram notification test completed with the current delivery guardrails.",
    notificationType: input.notificationType?.trim() || "operator_brief",
    chatIdMask: input.chatIdMask?.trim() || "Not available",
    auditEventId: input.auditEventId?.trim() || "Pending audit evidence",
    guardrail:
      "This test result is summary-only; it did not approve work, dispatch outreach, change billing, configure providers, or run AI-worker tools.",
  };
}
