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

  const route = await import("../app/api/campaigns/[id]/approve/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string> = {}) {
  return new Request("http://localhost/api/campaigns/camp_1/approve", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const routeContext = {
  params: Promise.resolve({
    id: "camp_1",
  }),
};

const campaignBody = {
  id: "camp_1",
  name: "Qualified lead first touch",
  channel: "email",
  stage: "approved",
  approved: true,
  firstActionCompleted: false,
  nextActionAt: "Ready now",
  leadsEnrolled: 7,
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("campaign approve proxy route", () => {
  it("approves a campaign through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(campaignBody), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({ returnTo: "/dashboard" }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("campaignStatus")).toBe("approved");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Qualified lead first touch approved for guarded dispatch.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/campaigns/camp_1/approve",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({}),
      }),
    );
  });

  it("reports server approval errors back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "Verify your email before approving outreach.",
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({ returnTo: "/dashboard" }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("campaignStatus")).toBe("error");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Verify your email before approving outreach.",
    );
  });
});
