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

  const route = await import("../app/api/leads/discover/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/leads/discover", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const discoveryBody = {
  sourcePlan: null,
  selectedSources: ["website-crawler", "search-intelligence"],
  runs: [
    {
      source: "website-crawler",
      run: {
        id: "run_1",
        source: "website-crawler",
        status: "completed",
        providerMode: "mock",
        candidatesFound: 12,
        dedupedCount: 4,
        qualifiedCount: 1,
        rejectedCount: 7,
        qualityScore: 85,
        evidence: [],
        rejectionReasons: [],
        complianceChecks: [],
        freshness: "Fresh",
        nextAction: "Review source evidence before outreach.",
        summary: "Website run completed.",
      },
      accepted: [],
      rejected: [],
    },
    {
      source: "search-intelligence",
      run: {
        id: "run_2",
        source: "search-intelligence",
        status: "completed",
        providerMode: "mock",
        candidatesFound: 9,
        dedupedCount: 2,
        qualifiedCount: 2,
        rejectedCount: 5,
        qualityScore: 81,
        evidence: [],
        rejectionReasons: [],
        complianceChecks: [],
        freshness: "Fresh",
        nextAction: "Review source evidence before outreach.",
        summary: "Search run completed.",
      },
      accepted: [],
      rejected: [],
    },
  ],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("@/lib/upgrade-recommendation");
  vi.unstubAllGlobals();
});

describe("lead discovery proxy route", () => {
  it("starts guarded multi-source discovery through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(discoveryBody), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      limitSources: "2",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("discoverStatus")).toBe("created");
    expect(location.searchParams.get("discoverMessage")).toBe(
      "2 source runs created for review.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/leads/discover",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ limitSources: 2 }),
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
      limitSources: "3",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("discoverStatus")).toBe("error");
    expect(location.searchParams.get("discoverMessage")).toBe(
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
	          sources: ["website-crawler", "search-intelligence"],
	          missingControls: [
	            {
	              id: "provider_terms_policy",
	              label: "Source-provider terms policy",
	            },
	            {
	              id: "consent_policy",
	              label: "Source-provider consent policy",
	            },
	            {
	              id: "source_quality_governance",
	              label: "Source-quality governance",
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
	      limitSources: "2",
	    }));
	    const location = new URL(response.headers.get("location")!);

	    expect(response.status).toBe(303);
	    expect(location.pathname).toBe("/dashboard");
	    expect(location.searchParams.get("discoverStatus")).toBe("error");
	    expect(location.searchParams.get("discoverGate")).toBe("governance");
	    expect(location.searchParams.get("discoverMessage")).toBe(
	      "Configured source-provider work is blocked until source governance is configured.",
	    );
	    expect(location.searchParams.get("discoverControls")).toContain(
	      "terms policy",
	    );
	    expect(location.searchParams.get("discoverControls")).toContain(
	      "consent policy",
	    );
	    expect(location.searchParams.get("discoverControls")).toContain(
	      "quality governance",
	    );
	  });
	});
