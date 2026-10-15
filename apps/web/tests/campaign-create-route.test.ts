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
  vi.doMock("@/lib/upgrade-recommendation", async () =>
    import("../lib/upgrade-recommendation")
  );

  const route = await import("../app/api/campaigns/create/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/campaigns/create", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const campaignBody = {
  campaign: {
    id: "camp_1",
    name: "Qualified lead first touch",
    channel: "email",
    stage: "draft",
    approved: false,
    firstActionCompleted: false,
    nextActionAt: "Approval required before first action",
    leadsEnrolled: 7,
  },
  policy: {
    allowed: false,
    reason: "Approval required before first action",
    nextStage: "draft",
  },
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("@/lib/upgrade-recommendation");
  vi.unstubAllGlobals();
});

describe("campaign create proxy route", () => {
  it("creates a draft campaign through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(campaignBody), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      name: "Qualified lead first touch",
      channel: "email",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("campaignStatus")).toBe("created");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Qualified lead first touch drafted with 7 leads enrolled for approval.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/campaigns",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          name: "Qualified lead first touch",
          channel: "email",
          highRiskChannel: false,
        }),
      }),
    );
  });

  it("carries channel entitlement upgrade recommendations back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "LinkedIn channel is not included in starter.",
          upgrade: {
            planKey: "elite",
            planName: "Elite",
            description: "For teams scaling governed multi-channel outbound",
            checkoutPath: "/get-started?plan=elite",
          },
        }),
        {
          status: 409,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      name: "LinkedIn review campaign",
      channel: "linkedin",
      highRiskChannel: "true",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("campaignStatus")).toBe("error");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "LinkedIn channel is not included in starter.",
    );
    expect(location.searchParams.get("upgradePlan")).toBe("elite");
    expect(location.searchParams.get("upgradeCheckout")).toBe("/get-started?plan=elite");
  });

  it("blocks explicit cross-origin campaign mutations before proxying to the API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(campaignBody), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      name: "Cross-site draft",
      channel: "email",
    }, {
      origin: "https://evil.example",
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Cross-origin mutation requests are not allowed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
