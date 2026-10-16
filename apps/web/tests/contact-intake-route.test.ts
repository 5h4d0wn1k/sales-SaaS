import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { CONTACT_INTAKE_MAX_BODY_BYTES } from "@sales/shared";

function createPostRequest(
  entries: Array<[string, string]>,
  headers: Record<string, string> = {},
) {
  const body = new URLSearchParams();

  for (const [key, value] of entries) {
    body.append(key, value);
  }

  return new Request("http://localhost/api/contact/intake", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: "https://salesxgrowth.com/contact?utm_source=google",
      ...headers,
    },
    body,
  }) as NextRequest;
}

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) => response,
  );

  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://salesxgrowth.com");

  const route = await import("../app/api/contact/intake/route");
  return {
    ...route,
    fetchMock,
  };
}

const intakeResponse = {
  submission: {
    id: "intake_1",
    intent: "managed_services",
    name: "Priya Shah",
    email: "priya@example.com",
    companyName: "OrbitOps",
    website: "https://orbitops.example",
    role: "Founder",
    teamSize: "12",
    monthlyLeadGoal: 1200,
    budgetRange: "5000_plus",
    timeline: "this_week",
    goals: ["Book demos", "Launch outbound"],
    channels: ["email", "call"],
    message: "We need managed setup for a governed outbound launch.",
    sourcePath: "/contact",
    referrer: "https://salesxgrowth.com/contact?utm_source=google",
    utm: {
      source: "google",
      medium: "search",
      campaign: "managed-launch",
      solutionSegment: "founders-validating-outbound",
      segment: "Founders",
    },
    status: "new",
    priority: "high",
    qualificationScore: 100,
    routingRecommendation: "Route to founder/managed-services review within one business day.",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  },
  detail: "Your request was captured for priority founder or managed-services review.",
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("contact intake proxy route", () => {
  it("submits public contact intake to the server API and redirects with success status", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify(intakeResponse), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest([
      ["intent", "managed_services"],
      ["name", "Priya Shah"],
      ["email", "priya@example.com"],
      ["companyName", "OrbitOps"],
      ["website", "https://orbitops.example"],
      ["role", "Founder"],
      ["teamSize", "12"],
      ["monthlyLeadGoal", "1200"],
      ["budgetRange", "5000_plus"],
      ["timeline", "this_week"],
      ["goals", "Book demos"],
      ["goals", "Launch outbound"],
      ["channels", "email"],
      ["channels", "call"],
      ["message", "We need managed setup for a governed outbound launch."],
      ["sourcePath", "/contact"],
      ["utmSource", "google"],
      ["utmMedium", "search"],
      ["utmCampaign", "managed-launch"],
      ["pricingPlan", "pro"],
      ["pricingIntent", "fit_active_team"],
      ["managedPackage", "operator-assist"],
      ["managedIntent", "pricing_setup_review"],
      ["solutionSegment", "founders-validating-outbound"],
      ["segment", "Founders"],
      ["integration", "telegram-command-center"],
      ["integrationIntent", "beta_rollout"],
      ["integrationStatus", "Guarded beta"],
      ["integrationCommercialPath", "Pilot with review gates"],
    ], {
      "cf-connecting-ip": "198.51.100.55",
      "x-forwarded-for": "198.51.100.55, 10.0.0.10",
      "x-real-ip": "198.51.100.55",
      "user-agent": "Mozilla/5.0 buyer",
    }));
    const location = new URL(response.headers.get("location")!);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init?.headers as Headers;
    const body = JSON.parse(String(init?.body));

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/contact");
    expect(location.searchParams.get("contactStatus")).toBe("submitted");
    expect(location.searchParams.get("contactPriority")).toBe("high");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/contact/intake",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("cf-connecting-ip")).toBe("198.51.100.55");
    expect(headers.get("x-forwarded-for")).toBe("198.51.100.55, 10.0.0.10");
    expect(headers.get("x-real-ip")).toBe("198.51.100.55");
    expect(headers.get("user-agent")).toBe("Mozilla/5.0 buyer");
    expect(body).toMatchObject({
      intent: "managed_services",
      email: "priya@example.com",
      companyWebsiteUrl: "",
      goals: ["Book demos", "Launch outbound"],
      channels: ["email", "call"],
      utm: {
        source: "google",
        medium: "search",
        campaign: "managed-launch",
        pricingPlan: "pro",
        pricingIntent: "fit_active_team",
        managedPackage: "operator-assist",
        managedIntent: "pricing_setup_review",
        solutionSegment: "founders-validating-outbound",
        segment: "Founders",
        integration: "telegram-command-center",
        integrationIntent: "beta_rollout",
        integrationStatus: "Guarded beta",
        integrationCommercialPath: "Pilot with review gates",
      },
    });
  });

  it("redirects honeypot browser submissions without calling the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ error: "Should not be called" }), {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest([
      ["name", "Priya Shah"],
      ["email", "priya@example.com"],
      ["companyName", "OrbitOps"],
      ["companyWebsiteUrl", "https://trap.example"],
      ["message", "We need help setting up the workspace for outbound."],
    ]));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/contact");
    expect(location.searchParams.get("contactStatus")).toBe("submitted");
    expect(location.searchParams.get("contactMessage")).toBe("Your request was captured for review.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects oversized browser submissions before reading form data", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ error: "Should not be called" }), {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest([
      ["name", "Priya Shah"],
      ["email", "priya@example.com"],
      ["companyName", "OrbitOps"],
      ["message", "We need help setting up the workspace for outbound."],
    ], {
      "content-length": String(CONTACT_INTAKE_MAX_BODY_BYTES + 1),
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/contact");
    expect(location.searchParams.get("contactStatus")).toBe("error");
    expect(location.searchParams.get("contactMessage")).toContain(
      "Contact request is too large.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects oversized browser streams when content length is unavailable", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ error: "Should not be called" }), {
        status: 500,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest([
      ["name", "Priya Shah"],
      ["email", "priya@example.com"],
      ["companyName", "OrbitOps"],
      ["message", "a".repeat(CONTACT_INTAKE_MAX_BODY_BYTES + 1)],
    ], {
      "content-length": "not-a-number",
    }));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/contact");
    expect(location.searchParams.get("contactStatus")).toBe("error");
    expect(location.searchParams.get("contactMessage")).toContain(
      "Contact request is too large.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redirects to contact with an error when the server API rejects the request", async () => {
    const { POST } = await loadRoute(
      new Response(JSON.stringify({ error: "Contact intake is temporarily unavailable." }), {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest([
      ["name", "Priya Shah"],
      ["email", "priya@example.com"],
      ["companyName", "OrbitOps"],
      ["message", "We need help setting up the workspace for outbound."],
    ]));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/contact");
    expect(location.searchParams.get("contactStatus")).toBe("error");
    expect(location.searchParams.get("contactMessage")).toBe(
      "Contact intake is temporarily unavailable.",
    );
  });
});
