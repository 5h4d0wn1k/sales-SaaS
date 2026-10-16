import { afterEach, describe, expect, it } from "vitest";
import {
  actionProposalListResponseSchema,
  telegramIntegrationResponseSchema,
  telegramWebhookResponseSchema,
} from "@sales/shared";
import { createApp } from "../src/app";
import { parseTelegramCommand, resetTelegramCommandRateLimits } from "../src/telegram";

const previousEnv = {
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  ALLOW_TEST_AUTH_BYPASS: process.env.ALLOW_TEST_AUTH_BYPASS,
  TELEGRAM_COMMAND_RATE_LIMIT_MAX: process.env.TELEGRAM_COMMAND_RATE_LIMIT_MAX,
  TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS:
    process.env.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS,
};

afterEach(() => {
  resetTelegramCommandRateLimits();

  if (previousEnv.TELEGRAM_WEBHOOK_SECRET === undefined) {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  } else {
    process.env.TELEGRAM_WEBHOOK_SECRET = previousEnv.TELEGRAM_WEBHOOK_SECRET;
  }

  if (previousEnv.TELEGRAM_BOT_TOKEN === undefined) {
    delete process.env.TELEGRAM_BOT_TOKEN;
  } else {
    process.env.TELEGRAM_BOT_TOKEN = previousEnv.TELEGRAM_BOT_TOKEN;
  }

  if (previousEnv.ALLOW_TEST_AUTH_BYPASS === undefined) {
    delete process.env.ALLOW_TEST_AUTH_BYPASS;
  } else {
    process.env.ALLOW_TEST_AUTH_BYPASS = previousEnv.ALLOW_TEST_AUTH_BYPASS;
  }

  if (previousEnv.TELEGRAM_COMMAND_RATE_LIMIT_MAX === undefined) {
    delete process.env.TELEGRAM_COMMAND_RATE_LIMIT_MAX;
  } else {
    process.env.TELEGRAM_COMMAND_RATE_LIMIT_MAX = previousEnv.TELEGRAM_COMMAND_RATE_LIMIT_MAX;
  }

  if (previousEnv.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS === undefined) {
    delete process.env.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS;
  } else {
    process.env.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS =
      previousEnv.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS;
  }
});

async function configureTelegram(
  chatId: string,
  allowedCommands = [
    "status",
    "brief",
    "approvals",
    "providers",
    "suppressions",
    "sequence",
    "forecast",
    "help",
    "pause",
  ],
) {
  const app = createApp();
  const response = await app.request("/v1/integrations/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      botUsername: "@salesxgrowth_ops_bot",
      chatId,
      allowedCommands,
    }),
  });

  return {
    app,
    response,
    body: telegramIntegrationResponseSchema.parse(await response.json()),
  };
}

function telegramUpdate(chatId: string, text: string, updateId = 1001) {
  return {
    update_id: updateId,
    message: {
      message_id: 44,
      text,
      chat: {
        id: chatId,
      },
      from: {
        id: 77,
        username: "ops_admin",
        first_name: "Ops",
      },
    },
  };
}

