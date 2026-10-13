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

  const route = await import("../app/api/conversion/crm-handoff/route");
  return {
    ...route,
    fetchMock,
  };
}

const crmHandoffResponse = {
  surface: "crm-handoff",
  version: "2026-06-04.crm-handoff",
  generatedAt: "2026-06-04T12:00:00.000Z",
  workspace: {
    name: "Growth OS",
    planKey: "pro",
  },
  summary: {
    totalRecords: 1,
    openPipelineCount: 1,
    closedWonCount: 0,
    missingContactCount: 0,
    valueCapturedCents: 0,
    currency: "USD",
  },
  metrics: [
    {
      id: "crm-records",
      label: "CRM records",
      value: "1",
      detail: "1 lead ready for manual CRM import review.",
      tone: "good",
    },
  ],
  records: [
    {
      leadId: "lead_1",
      fullName: "Nina Carter",
      company: "VectrCloud",
      email: "nina@example.com",
      phone: "+15550101010",
      source: "manual",
      status: "qualified",
      score: 82,
      crmStage: "qualified",
      lastTouchpoint: "Evidence reviewed",
      latestMeetingId: null,
      latestMeetingStatus: null,
      latestMeetingAt: null,
      latestMeetingOwner: null,
      latestCallStatus: null,
      latestCallDisposition: null,
      latestActivityStatus: null,
      latestActivitySubject: null,
      actualValueCents: 0,
      dealCurrency: "USD",
      nextAction: "Create an operator-reviewed outreach or meeting handoff.",
    },
  ],
  csv: {
    filename: "growth-os-crm-handoff.csv",
    contentType: "text/csv; charset=utf-8",
    content: '"Lead ID","Full name"\n"lead_1","Nina Carter"\n',
  },
  guardrails: [
    "CRM handoff is a manual export; no external CRM records are created or mutated.",
  ],
  unavailableClaims: [
    "Live CRM sync, accounting attribution, billing reconciliation, and autonomous CRM updates are not available unless separately configured.",
  ],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("CRM handoff proxy route", () => {
  it("returns a CSV attachment from the server API handoff", async () => {
    const { GET, fetchMock } = await loadRoute(
      new Response(JSON.stringify(crmHandoffResponse), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="growth-os-crm-handoff.csv"',
    );
    await expect(response.text()).resolves.toContain('"lead_1","Nina Carter"');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/conversion/crm-handoff",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("propagates server API errors without returning a CSV file", async () => {
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
