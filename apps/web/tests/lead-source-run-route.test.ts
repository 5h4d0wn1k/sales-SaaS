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

  const route = await import("../app/api/leads/source-run/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/leads/source-run", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
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

describe("lead source-run proxy route", () => {
  it("starts a guarded source run through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ run: { id: "run-1" } }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      source: "website",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("sourceStatus")).toBe("created");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/leads/source-run",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ source: "website" }),
      }),
    );
  });

	  it("carries API upgrade recommendations back to the dashboard", async () => {
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
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      source: "website",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("sourceStatus")).toBe("error");
    expect(location.searchParams.get("sourceMessage")).toBe(
      "Monthly leads created limit reached for free.",
    );
	    expect(location.searchParams.get("upgradePlan")).toBe("starter");
	    expect(location.searchParams.get("upgradeCheckout")).toBe("/get-started?plan=starter");
	  });

	  it("carries configured source-provider governance blocks back to the dashboard", async () => {
	    const { POST } = await loadRoute(
	      new Response(
	        JSON.stringify({
	          error:
	            "Configured source-provider work requires governance controls before live source expansion.",
	          code: "source_provider_governance_required",
	          providerMode: "configured",
	          sources: ["website-crawler"],
	          missingControls: [
	            {
	              id: "provider_terms_policy",
	              label: "Source-provider terms policy",
	            },
	            {
	              id: "rate_limit_policy",
	              label: "Source-provider rate-limit policy",
	            },
	          ],
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
	      source: "website-crawler",
	    }));
	    const location = new URL(response.headers.get("location")!);

	    expect(response.status).toBe(303);
	    expect(location.pathname).toBe("/dashboard");
	    expect(location.searchParams.get("sourceStatus")).toBe("error");
	    expect(location.searchParams.get("sourceGate")).toBe("governance");
	    expect(location.searchParams.get("sourceMessage")).toBe(
	      "Configured source-provider work is blocked until source governance is configured.",
	    );
	    expect(location.searchParams.get("sourceControls")).toContain(
	      "terms policy",
	    );
	    expect(location.searchParams.get("sourceControls")).toContain(
	      "rate-limit policy",
	    );
	  });
	});
