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

  const route = await import("../app/api/revenue/reconciliation/route");
  return {
    ...route,
    fetchMock,
  };
}

const revenueReconciliationResponse = {
  surface: "revenue-reconciliation",
  version: "2026-06-04.revenue-reconciliation",
  generatedAt: "2026-06-04T12:00:00.000Z",
  workspace: {
    name: "Growth OS",
    planKey: "pro",
  },
  summary: {
    completedMeetingCount: 1,
    valuedMeetingCount: 1,
    missingValueCount: 0,
    wonLeadWithoutMeetingCount: 0,
    actualValueCents: 1200000,
    currency: "USD",
    subscriptionStatus: "active",
    planKey: "pro",
    seats: 3,
    monthlyUsage: 120,
    usageLimit: 1000,
  },
  metrics: [
    {
      id: "actual-value",
      label: "Actual value",
      value: "$12,000",
      detail: "1 completed meeting with recorded deal value.",
      tone: "good",
    },
  ],
  records: [
    {
      meetingId: "meeting_1",
      leadId: "lead_1",
      leadName: "Nina Carter",
      company: "VectrCloud",
      email: "nina@example.com",
      phone: "+15550101010",
      source: "manual",
      leadStatus: "won",
      meetingStatus: "completed",
      scheduledFor: "2026-06-05T10:00:00.000Z",
      owner: "Owner",
      dealValueCents: 1200000,
      dealCurrency: "USD",
      revenueStatus: "recorded_value",
      planKey: "pro",
      subscriptionStatus: "active",
      seats: 3,
      monthlyUsage: 120,
      usageLimit: 1000,
      nextAction: "Review against CRM, invoice, and payment records before accounting import.",
    },
  ],
  csv: {
    filename: "growth-os-revenue-reconciliation.csv",
    contentType: "text/csv; charset=utf-8",
    content: '"Meeting ID","Lead ID","Lead name"\n"meeting_1","lead_1","Nina Carter"\n',
  },
  guardrails: [
    "Revenue reconciliation is a manual accounting handoff; no accounting, payment, CRM, or billing provider records are created or mutated.",
  ],
  unavailableClaims: [
    "Live accounting sync, invoice matching, payment settlement, tax advice, and revenue-recognition automation are not available unless separately integrated.",
  ],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.unstubAllGlobals();
});

describe("revenue reconciliation proxy route", () => {
  it("returns a CSV attachment from the server API reconciliation package", async () => {
    const { GET, fetchMock } = await loadRoute(
      new Response(JSON.stringify(revenueReconciliationResponse), {
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
      'attachment; filename="growth-os-revenue-reconciliation.csv"',
    );
    await expect(response.text()).resolves.toContain('"meeting_1","lead_1","Nina Carter"');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/revenue/reconciliation",
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
