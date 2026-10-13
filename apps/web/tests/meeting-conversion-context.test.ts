import { describe, expect, it } from "vitest";
import {
  buildMeetingConversionContactUrl,
  buildMeetingConversionGetStartedUrl,
  buildMeetingConversionPricingUrl,
  formatMeetingConversionContactMessage,
  parseMeetingConversionContactContext,
} from "../lib/meeting-conversion-context";

describe("meeting conversion context", () => {
  it("builds attributed meeting conversion URLs", () => {
    expect(buildMeetingConversionContactUrl("conversion_review")).toBe(
      "/contact?intent=managed_services&utm_source=ai_sales_meeting_scheduler&utm_medium=seo_landing&utm_campaign=meeting_conversion&meetingIntent=conversion_review",
    );
    expect(buildMeetingConversionGetStartedUrl("calendar_handoff")).toBe(
      "/get-started?utm_source=ai_sales_meeting_scheduler&utm_medium=seo_landing&utm_campaign=meeting_conversion&meetingIntent=calendar_handoff",
    );
    expect(buildMeetingConversionPricingUrl()).toBe(
      "/pricing?utm_source=ai_sales_meeting_scheduler&utm_medium=seo_landing&utm_campaign=meeting_conversion&meetingIntent=pricing_review",
    );
  });

  it("parses meeting conversion acquisition context", () => {
    const context = parseMeetingConversionContactContext({
      utm_source: "ai_sales_meeting_scheduler",
      meetingIntent: "rollout_review",
    });

    expect(context).toMatchObject({
      label: "AI sales meeting scheduler",
      intent: "rollout_review",
      intentLabel: "Rollout review",
      sourcePath: "/ai-sales-meeting-scheduler",
      budgetRange: "1500_5000",
      monthlyLeadGoal: 400,
      meetingTarget: 40,
    });
    expect(context?.channels).toEqual(expect.arrayContaining(["email", "call", "telegram"]));
    expect(context?.goals).toEqual(
      expect.arrayContaining([
        "Improve meetings and conversion",
        "Launch approval-gated outreach",
        "Connect Telegram command center",
      ]),
    );
  });

  it("keeps the formatted intake message claim-safe", () => {
    const context = parseMeetingConversionContactContext({
      utm_source: "ai_sales_meeting_scheduler",
      meetingIntent: "surprise",
    });

    expect(context?.intent).toBe("conversion_review");

    const message = formatMeetingConversionContactMessage(context!);

    expect(message).toContain("AI sales meeting scheduler context attached for review");
    expect(message).toContain("Intent: Conversion review");
    expect(message).toContain("Meeting target: 40 / month");
    expect(message).toContain("No autonomous scheduling");
    expect(message.toLowerCase()).not.toContain("guaranteed meetings");
    expect(message.toLowerCase()).not.toContain("fully autonomous");
  });

  it("ignores unsupported acquisition sources", () => {
    expect(
      parseMeetingConversionContactContext({
        utm_source: "ai_outbound_sales_automation",
        meetingIntent: "calendar_handoff",
      }),
    ).toBeNull();
  });
});
