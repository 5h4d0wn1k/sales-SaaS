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

  const route = await import("../app/api/calls/dispatch/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/calls/dispatch", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const dispatchBody = {
  call: {
    id: "call_1",
    leadId: "lead_1",
    status: "completed",
    provider: "twilio-voice",
    providerCallId: null,
    summary: "Call completed through provider.",
    transcript: "",
    disposition: "meeting_requested",
    reviewRequired: false,
  },
  provider: "twilio-voice",
  mode: "configured",
  externalId: null,
  providerCostCents: 25,
  detail: "Call completed through configured provider.",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("@/lib/upgrade-recommendation");
  vi.unstubAllGlobals();
});

describe("call dispatch proxy route", () => {
  it("dispatches a guarded call through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(dispatchBody), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      leadId: "lead_1",
      provider: "twilio",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("callStatus")).toBe("dispatched");
    expect(location.searchParams.get("callMessage")).toBe(
      "Call completed through configured provider.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/calls/dispatch",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          leadId: "lead_1",
          provider: "twilio",
        }),
      }),
    );
  });

  it("reports suppression and low-score review states", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          ...dispatchBody,
          call: {
            ...dispatchBody.call,
            status: "review_required",
            provider: "suppression-policy",
            providerCallId: null,
            disposition: "suppressed",
            reviewRequired: true,
          },
          provider: "suppression-policy",
          mode: "mock",
          externalId: null,
          providerCostCents: 0,
          detail: "Dispatch blocked: phone is suppressed.",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard",
      leadId: "lead_1",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.searchParams.get("callStatus")).toBe("review_required");
    expect(location.searchParams.get("callMessage")).toBe(
      "Dispatch blocked: phone is suppressed.",
    );
  });

  it("carries upgrade recommendations for call entitlement blocks", async () => {
    const { POST } = await loadRoute(
      new Response(
        JSON.stringify({
          error: "Call channel is not included in starter.",
          upgrade: {
            planKey: "pro",
            planName: "Professional",
            description: "For teams managing active campaigns and review flows",
            checkoutPath: "/get-started?plan=pro",
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
      leadId: "lead_1",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("callStatus")).toBe("error");
    expect(location.searchParams.get("callMessage")).toBe(
      "Call channel is not included in starter.",
    );
    expect(location.searchParams.get("upgradePlan")).toBe("pro");
    expect(location.searchParams.get("upgradeCheckout")).toBe("/get-started?plan=pro");
  });
});