describe("Telegram command center integration", () => {
  it("maps deterministic natural-language aliases to safe Telegram commands", () => {
    expect(parseTelegramCommand("what needs attention?")).toBe("brief");
    expect(parseTelegramCommand("show me the forecast")).toBe("forecast");
    expect(parseTelegramCommand("next outreach steps")).toBe("sequence");
    expect(parseTelegramCommand("pending approvals")).toBe("approvals");
    expect(parseTelegramCommand("provider readiness")).toBe("providers");
    expect(parseTelegramCommand("pause outreach")).toBe("pause");
    expect(parseTelegramCommand("approve campaign now")).toBeNull();
  });

  it("returns not-configured state before a workspace chat is bound", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const app = createApp();
    const response = await app.request("/v1/integrations/telegram");
    const body = telegramIntegrationResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.integration.status).toBe("not_configured");
    expect(body.integration.chatIdMask).toBeNull();
    expect(body.deployment).toEqual({
      botTokenConfigured: false,
      webhookSecretConfigured: false,
    });
  });

  it("binds a chat without exposing raw Telegram secrets or raw chat IDs", async () => {
    const { response, body } = await configureTelegram("-1001234567890");

    expect(response.status).toBe(201);
    expect(body.integration).toMatchObject({
      status: "pending_verification",
      botUsername: "@salesxgrowth_ops_bot",
      chatIdMask: "-1***7890",
    });
    expect(JSON.stringify(body)).not.toContain("-1001234567890");
    expect(body.liveCommands).toEqual([
      "status",
      "brief",
      "approvals",
      "providers",
      "suppressions",
      "sequence",
      "forecast",
      "help",
      "pause",
    ]);
    expect(body.plannedCommands).toEqual([]);
  });

  it("rejects Telegram webhooks without the configured secret header", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    const { app } = await configureTelegram("-1001234567001");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(telegramUpdate("-1001234567001", "/status")),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      ok: false,
      verified: false,
      result: "denied",
    });
  });

  it("answers read-only status commands and records activation audit", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567002");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567002", "/status")),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "status",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("qualified leads");

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.integration.status).toBe("active");
    expect(integration.integration.lastUpdateId).toBe(1001);
    expect(integration.recentCommands[0]).toMatchObject({
      command: "status",
      result: "success",
    });
  });

  it("answers read-only sequence commands without creating provider work", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567020");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567020", "/sequence", 1101)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "sequence",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("Sequence:");
    expect(body.reply).toContain("No send, call, SMS, social action, campaign, or provider mutation was created.");

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "sequence",
      result: "success",
    });
  });

  it("answers read-only brief commands without mutating workspace state", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567022");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567022", "/brief", 1103)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "brief",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("Brief:");
    expect(body.reply).toContain("pending approval");
    expect(body.reply).toContain(
      "No approval, outreach, billing, provider, AI-worker, or workspace mutation was performed.",
    );

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "brief",
      result: "success",
    });
  });

  it("answers natural-language brief aliases through the same audited command path", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567023");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567023", "what needs attention?", 1104)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "brief",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("Brief:");

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "brief",
      result: "success",
    });
  });

  it("keeps natural-language aliases behind the workspace command allowlist", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567024", [
      "status",
      "brief",
      "approvals",
      "providers",
      "suppressions",
      "sequence",
      "help",
      "pause",
    ]);

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567024", "show me the forecast", 1105)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      verified: true,
      command: "forecast",
      result: "denied",
      messageSent: false,
    });
    expect(body.reply).toContain("Command /forecast is not enabled");
  });

  it("answers read-only forecast commands without creating provider or billing work", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567021");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567021", "/forecast", 1102)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "forecast",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("Forecast:");
    expect(body.reply).toContain("Weighted pipeline");
    expect(body.reply).toContain("No outreach, scheduling, billing, or provider work was triggered.");

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "forecast",
      result: "success",
    });
  });

  it("answers provider readiness commands across billing, webhooks, and chat without mutating setup", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    delete process.env.TELEGRAM_BOT_TOKEN;
    const { app } = await configureTelegram("-1001234567025");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567025", "provider readiness", 1106)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      verified: true,
      command: "providers",
      result: "success",
      messageSent: false,
    });
    expect(body.reply).toContain("sources, outreach, voice, billing, webhooks, and chat");
    expect(body.reply).toContain("billing ");
    expect(body.reply).toContain("webhooks ");
    expect(body.reply).toContain("chat ");
    expect(body.reply).toContain("No provider, billing, webhook, or chat configuration changed.");

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "providers",
      result: "success",
    });
  });

  it("rejects duplicate Telegram updates as replayed commands", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    const { app } = await configureTelegram("-1001234567004");
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567004", "/status", 9001)),
    };

    const firstResponse = await app.request("/v1/webhooks/telegram", request);
    const replayResponse = await app.request("/v1/webhooks/telegram", request);
    const replay = telegramWebhookResponseSchema.parse(await replayResponse.json());

    expect(firstResponse.status).toBe(200);
    expect(replayResponse.status).toBe(200);
    expect(replay).toMatchObject({
      ok: false,
      command: "status",
      result: "denied",
    });
    expect(replay.detail).toContain("replay");
  });

  it("keeps pause commands approval-gated from Telegram", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    const { app } = await configureTelegram("-1001234567003");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567003", "/pause")),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      command: "pause",
      result: "requires_approval",
    });
    expect(body.reply).toContain("recorded as approval");

    const proposalsResponse = await app.request("/v1/action-proposals?status=pending");
    const proposals = actionProposalListResponseSchema.parse(await proposalsResponse.json());
    expect(proposals.proposals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "telegram_pause",
          proposedBy: "telegram",
          status: "pending",
        }),
      ]),
    );
  });

  it("rate-limits repeated Telegram commands before creating extra proposals", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    process.env.TELEGRAM_COMMAND_RATE_LIMIT_MAX = "1";
    process.env.TELEGRAM_COMMAND_RATE_LIMIT_WINDOW_SECONDS = "60";
    const { app } = await configureTelegram("-1001234567010");
    const headers = {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "telegram-secret-test",
    };
    const initialProposalsResponse = await app.request("/v1/action-proposals?status=pending");
    const initialProposals = actionProposalListResponseSchema.parse(
      await initialProposalsResponse.json(),
    );
    const initialTelegramPauseCount = initialProposals.proposals.filter(
      (proposal) => proposal.type === "telegram_pause",
    ).length;

    const firstResponse = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers,
      body: JSON.stringify(telegramUpdate("-1001234567010", "/pause", 9201)),
    });
    const limitedResponse = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers,
      body: JSON.stringify(telegramUpdate("-1001234567010", "/pause", 9202)),
    });
    const first = telegramWebhookResponseSchema.parse(await firstResponse.json());
    const limited = telegramWebhookResponseSchema.parse(await limitedResponse.json());

    expect(firstResponse.status).toBe(200);
    expect(first).toMatchObject({
      ok: true,
      command: "pause",
      result: "requires_approval",
    });
    expect(limitedResponse.status).toBe(200);
    expect(limitedResponse.headers.get("Retry-After")).toBe("60");
    expect(limited).toMatchObject({
      ok: false,
      command: "pause",
      result: "denied",
      messageSent: false,
    });
    expect(limited.detail).toContain("rate limit");

    const proposalsResponse = await app.request("/v1/action-proposals?status=pending");
    const proposals = actionProposalListResponseSchema.parse(await proposalsResponse.json());
    expect(
      proposals.proposals.filter((proposal) => proposal.type === "telegram_pause"),
    ).toHaveLength(initialTelegramPauseCount + 1);

    const integrationResponse = await app.request("/v1/integrations/telegram");
    const integration = telegramIntegrationResponseSchema.parse(await integrationResponse.json());
    expect(integration.recentCommands[0]).toMatchObject({
      command: "pause",
      result: "denied",
    });
  });

  it("lets admins disable Telegram command access without deleting the binding", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "telegram-secret-test";
    const { app } = await configureTelegram("-1001234567005");

    const disableResponse = await app.request("/v1/integrations/telegram/disable", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });
    const disabled = telegramIntegrationResponseSchema.parse(await disableResponse.json());

    expect(disableResponse.status).toBe(200);
    expect(disabled.integration.status).toBe("disabled");
    expect(disabled.integration.chatIdMask).toBe("-1***7005");

    const response = await app.request("/v1/webhooks/telegram", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "telegram-secret-test",
      },
      body: JSON.stringify(telegramUpdate("-1001234567005", "/status", 9101)),
    });
    const body = telegramWebhookResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: false,
      result: "denied",
    });
    expect(body.reply).toContain("disabled");
  });
});
