import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardResponse } from "@sales/shared";

const dashboardFixture: DashboardResponse = {
  workspace: {
    organizationName: "Northstar Labs",
    workspaceName: "Default Workspace",
    region: "global",
    primaryChannel: "email",
  },
  metrics: [
    { label: "Qualified leads", value: "1", detail: "Leads currently active." },
  ],
  leads: [],
  campaigns: [],
  subscription: {
    planKey: "starter",
    status: "active",
    seats: 1,
    usageLimit: 1000,
    monthlyUsage: 0,
  },
  actionItems: [],
  onboarding: {
    id: "onb-1",
    status: "completed",
    currentStep: "complete",
    transcript: [],
    extractedProfile: null,
    scraperBrief: null,
    outreachBrief: null,
  },
  sourcePlan: null,
  sourceRuns: [],
  activities: [],
  calls: [],
  meetings: [],
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("../src/storage");
  vi.unmock("../src/middleware/auth");
});

describe("request id middleware", () => {
  it("preserves inbound request ids and forwards them into audit logs", async () => {
    const auditMock = vi.fn(async () => undefined);

    vi.doMock("../src/storage", async () => {
      const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");
      return {
        ...actual,
        getStorage: vi.fn(async () => ({
          mode: "postgres" as const,
          getDashboard: vi.fn(async () => dashboardFixture),
          audit: auditMock,
        })),
      };
    });

    vi.doMock("../src/middleware/auth", async () => {
      const actual = await vi.importActual<typeof import("../src/middleware/auth")>("../src/middleware/auth");
      return {
        ...actual,
        authMiddleware: async (c: any, next: () => Promise<void>) => {
          c.set("user", {
            id: "user-1",
            email: "owner@example.com",
            role: "owner",
            organizationId: "org-1",
            workspaceId: "ws-1",
          });
          await next();
        },
      };
    });

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/dashboard", {
      headers: {
        "x-request-id": "req-test-123",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-test-123");
    expect(auditMock).toHaveBeenCalledTimes(1);
    const auditEntry = auditMock.mock.calls.at(0)?.at(0);
    expect(auditEntry).toMatchObject({
      payload: {
        requestId: "req-test-123",
        path: "/v1/dashboard",
      },
    });
  }, 15000);

  it("generates a request id when the caller does not provide one", async () => {
    vi.doMock("../src/storage", async () => {
      const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");
      return {
        ...actual,
        getStorage: vi.fn(async () => ({
          mode: "postgres" as const,
        })),
      };
    });

    vi.doMock("../src/middleware/auth", async () => {
      const actual = await vi.importActual<typeof import("../src/middleware/auth")>("../src/middleware/auth");
      return {
        ...actual,
        authMiddleware: async (_c: any, next: () => Promise<void>) => {
          await next();
        },
      };
    });

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/health");
    const requestId = response.headers.get("x-request-id");

    expect(response.status).toBe(200);
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  }, 15000);
});
