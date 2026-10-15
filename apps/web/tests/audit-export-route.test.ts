import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));

  const route = await import("../app/api/audit/export/route");
  return {
    ...route,
    fetchMock,
  };
}

const auditExportResponse = {
  surface: "audit-export",
  version: "2026-06-04.audit-export",
  generatedAt: "2026-06-04T12:00:00.000Z",
  summary: {
    totalEvents: 1,
    sensitiveCount: 0,
    reviewCount: 0,
    requestCount: 1,
    firstEventAt: "2026-06-04T12:00:00.000Z",
    latestEventAt: "2026-06-04T12:00:00.000Z",
    algorithm: "SHA-256",
    payloadMode: "sanitized",
    chainHead: "a".repeat(64),
  },
  events: [
    {
      id: "audit-1",
      eventType: "api.get./v1/dashboard",
      actorType: "user",
      actorId: "user-1",
      createdAt: "2026-06-04T12:00:00.000Z",
      summary: "GET /v1/dashboard returned 200 in the server audit trail.",
      severity: "info",
      scope: {
        organizationId: "org-1",
        workspaceId: null,
      },
      target: {
        kind: null,
        id: null,
      },
      evidence: ["request req-1", "status 200"],
      payloadKeys: ["method", "path", "requestId", "status"],
    },
  ],
  hashChain: [
    {
      sequence: 1,
      eventId: "audit-1",
      eventType: "api.get./v1/dashboard",
      createdAt: "2026-06-04T12:00:00.000Z",
      previousHash: "0".repeat(64),
      hash: "a".repeat(64),
    },
  ],
  file: {
    filename: "growth-os-audit-export.json",
    contentType: "application/json; charset=utf-8",
    content: '{\n  "surface": "audit-export"\n}\n',
  },
  guardrails: [
    "Export contains sanitized audit summaries only; raw request bodies, webhook bodies, IP values, user-agent values, and provider payload bodies are excluded.",
  ],
  unavailableClaims: [
    "This manual export is not a hosted SIEM stream, legal discovery workflow, immutable object-lock archive, or configurable retention policy.",
  ],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("audit export proxy route", () => {
  it("returns a JSON attachment from the server API audit export package", async () => {
    const { GET, fetchMock } = await loadRoute(
      new Response(JSON.stringify(auditExportResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="growth-os-audit-export.json"',
    );
    await expect(response.text()).resolves.toContain('"surface": "audit-export"');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/audit/export",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("propagates server API errors without returning an export file", async () => {
    const { GET } = await loadRoute(
      new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Authentication required",
    });
  });
});
