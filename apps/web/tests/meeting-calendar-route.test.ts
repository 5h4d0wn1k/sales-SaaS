import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));

  const route = await import("../app/api/meetings/[id]/calendar/route");
  return {
    ...route,
    fetchMock,
  };
}

const routeContext = {
  params: Promise.resolve({
    id: "meet_1",
  }),
};

const calendarResponse = {
  surface: "meeting-calendar-handoff",
  version: "2026-06-04.meeting-calendar-handoff",
  generatedAt: "2026-06-04T12:00:00.000Z",
  ready: true,
  blockers: [],
  workspace: {
    name: "Growth OS",
    planKey: "pro",
  },
  meeting: {
    id: "meet_1",
    leadId: "lead_1",
    status: "scheduled",
    scheduledFor: "2026-06-05T10:00:00.000Z",
    durationMinutes: 30,
    owner: "sales-ops",
    title: "Sales meeting: Nina Carter - Growth OS",
    description: "Lead: Nina Carter",
    location: "Phone: +15550101010",
    attendeeEmail: "nina@example.com",
    attendeePhone: "+15550101010",
    leadName: "Nina Carter",
    company: "VectrCloud",
  },
  links: [
    {
      provider: "google",
      label: "Google Calendar",
      href: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    },
  ],
  ics: {
    filename: "nina-carter-meet-1.ics",
    contentType: "text/calendar; charset=utf-8",
    content: "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n",
  },
  guardrails: [
    "Calendar handoff is operator-triggered and does not auto-contact the lead.",
  ],
  unavailableClaims: [
    "Autonomous scheduling, calendar-provider sync, reminders, and lead attendance guarantees are not available.",
  ],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("meeting calendar proxy route", () => {
  it("returns an ICS attachment from the server API handoff", async () => {
    const { GET, fetchMock } = await loadRoute(
      new Response(JSON.stringify(calendarResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/meetings/meet_1/calendar") as NextRequest,
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="nina-carter-meet-1.ics"',
    );
    await expect(response.text()).resolves.toContain("BEGIN:VCALENDAR");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/meetings/meet_1/calendar",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("returns a safe conflict when the handoff is not calendar-ready", async () => {
    const { GET } = await loadRoute(
      new Response(
        JSON.stringify({
          ...calendarResponse,
          ready: false,
          blockers: ["Meeting status is completed; calendar handoff is only available for pending or scheduled meetings."],
          links: [],
          ics: null,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    const response = await GET(
      new Request("http://localhost/api/meetings/meet_1/calendar") as NextRequest,
      routeContext,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Meeting status is completed; calendar handoff is only available for pending or scheduled meetings.",
    });
  });

  it("propagates server API errors without returning a calendar file", async () => {
    const { GET } = await loadRoute(
      new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/meetings/meet_1/calendar") as NextRequest,
      routeContext,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Meeting not found",
    });
  });
});
