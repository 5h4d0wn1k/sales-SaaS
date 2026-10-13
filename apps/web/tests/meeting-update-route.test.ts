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

  const route = await import("../app/api/meetings/[id]/update/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/meetings/meet_1/update", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const routeContext = {
  params: Promise.resolve({
    id: "meet_1",
  }),
};

const meetingBody = {
  id: "meet_1",
  leadId: "lead_1",
  status: "completed",
  scheduledFor: "2026-06-03T10:30:00.000Z",
  owner: "sales-ops",
  notes: "Meeting completed with clear next steps.",
  dealValueCents: 1250000,
  dealCurrency: "USD",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("meeting update proxy route", () => {
  it("updates a meeting outcome through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(meetingBody), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      status: "completed",
      notes: "Meeting completed with clear next steps.",
      dealValue: "12500",
      dealCurrency: "USD",
    }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("meetingStatus")).toBe("updated");
    expect(location.searchParams.get("meetingMessage")).toBe("Meeting marked completed.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/meetings/meet_1",
      expect.objectContaining({
        method: "PATCH",
        cache: "no-store",
        body: JSON.stringify({
          status: "completed",
          notes: "Meeting completed with clear next steps.",
          dealValueCents: 1250000,
          dealCurrency: "USD",
        }),
      }),
    );
  });

  it("reports server update errors back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(JSON.stringify({ error: "Meeting not found" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      status: "completed",
      notes: "Meeting completed with clear next steps.",
    }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("meetingStatus")).toBe("error");
    expect(location.searchParams.get("meetingMessage")).toBe("Meeting not found");
  });
});
