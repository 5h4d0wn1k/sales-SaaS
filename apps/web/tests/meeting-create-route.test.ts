import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
      "content-type": "application/json",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));
  vi.doMock("@/lib/return-to", async () => import("../lib/return-to"));

  const route = await import("../app/api/meetings/create/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/meetings/create", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const meetingBody = {
  id: "meet_1",
  leadId: "lead_1",
  status: "scheduled",
  scheduledFor: "2026-06-03T10:30:00.000Z",
  owner: "sales-ops",
  notes: "Manual meeting booked from dashboard conversion workflow.",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("meeting create proxy route", () => {
  it("schedules a meeting through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(meetingBody), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      leadId: "lead_1",
      scheduledFor: "2026-06-03T10:30:00.000Z",
      owner: "sales-ops",
      notes: "Manual meeting booked from dashboard conversion workflow.",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("meetingStatus")).toBe("created");
    expect(location.searchParams.get("meetingMessage")).toBe("Meeting scheduled for sales-ops.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/meetings",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          leadId: "lead_1",
          scheduledFor: "2026-06-03T10:30:00.000Z",
          owner: "sales-ops",
          notes: "Manual meeting booked from dashboard conversion workflow.",
        }),
      }),
    );
  });

  it("reports server scheduling errors back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      leadId: "missing",
      scheduledFor: "2026-06-03T10:30:00.000Z",
      owner: "sales-ops",
      notes: "Manual meeting booked from dashboard conversion workflow.",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("meetingStatus")).toBe("error");
    expect(location.searchParams.get("meetingMessage")).toBe("Lead not found");
  });
});
