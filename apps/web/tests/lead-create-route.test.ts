import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const leadBody = {
  id: "lead_manual_1",
  fullName: "Alex Morgan",
  email: "alex@example.com",
  company: "Northstar Labs",
  source: "csv",
  status: "new",
  score: 64,
  lastTouchpoint: "Imported into workspace",
  rejectionReason: "Needs better fit",
};

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(
      async () =>
        new Headers({
          authorization: "Bearer token",
          "content-type": "application/json",
        }),
    ),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));
  vi.doMock("@/lib/return-to", async () => import("../lib/return-to"));
  vi.doMock("@/lib/upgrade-recommendation", async () =>
    import("../lib/upgrade-recommendation")
  );

  const route = await import("../app/api/leads/create/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(
  form: Record<string, string>,
  headers: Record<string, string> = {},
) {
  return new Request("http://localhost/api/leads/create", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("@/lib/upgrade-recommendation");
  vi.unstubAllGlobals();
});

describe("manual lead create proxy route", () => {
  it("imports a manual lead through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(leadBody), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(
      createPostRequest({
        returnTo: "/dashboard#leads",
        fullName: "Alex Morgan",
        email: "alex@example.com",
        phone: "",
        company: "Northstar Labs",
        source: "csv",
        score: "64",
      }),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.hash).toBe("#leads");
    expect(location.searchParams.get("leadStatus")).toBe("created");
    expect(location.searchParams.get("leadMessage")).toBe(
      "Alex Morgan imported from csv for review.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/leads",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          fullName: "Alex Morgan",
          email: "alex@example.com",
          company: "Northstar Labs",
          source: "csv",
          score: 64,
        }),
      }),
    );
  });

  it("carries lead-capacity upgrade recommendations back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "Monthly leads created limit reached for free.",
          upgrade: {
            planKey: "starter",
            planName: "Starter",
            description: "For founders building a repeatable outbound motion",
            checkoutPath: "/get-started?plan=starter",
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
    const response = await POST(
      createPostRequest({
        returnTo: "/dashboard#leads",
        fullName: "Alex Morgan",
        source: "csv",
      }),
    );
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.hash).toBe("#leads");
    expect(location.searchParams.get("leadStatus")).toBe("error");
    expect(location.searchParams.get("leadMessage")).toBe(
      "Monthly leads created limit reached for free.",
    );
    expect(location.searchParams.get("upgradePlan")).toBe("starter");
    expect(location.searchParams.get("upgradeCheckout")).toBe(
      "/get-started?plan=starter",
    );
  });

  it("blocks explicit cross-origin lead imports before proxying to the API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(leadBody), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(
      createPostRequest(
        {
          returnTo: "/dashboard#leads",
          fullName: "Cross Site",
          source: "csv",
        },
        {
          origin: "https://evil.example",
        },
      ),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Cross-origin mutation requests are not allowed",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
