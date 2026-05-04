import { afterEach, describe, expect, it, vi } from "vitest";
import { encode as encodeAuthJsToken } from "next-auth/jwt";
import type { DashboardResponse } from "@sales/shared";

const dashboardFixture: DashboardResponse = {
  workspace: {
    organizationName: "Northstar Labs",
    workspaceName: "Default Workspace",
    region: "global",
    primaryChannel: "email",
  },
  metrics: [
    { label: "Qualified leads", value: "3", detail: "Active qualified leads." },
  ],
  leads: [],
  campaigns: [],
  subscription: {
    planKey: "starter",
    status: "active",
    seats: 3,
    usageLimit: 1000,
    monthlyUsage: 42,
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

function createAuthenticatedDbMock() {
  const limitPlans = [
    [
      {
        id: "user-123",
        email: "owner@example.com",
        name: "Owner Example",
        role: "owner",
        organizationId: "org-1",
      },
    ],
    [
      {
        id: "ws-1",
        organizationId: "org-1",
        name: "Default Workspace",
        industry: "SaaS",
      },
    ],
  ];
  let limitCallCount = 0;

  const limitMock = vi.fn(async () => {
    const result = limitPlans[limitCallCount++];
    if (!result) {
      throw new Error(`Unexpected limit call #${limitCallCount}`);
    }
    return result;
  });

  const whereMock = vi.fn(() => ({
    limit: limitMock,
  }));
  const fromMock = vi.fn(() => ({
    where: whereMock,
  }));
  const selectMock = vi.fn(() => ({
    from: fromMock,
  }));

  return {
    db: {
      select: selectMock,
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => []),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(async () => undefined),
        })),
      })),
    },
    limitMock,
  };
}

async function loadAppWithEnv(overrides: Record<string, string | undefined>) {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ALLOW_TEST_AUTH_BYPASS: process.env.ALLOW_TEST_AUTH_BYPASS,
  };

  process.env.NODE_ENV = overrides.NODE_ENV ?? previous.NODE_ENV ?? "test";
  process.env.AUTH_SECRET = overrides.AUTH_SECRET ?? previous.AUTH_SECRET ?? "sales-aaas-test-auth-secret";

  if (overrides.ALLOW_TEST_AUTH_BYPASS === undefined) {
    delete process.env.ALLOW_TEST_AUTH_BYPASS;
  } else {
    process.env.ALLOW_TEST_AUTH_BYPASS = overrides.ALLOW_TEST_AUTH_BYPASS;
  }

  vi.resetModules();
  const { createApp } = await import("../src/app");

  return {
    app: createApp(),
    restore() {
      if (previous.NODE_ENV === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous.NODE_ENV;
      }

      if (previous.AUTH_SECRET === undefined) {
        delete process.env.AUTH_SECRET;
      } else {
        process.env.AUTH_SECRET = previous.AUTH_SECRET;
      }

      if (previous.ALLOW_TEST_AUTH_BYPASS === undefined) {
        delete process.env.ALLOW_TEST_AUTH_BYPASS;
      } else {
        process.env.ALLOW_TEST_AUTH_BYPASS = previous.ALLOW_TEST_AUTH_BYPASS;
      }
    },
  };
}

async function loadAuthenticatedApp() {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ALLOW_TEST_AUTH_BYPASS: process.env.ALLOW_TEST_AUTH_BYPASS,
  };

  process.env.NODE_ENV = "test";
  process.env.AUTH_SECRET = "sales-aaas-test-auth-secret";
  process.env.ALLOW_TEST_AUTH_BYPASS = "false";

  const actualDatabase = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const actualStorage = await vi.importActual<typeof import("../src/storage")>("../src/storage");
  const dbMock = createAuthenticatedDbMock();
  const getDashboardMock = vi.fn(async () => dashboardFixture);
  const auditMock = vi.fn(async () => undefined);
  const getStorageMock = vi.fn(async () => ({
    mode: "postgres" as const,
    getDashboard: getDashboardMock,
    audit: auditMock,
  }));

  vi.doMock("@sales/database", () => ({
    ...actualDatabase,
    db: dbMock.db,
  }));
  vi.doMock("../src/storage", () => ({
    ...actualStorage,
    getStorage: getStorageMock,
  }));

  vi.resetModules();
  const { createApp } = await import("../src/app");

  return {
    app: createApp(),
    getStorageMock,
    getDashboardMock,
    restore() {
      if (previous.NODE_ENV === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous.NODE_ENV;
      }

      if (previous.AUTH_SECRET === undefined) {
        delete process.env.AUTH_SECRET;
      } else {
        process.env.AUTH_SECRET = previous.AUTH_SECRET;
      }

      if (previous.ALLOW_TEST_AUTH_BYPASS === undefined) {
        delete process.env.ALLOW_TEST_AUTH_BYPASS;
      } else {
        process.env.ALLOW_TEST_AUTH_BYPASS = previous.ALLOW_TEST_AUTH_BYPASS;
      }
    },
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("@sales/database");
  vi.unmock("../src/storage");
});

describe("auth middleware", () => {
  it("keeps protected routes locked when test bypass is disabled", async () => {
    const { app, restore } = await loadAppWithEnv({
      NODE_ENV: "test",
      AUTH_SECRET: "sales-aaas-test-auth-secret",
      ALLOW_TEST_AUTH_BYPASS: "false",
    });

    try {
      const response = await app.request("/v1/dashboard");

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        error: "Authentication required",
      });
    } finally {
      restore();
    }
  }, 10000);

  it("allows public health checks without authentication", async () => {
    const { app, restore } = await loadAppWithEnv({
      NODE_ENV: "test",
      AUTH_SECRET: "sales-aaas-test-auth-secret",
      ALLOW_TEST_AUTH_BYPASS: "false",
    });

    try {
      const response = await app.request("/health");

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        status: "ok",
        service: "sales-api",
      });
    } finally {
      restore();
    }
  }, 10000);

  it("accepts encrypted Auth.js bearer tokens for protected routes", async () => {
    const { app, getStorageMock, getDashboardMock, restore } = await loadAuthenticatedApp();
    const token = await encodeAuthJsToken({
      secret: "sales-aaas-test-auth-secret",
      salt: "authjs.session-token",
      token: {
        sub: "user-123",
        role: "owner",
      },
    });

    try {
      const response = await app.request("/v1/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        workspace: {
          organizationName: "Northstar Labs",
        },
      });
      expect(getStorageMock).toHaveBeenCalledWith({
        organizationId: "org-1",
        workspaceId: "ws-1",
      });
      expect(getDashboardMock).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  }, 15000);

  it("accepts chunked Auth.js cookies for protected routes", async () => {
    const { app, getStorageMock, restore } = await loadAuthenticatedApp();
    const token = await encodeAuthJsToken({
      secret: "sales-aaas-test-auth-secret",
      salt: "__Secure-authjs.session-token",
      token: {
        sub: "user-123",
        role: "owner",
      },
    });
    const midpoint = Math.ceil(token.length / 2);
    const firstChunk = encodeURIComponent(token.slice(0, midpoint));
    const secondChunk = encodeURIComponent(token.slice(midpoint));

    try {
      const response = await app.request("/v1/dashboard", {
        headers: {
          cookie: `__Secure-authjs.session-token.0=${firstChunk}; __Secure-authjs.session-token.1=${secondChunk}`,
        },
      });

      expect(response.status).toBe(200);
      expect(getStorageMock).toHaveBeenCalledWith({
        organizationId: "org-1",
        workspaceId: "ws-1",
      });
    } finally {
      restore();
    }
  }, 15000);
});
