import { createHash, timingSafeEqual } from "node:crypto";
import { telegramCommandSchema, type TelegramCommand } from "@sales/shared";

export type TelegramMessageContext = {
  updateId: number | null;
  chatId: string;
  text: string;
  actor: string;
};

type TelegramCommandRateLimitRecord = {
  count: number;
  resetAt: number;
};

export type TelegramCommandRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds: number;
  detail: string;
};

const telegramCommandRateLimitStore = new Map<string, TelegramCommandRateLimitRecord>();

function positiveIntegerFromEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function hashTelegramChatId(chatId: string) {
  return createHash("sha256").update(chatId.trim()).digest("hex");
}

export function maskTelegramChatId(chatId: string) {
  const trimmed = chatId.trim();

  if (trimmed.length <= 4) {
    return `***${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 2)}***${trimmed.slice(-4)}`;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyTelegramNotificationSchedulerSecret(input: {
  authorization?: string | null;
  schedulerSecretHeader?: string | null;
}) {
  const expected = process.env.TELEGRAM_NOTIFICATION_SCHEDULER_SECRET?.trim();

  if (!expected) {
    return {
      verified: false,
      status: 503 as const,
      detail: "TELEGRAM_NOTIFICATION_SCHEDULER_SECRET is not configured.",
    };
  }

  const bearerToken = input.authorization?.startsWith("Bearer ")
    ? input.authorization.slice("Bearer ".length).trim()
    : null;
  const provided = input.schedulerSecretHeader?.trim() || bearerToken;

  if (!provided || !safeCompare(provided, expected)) {
    return {
      verified: false,
      status: 401 as const,
      detail: "Telegram notification scheduler secret verification failed.",
    };
  }

  return {
    verified: true,
    status: 200 as const,
    detail: "Telegram notification scheduler secret verified.",
  };
}

export function verifyTelegramWebhookSecret(headerValue: string | null | undefined) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return {
      verified: false,
      detail: "TELEGRAM_WEBHOOK_SECRET is not configured.",
    };
  }

  if (!headerValue || !safeCompare(headerValue, expected)) {
    return {
      verified: false,
      detail: "Telegram webhook secret verification failed.",
    };
  }

  return {
    verified: true,
    detail: "Telegram webhook secret verified.",
  };
}

export function telegramDeploymentState() {
  return {
    botTokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    webhookSecretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
  };
}

export function telegramCommandRateLimitConfig() {
  const limit = positiveIntegerFromEnv("TELEGRAM_COMMAND_RATE_LIMIT_MAX", 12);
  const windowSeconds = positiveIntegerFromEnv(
    "TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS",
    60,
  );

  return {
    limit,
    windowSeconds,
    windowMs: windowSeconds * 1000,
  };
}

export function checkTelegramCommandRateLimit(
  chatIdHash: string,
  now = Date.now(),
): TelegramCommandRateLimitResult {
  const { limit, windowSeconds, windowMs } = telegramCommandRateLimitConfig();
  const existing = telegramCommandRateLimitStore.get(chatIdHash);

  if (!existing || now >= existing.resetAt) {
    telegramCommandRateLimitStore.set(chatIdHash, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: 0,
      windowSeconds,
      detail: `Telegram command rate limit allows ${limit} command${limit === 1 ? "" : "s"} per ${windowSeconds} seconds.`,
    };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfterSeconds,
      windowSeconds,
      detail: `Telegram command rate limit reached for this chat. Retry after ${retryAfterSeconds} seconds.`,
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: 0,
    windowSeconds,
    detail: `Telegram command rate limit allows ${limit} command${limit === 1 ? "" : "s"} per ${windowSeconds} seconds.`,
  };
}

export function resetTelegramCommandRateLimits() {
  telegramCommandRateLimitStore.clear();
}

