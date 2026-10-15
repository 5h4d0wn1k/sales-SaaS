import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardResponse } from "@sales/shared";

const APP_BOOT_TIMEOUT_MS = 30000;

const dashboardFixture: DashboardResponse = {
  workspace: {
    organizationName: "Northstar Labs",
    workspaceName: "Default Workspace",
    region: "global",
    primaryChannel: "email",
  },
  metrics: [
    { label: "Qualified leads", value: "1", detail: "Leads currently active." },
    { label: "Campaigns running", value: "1", detail: "Campaigns currently active." },
    { label: "Meetings booked", value: "0", detail: "Meetings currently booked." },
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
  vi.doUnmock("../src/storage");
  vi.doUnmock("../src/middleware/auth");
});

describe("request-scoped storage context", () => {
  it("passes the authenticated tenant context into storage for protected routes", async () => {
    const getDashboardMock = vi.fn(async () => dashboardFixture);
    const auditMock = vi.fn(async () => undefined);
    const getStorageMock = vi.fn(async () => ({
      mode: "postgres" as const,
      getDashboard: getDashboardMock,
      audit: auditMock,
    }));

    vi.doMock("../src/storage", async () => {
      const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");
      return {
        ...actual,
        getStorage: getStorageMock,
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
            emailVerified: true,
            organizationId: "org-1",
            workspaceId: "ws-1",
          });
          await next();
        },
      };
    });

    const { createApp } = await import("../src/app");
    const app = createApp();
    const response = await app.request("/v1/dashboard");

    expect(response.status).toBe(200);
    expect(getStorageMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      workspaceId: "ws-1",
    });
    expect(getDashboardMock).toHaveBeenCalledTimes(1);
    expect(auditMock).toHaveBeenCalledTimes(1);
  }, APP_BOOT_TIMEOUT_MS);

  it("does not invent tenant context for public health checks", async () => {
    const getStorageMock = vi.fn(async () => ({
      mode: "postgres" as const,
    }));

    vi.doMock("../src/storage", async () => {
      const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");
      return {
        ...actual,
        getStorage: getStorageMock,
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

    expect(response.status).toBe(200);
    expect(getStorageMock.mock.calls.some((call: unknown[]) => call.length === 0)).toBe(true);
  }, APP_BOOT_TIMEOUT_MS);
});
