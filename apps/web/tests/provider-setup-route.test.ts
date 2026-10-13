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

  const route = await import("../app/api/providers/setup-request/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string | string[]>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(form)) {
    const values = Array.isArray(value) ? value : [value];
    for (const entry of values) {
      body.append(key, entry);
    }
  }

  return new Request("http://localhost/api/providers/setup-request", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  }) as NextRequest;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("provider setup request proxy route", () => {
  it("creates a provider setup proposal through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ id: "appr_1", type: "provider_setup" }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/settings#provider-readiness",
      provider: "resend-fallback",
      kind: "outreach",
      mode: "mock",
      readiness: "blocked",
      channels: ["email"],
      missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
      productionBlockers: ["No production email sender is configured."],
      rolloutGoal: "Prepare Resend for reviewed email rollout",
      businessReason: "Resolve email readiness before live customer outreach.",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/settings");
    expect(location.hash).toBe("#provider-readiness");
    expect(location.searchParams.get("providerSetupStatus")).toBe("proposed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/providers/setup-requests",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          provider: "resend-fallback",
          kind: "outreach",
          mode: "mock",
          readiness: "blocked",
          channels: ["email"],
          missingSecrets: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
          productionBlockers: ["No production email sender is configured."],
          rolloutGoal: "Prepare Resend for reviewed email rollout",
          businessReason: "Resolve email readiness before live customer outreach.",
        }),
      }),
    );
  });

  it("reports provider setup errors back to settings", async () => {
    const { POST } = await loadRoute(
      new Response(JSON.stringify({ error: "Verify your email before requesting provider setup review." }), {
        status: 403,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/settings#provider-readiness",
      provider: "stripe",
      kind: "billing",
      mode: "mock",
      readiness: "blocked",
      channels: ["checkout"],
      missingSecrets: ["STRIPE_SECRET_KEY"],
      productionBlockers: ["Stripe billing is not configured."],
      rolloutGoal: "Prepare Stripe checkout for paid launch",
      businessReason: "Resolve billing readiness before accepting paid customers.",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/settings");
    expect(location.searchParams.get("providerSetupStatus")).toBe("error");
    expect(location.searchParams.get("providerSetupMessage")).toBe(
      "Verify your email before requesting provider setup review.",
    );
  });
});
