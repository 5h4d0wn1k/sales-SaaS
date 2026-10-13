import { describe, expect, it } from "vitest";
import {
  buildTelegramNotificationDeliveryStatusView,
  buildTelegramCommandViews,
  getTelegramCommandsByMode,
  telegramBlockedMutationBoundaries,
} from "../lib/telegram-settings";

describe("telegram settings command view model", () => {
  it("separates read-only observability commands from approval-gated pause proposals", () => {
    const grouped = getTelegramCommandsByMode();

    expect(grouped.readOnly.map((command) => command.command)).toEqual(
      expect.arrayContaining(["brief", "sequence", "forecast"]),
    );
    expect(grouped.approvalGated.map((command) => command.command)).toEqual(["pause"]);

    for (const command of grouped.readOnly) {
      expect(command.mode).toBe("read_only");
      expect(command.summary.toLowerCase()).not.toContain("change outreach");
      expect(command.summary.toLowerCase()).not.toContain("approve campaign");
    }

    expect(grouped.approvalGated[0]).toMatchObject({
      command: "pause",
      mode: "approval_gated",
      evidence: "Owner/admin review required",
      aliasExamples: ["pause outreach", "request pause"],
    });
    expect(grouped.approvalGated[0]?.summary).toContain("Approval Inbox proposal");
  });

  it("surfaces practical deterministic alias examples for customer-facing setup", () => {
    const grouped = getTelegramCommandsByMode();

    expect(grouped.readOnly.find((command) => command.command === "brief")?.aliasExamples).toEqual(
      expect.arrayContaining(["what needs attention", "what should I do next"]),
    );
    expect(grouped.readOnly.find((command) => command.command === "sequence")?.aliasExamples).toEqual(
      expect.arrayContaining(["next outreach steps", "show outreach plan"]),
    );
    expect(grouped.readOnly.find((command) => command.command === "forecast")?.aliasExamples).toEqual(
      expect.arrayContaining(["show me the forecast", "pipeline gap"]),
    );
  });

  it("documents mutation boundaries that Telegram cannot cross", () => {
    expect(telegramBlockedMutationBoundaries).toEqual([
      "Approve campaigns",
      "Dispatch calls or outreach",
      "Change billing or plan state",
      "Configure providers or deployment secrets",
    ]);
  });

  it("keeps deterministic aliases tied to known commands only", () => {
    const views = buildTelegramCommandViews(["status", "help", "pause"]);

    expect(views).toEqual([
      expect.objectContaining({
        command: "status",
        mode: "read_only",
        aliasExamples: expect.arrayContaining(["workspace status"]),
      }),
      expect.objectContaining({
        command: "help",
        mode: "read_only",
        aliasExamples: expect.arrayContaining(["what can you do"]),
      }),
      expect.objectContaining({
        command: "pause",
        mode: "approval_gated",
      }),
    ]);
  });

  it("keeps Telegram notification delivery states distinct for settings evidence", () => {
    expect(
      buildTelegramNotificationDeliveryStatusView({
        status: "previewed",
        mode: "preview",
        message: "Preview generated.",
        notificationType: "operator_brief",
        chatIdMask: "-1***7890",
      }),
    ).toMatchObject({
      status: "previewed",
      mode: "preview",
      label: "Preview generated",
      chatIdMask: "-1***7890",
    });

    expect(
      buildTelegramNotificationDeliveryStatusView({
        status: "blocked",
        mode: "blocked",
        message: "Target chat mismatch.",
      }),
    ).toMatchObject({
      status: "blocked",
      label: "Blocked",
      auditEventId: "Pending audit evidence",
    });

    expect(
      buildTelegramNotificationDeliveryStatusView({
        status: "unavailable",
        mode: "unavailable",
      }),
    ).toMatchObject({
      status: "unavailable",
      label: "Unavailable",
    });

    expect(
      buildTelegramNotificationDeliveryStatusView({
        status: "queued",
        mode: "queued",
      }),
    ).not.toMatchObject({
      status: "blocked",
    });
  });
});
