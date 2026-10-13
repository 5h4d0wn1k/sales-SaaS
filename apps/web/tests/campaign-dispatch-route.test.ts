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

  const route = await import("../app/api/campaigns/[id]/dispatch/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string> = {}) {
  return new Request("http://localhost/api/campaigns/camp_1/dispatch", {
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

const dispatchBody = {
  campaign: {
    id: "camp_1",
    name: "Founder-led SaaS first touch",
    channel: "email",
    stage: "running",
    approved: true,
    firstActionCompleted: true,
    nextActionAt: "Queued first touch",
    leadsEnrolled: 12,
  },
  activity: {
    id: "act_1",
    campaignId: "camp_1",
    leadId: "lead_1",
    type: "email",
    provider: "resend",
    providerMessageId: "msg_1",
    status: "queued",
    subject: "Personalized email",
    preview: "Queued through provider.",
    personalizedFor: "Maya Sinha",
  },
  provider: "resend",
  mode: "configured",
  externalId: "msg_1",
  deliveryStatus: "queued",
  providerCostCents: 1,
  detail: "Queued first touch through configured provider.",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("@/lib/upgrade-recommendation");
  vi.unstubAllGlobals();
});

describe("campaign dispatch proxy route", () => {
  it("dispatches an approved campaign through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(dispatchBody), {
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
    expect(location.searchParams.get("campaignStatus")).toBe("dispatched");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Queued first touch through configured provider.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/campaigns/camp_1/dispatch",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({}),
      }),
    );
  });

  it("reports suppression review states without treating them as normal dispatch", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          ...dispatchBody,
          mode: "mock",
          externalId: null,
          deliveryStatus: "review_required",
          providerCostCents: 0,
          detail: "Dispatch blocked: contact is suppressed.",
          activity: {
            ...dispatchBody.activity,
            provider: "suppression-policy",
            providerMessageId: null,
            status: "review_required",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({ returnTo: "/dashboard" }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.searchParams.get("campaignStatus")).toBe("review_required");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Dispatch blocked: contact is suppressed.",
    );
  });

  it("carries upgrade recommendations for entitlement blocks", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "Email channel is not included in free.",
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
    const response = await POST(createPostRequest({ returnTo: "/dashboard" }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("campaignStatus")).toBe("error");
    expect(location.searchParams.get("campaignMessage")).toBe(
      "Email channel is not included in free.",
    );
    expect(location.searchParams.get("upgradePlan")).toBe("starter");
    expect(location.searchParams.get("upgradeCheckout")).toBe("/get-started?plan=starter");
  });
});