export function extractTelegramMessage(payload: unknown): TelegramMessageContext | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const update = payload as {
    update_id?: unknown;
    message?: unknown;
    edited_message?: unknown;
    channel_post?: unknown;
  };
  const message = update.message ?? update.edited_message ?? update.channel_post;

  if (!message || typeof message !== "object") {
    return null;
  }

  const candidate = message as {
    text?: unknown;
    caption?: unknown;
    chat?: { id?: unknown; title?: unknown; username?: unknown };
    from?: { id?: unknown; username?: unknown; first_name?: unknown; last_name?: unknown };
  };
  const chatId = candidate.chat?.id;

  if (typeof chatId !== "string" && typeof chatId !== "number") {
    return null;
  }

  const rawText = typeof candidate.text === "string"
    ? candidate.text
    : typeof candidate.caption === "string"
      ? candidate.caption
      : "";
  const actorParts = [
    candidate.from?.username ? `@${candidate.from.username}` : null,
    candidate.from?.first_name,
    candidate.from?.last_name,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return {
    updateId: typeof update.update_id === "number" ? update.update_id : null,
    chatId: String(chatId),
    text: rawText.trim(),
    actor: actorParts.length > 0 ? actorParts.join(" ") : String(candidate.from?.id ?? "telegram-user"),
  };
}

const telegramCommandAliases: Array<{
  command: TelegramCommand;
  phrases: string[];
}> = [
  {
    command: "brief",
    phrases: [
      "brief",
      "daily brief",
      "operator brief",
      "ops brief",
      "give me the brief",
      "what needs attention",
      "what is happening",
      "what next",
      "what should i do",
      "what should i do next",
      "workspace summary",
      "summary",
    ],
  },
  {
    command: "forecast",
    phrases: [
      "forecast",
      "revenue forecast",
      "pipeline forecast",
      "show forecast",
      "show me forecast",
      "show me the forecast",
      "show revenue forecast",
      "what is the forecast",
      "pipeline gap",
      "target gap",
      "revenue gap",
    ],
  },
  {
    command: "sequence",
    phrases: [
      "sequence",
      "sequence plan",
      "outreach sequence",
      "show sequence",
      "show me sequence",
      "show me the sequence",
      "show outreach plan",
      "outreach plan",
      "next outreach steps",
    ],
  },
  {
    command: "approvals",
    phrases: [
      "approvals",
      "approval queue",
      "pending approvals",
      "pending proposals",
      "review queue",
      "show approvals",
    ],
  },
  {
    command: "providers",
    phrases: [
      "providers",
      "provider status",
      "provider readiness",
      "integration status",
      "integrations status",
    ],
  },
  {
    command: "suppressions",
    phrases: [
      "suppressions",
      "suppression status",
      "unsubscribe status",
      "do not contact",
      "dnc status",
    ],
  },
  {
    command: "status",
    phrases: [
      "status",
      "workspace status",
      "dashboard status",
      "show status",
      "how are we doing",
    ],
  },
  {
    command: "help",
    phrases: [
      "help",
      "commands",
      "what can you do",
      "what can i ask",
    ],
  },
  {
    command: "pause",
    phrases: [
      "pause",
      "pause outreach",
      "pause campaigns",
      "request pause",
      "stop outreach",
    ],
  },
];

function normalizeTelegramCommandText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTelegramCommand(text: string): TelegramCommand | null {
  const trimmed = text.trim();
  const commandToken = trimmed.split(/\s+/)[0] ?? "";
  const normalized = commandToken.replace(/^\/+/, "").split("@")[0]?.toLowerCase() ?? "";
  const parsed = telegramCommandSchema.safeParse(normalized);

  if (parsed.success && commandToken.startsWith("/")) {
    return parsed.data;
  }

  const normalizedText = normalizeTelegramCommandText(trimmed);
  const alias = telegramCommandAliases.find((item) =>
    item.phrases.some((phrase) => normalizedText === phrase || normalizedText.startsWith(`${phrase} `)),
  );

  return alias?.command ?? (parsed.success ? parsed.data : null);
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      sent: false,
      detail: "TELEGRAM_BOT_TOKEN is not configured.",
    };
  }

  if (process.env.NODE_ENV === "test") {
    return {
      sent: false,
      detail: "Telegram message delivery skipped in tests.",
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    return {
      sent: response.ok,
      detail: response.ok
        ? "Telegram message sent."
        : `Telegram message failed with status ${response.status}.`,
    };
  } catch (error) {
    console.error("Telegram message delivery failed:", error);
    return {
      sent: false,
      detail: "Telegram message delivery failed.",
    };
  }
}

export async function sendTelegramReply(chatId: string, reply: string) {
  const delivery = await sendTelegramMessage(chatId, reply);

  return {
    sent: delivery.sent,
    detail: delivery.detail.replace("message", "reply"),
  };
}
