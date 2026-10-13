import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardResponseSchema, meetingCalendarHandoffResponseSchema } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
});

async function loadAppWithAuth(role: "owner" | "admin" | "member") {
  vi.resetModules();
  vi.doMock("../src/middleware/auth", async () => {
    const actual = await vi.importActual<typeof import("../src/middleware/auth")>(
      "../src/middleware/auth",
    );

    return {
      ...actual,
      authMiddleware: async (c: any, next: () => Promise<void>) => {
        c.set("user", {
          id: "user-meeting-calendar",
          email: `${role}@example.com`,
          name: `${role} user`,
          role,
          emailVerified: true,
          organizationId: "org-meeting-calendar",
          workspaceId: "ws-meeting-calendar",
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

describe("meeting calendar handoff route", () => {
  it("returns calendar links and ICS content for a workspace meeting", async () => {
    const app = await loadAppWithAuth("member");
    const dashboardResponse = await app.request("/v1/dashboard");
    const dashboard = dashboardResponseSchema.parse(await dashboardResponse.json());
    const meetingId = dashboard.meetings[0]?.id;

    expect(meetingId).toBeTruthy();

    const response = await app.request(`/v1/meetings/${meetingId}/calendar`);
    const body = meetingCalendarHandoffResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.surface).toBe("meeting-calendar-handoff");
    expect(body.meeting.id).toBe(meetingId);
    expect(body.links.map((link) => link.provider)).toEqual(
      expect.arrayContaining(["google", "outlook", "office365"]),
    );
    expect(body.ics?.content).toContain("BEGIN:VCALENDAR");
    expect(body.guardrails).toContain(
      "Calendar handoff is operator-triggered and does not auto-contact the lead.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("returns 404 for unknown meeting ids", async () => {
    const app = await loadAppWithAuth("member");
    const response = await app.request("/v1/meetings/missing/calendar");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Meeting not found",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("requires authentication when the test bypass is disabled", async () => {
    const previousBypass = process.env.ALLOW_TEST_AUTH_BYPASS;
    process.env.ALLOW_TEST_AUTH_BYPASS = "false";
    vi.resetModules();

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/meetings/meeting-1/calendar");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authentication required",
    });

    if (previousBypass === undefined) {
      delete process.env.ALLOW_TEST_AUTH_BYPASS;
    } else {
      process.env.ALLOW_TEST_AUTH_BYPASS = previousBypass;
    }
  }, APP_BOOT_TIMEOUT_MS);
});
