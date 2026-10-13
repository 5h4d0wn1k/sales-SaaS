import { describe, expect, it } from "vitest";
import {
  buildTelegramCommandCenterContactUrl,
  buildTelegramCommandCenterGetStartedUrl,
  buildTelegramCommandCenterPricingUrl,
  formatTelegramCommandCenterContactMessage,
  parseTelegramCommandCenterContactContext,
} from "../lib/telegram-command-center-context";

describe("telegram command center context", () => {
  it("builds attributed telegram command-center URLs", () => {
    expect(buildTelegramCommandCenterContactUrl("rollout_review")).toBe(
      "/contact?intent=managed_services&utm_source=telegram_sales_command_center&utm_medium=seo_landing&utm_campaign=telegram_command_center&telegramIntent=rollout_review",
    );
    expect(buildTelegramCommandCenterGetStartedUrl("policy_review")).toBe(
      "/get-started?utm_source=telegram_sales_command_center&utm_medium=seo_landing&utm_campaign=telegram_command_center&telegramIntent=policy_review",
    );
    expect(buildTelegramCommandCenterPricingUrl()).toBe(
      "/pricing?utm_source=telegram_sales_command_center&utm_medium=seo_landing&utm_campaign=telegram_command_center&telegramIntent=pricing_review",
    );
  });

  it("parses telegram command-center acquisition context", () => {
    const context = parseTelegramCommandCenterContactContext({
      utm_source: "telegram_sales_command_center",
      telegramIntent: "bot_setup",
    });

    expect(context).toMatchObject({
      label: "Telegram sales command center",
      intent: "bot_setup",
      intentLabel: "Bot setup",
      sourcePath: "/telegram-sales-command-center",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 500,
    });
    expect(context?.channels).toEqual(expect.arrayContaining(["telegram", "email", "call"]));
    expect(context?.goals).toEqual(
      expect.arrayContaining([
        "Connect Telegram command center",
        "Launch approval-gated outreach",
        "Add managed rollout support",
      ]),
    );
  });

  it("keeps the formatted intake message claim-safe", () => {
    const context = parseTelegramCommandCenterContactContext({
      utm_source: "telegram_sales_command_center",
      telegramIntent: "surprise",
    });

    expect(context?.intent).toBe("bot_setup");

    const message = formatTelegramCommandCenterContactMessage(context!);

    expect(message).toContain("Telegram sales command center context attached for review");
    expect(message).toContain("Intent: Bot setup");
    expect(message).toContain("approval-gated pause proposals");
    expect(message).toContain("No campaign approval");
    expect(message.toLowerCase()).not.toContain("fully autonomous");
    expect(message.toLowerCase()).not.toContain("guaranteed revenue");
  });

  it("ignores unsupported acquisition sources", () => {
    expect(
      parseTelegramCommandCenterContactContext({
        utm_source: "integration_catalog",
        telegramIntent: "bot_setup",
      }),
    ).toBeNull();
  });
});
