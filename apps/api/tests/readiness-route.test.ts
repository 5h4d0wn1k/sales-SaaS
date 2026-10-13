import { afterEach, describe, expect, it, vi } from "vitest";

const APP_BOOT_TIMEOUT_MS = 30000;

const previousEnv = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  DURABLE_RATE_LIMITS_ENABLED: process.env.DURABLE_RATE_LIMITS_ENABLED,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
  RATE_LIMIT_TRUST_PROXY_HEADERS: process.env.RATE_LIMIT_TRUST_PROXY_HEADERS,
  RELEASE_COMMIT_SHA: process.env.RELEASE_COMMIT_SHA,
  RELEASE_DEPLOYMENT_ID: process.env.RELEASE_DEPLOYMENT_ID,
};

const productionSafeAuthSecret = "sales-aaas-production-safe-secret-2026-rotated-value";

const providerSummary = {
  sources: [],
  outreach: [],
  voice: [],
  billing: [],
  webhooks: [],
  chat: [],
  summary: {
    configured: 4,
    guarded: 2,
    blocked: 1,
    disabled: 0,
    productionBlockers: ["No production email sender is configured."],
  },
};

async function loadApp(options: {
  storageMode: "memory" | "postgres";
  nodeEnv?: string;
  authSecret?: string;
  frontendUrl?: string;
  productionBlockers?: string[];
  releaseCommitSha?: string;
  releaseDeploymentId?: string;
  durableRateLimitsEnabled?: string;
  rateLimitBackend?: string;
  trustProxyHeaders?: string;
}) {
  vi.resetModules();

  process.env.NODE_ENV = options.nodeEnv ?? "test";
  process.env.AUTH_SECRET = options.authSecret ?? "sales-aaas-test-auth-secret";
  process.env.FRONTEND_URL = options.frontendUrl ?? "";
  process.env.DURABLE_RATE_LIMITS_ENABLED =
    options.durableRateLimitsEnabled ?? "";
  process.env.RATE_LIMIT_BACKEND = options.rateLimitBackend ?? "";
  process.env.RATE_LIMIT_TRUST_PROXY_HEADERS = options.trustProxyHeaders ?? "";
  process.env.RELEASE_COMMIT_SHA = options.releaseCommitSha ?? "";
  process.env.RELEASE_DEPLOYMENT_ID = options.releaseDeploymentId ?? "";

  vi.doMock("../src/storage", async () => {
    const actual = await vi.importActual<typeof import("../src/storage")>("../src/storage");
    return {
      ...actual,
      getStorage: vi.fn(async () => ({
        mode: options.storageMode,
      })),
    };
  });

  vi.doMock("../src/providers", async () => {
    const actual = await vi.importActual<typeof import("../src/providers")>("../src/providers");
    return {
      ...actual,
      getProviderSummary: vi.fn(() => ({
        ...providerSummary,
        summary: {
          ...providerSummary.summary,
          productionBlockers:
            options.productionBlockers ?? providerSummary.summary.productionBlockers,
        },
      })),
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/storage");
  vi.doUnmock("../src/providers");

  if (previousEnv.AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = previousEnv.AUTH_SECRET;
  }

  if (previousEnv.DURABLE_RATE_LIMITS_ENABLED === undefined) {
    delete process.env.DURABLE_RATE_LIMITS_ENABLED;
  } else {
    process.env.DURABLE_RATE_LIMITS_ENABLED = previousEnv.DURABLE_RATE_LIMITS_ENABLED;
  }

  if (previousEnv.FRONTEND_URL === undefined) {
    delete process.env.FRONTEND_URL;
  } else {
    process.env.FRONTEND_URL = previousEnv.FRONTEND_URL;
  }

  if (previousEnv.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousEnv.NODE_ENV;
  }

  if (previousEnv.RATE_LIMIT_BACKEND === undefined) {
    delete process.env.RATE_LIMIT_BACKEND;
  } else {
    process.env.RATE_LIMIT_BACKEND = previousEnv.RATE_LIMIT_BACKEND;
  }

  if (previousEnv.RATE_LIMIT_TRUST_PROXY_HEADERS === undefined) {
    delete process.env.RATE_LIMIT_TRUST_PROXY_HEADERS;
  } else {
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS = previousEnv.RATE_LIMIT_TRUST_PROXY_HEADERS;
  }

  if (previousEnv.RELEASE_COMMIT_SHA === undefined) {
    delete process.env.RELEASE_COMMIT_SHA;
  } else {
    process.env.RELEASE_COMMIT_SHA = previousEnv.RELEASE_COMMIT_SHA;
  }

  if (previousEnv.RELEASE_DEPLOYMENT_ID === undefined) {
    delete process.env.RELEASE_DEPLOYMENT_ID;
  } else {
    process.env.RELEASE_DEPLOYMENT_ID = previousEnv.RELEASE_DEPLOYMENT_ID;
  }
});

describe("API readiness route", () => {
  it("keeps liveness green while blocking production readiness for demo storage", async () => {
    const app = await loadApp({
      storageMode: "memory",
      nodeEnv: "production",
      frontendUrl: "https://app.winrate.ai",
    });

    const healthResponse = await app.request("/health");
    const readyResponse = await app.request("/ready");
    const healthBody = await healthResponse.json();
    const body = await readyResponse.json();

    expect(healthResponse.status).toBe(200);
    expect(healthBody).toMatchObject({
      status: "ok",
      service: "sales-api",
      release: {
        version: "0.1.0",
      },
    });
    expect(readyResponse.status).toBe(503);
    expect(readyResponse.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "blocked",
      service: "sales-api",
      release: {
        version: "0.1.0",
      },
      environment: "production",
      checks: {
        providers: {
          status: "warning",
          productionBlockerCount: 1,
        },
      },
    });
    expect(body.blockers).toContain(
      "Production API readiness requires Postgres storage; memory storage is demo-only.",
    );
    expect(JSON.stringify(body)).not.toContain("sales-aaas-test-auth-secret");
  }, APP_BOOT_TIMEOUT_MS);

  it("reports ready for production core checks when Postgres storage is active", async () => {
    const app = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "https://app.winrate.ai",
      releaseCommitSha: "abc123release",
      releaseDeploymentId: "deploy-456",
      rateLimitBackend: "edge",
    });

    const response = await app.request("/ready");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "ready",
      service: "sales-api",
      release: {
        version: "0.1.0",
        commitSha: "abc123release",
        deploymentId: "deploy-456",
      },
      environment: "production",
      blockers: [],
      checks: {
        core: expect.arrayContaining([
          expect.objectContaining({
            id: "storage",
            status: "ready",
          }),
          expect.objectContaining({
            id: "auth-secret",
            status: "ready",
          }),
          expect.objectContaining({
            id: "frontend-url",
            status: "ready",
          }),
          expect.objectContaining({
            id: "rate-limits",
            status: "ready",
          }),
          expect.objectContaining({
            id: "client-ip-headers",
            status: "ready",
          }),
        ]),
        providers: {
          status: "ready",
          productionBlockerCount: 0,
        },
      },
    });
    expect(body.warnings).not.toContain(
      "Global, auth lifecycle, and public intake rate limits are process-local; configure edge/WAF or durable rate limiting before horizontal production scale.",
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks production readiness when only process-local rate limits are active", async () => {
    const app = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "https://app.winrate.ai",
    });

    const response = await app.request("/ready");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "blocked",
      blockers: expect.arrayContaining([
        "Global, auth lifecycle, and public intake rate limits are process-local; configure edge/WAF or durable rate limiting before horizontal production scale.",
      ]),
    });
    expect(body.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "rate-limits",
          status: "blocked",
        }),
      ]),
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("reports explicit trusted proxy header posture for production deployments", async () => {
    const app = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "https://app.winrate.ai",
      trustProxyHeaders: "true",
    });

    const response = await app.request("/ready");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "client-ip-headers",
          status: "ready",
          detail:
            "Production API is configured to trust proxy client-IP headers; ingress must strip or overwrite spoofed forwarding headers.",
        }),
      ]),
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks production readiness when AUTH_SECRET is the example placeholder", async () => {
    const app = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: "your-secret-key-min-32-chars-change-in-production",
      frontendUrl: "https://app.winrate.ai",
    });

    const response = await app.request("/ready");
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "blocked",
      blockers: expect.arrayContaining([
        "Production AUTH_SECRET must be a non-placeholder secret with at least 32 characters.",
      ]),
    });
    expect(body.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "auth-secret",
          status: "blocked",
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("your-secret-key");
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks production readiness when FRONTEND_URL is missing or a placeholder origin", async () => {
    const missingFrontendApp = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "",
    });
    const missingResponse = await missingFrontendApp.request("/ready");
    const missingBody = await missingResponse.json();

    expect(missingResponse.status).toBe(503);
    expect(missingBody.blockers).toContain(
      "FRONTEND_URL is required before API CORS, checkout redirects, and lifecycle links can serve production traffic.",
    );
    expect(missingBody.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "frontend-url",
          status: "blocked",
        }),
      ]),
    );

    const placeholderFrontendApp = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "http://localhost:3000",
    });
    const placeholderResponse = await placeholderFrontendApp.request("/ready");
    const placeholderBody = await placeholderResponse.json();

    expect(placeholderResponse.status).toBe(503);
    expect(placeholderBody.blockers).toContain(
      "Production FRONTEND_URL must be a real HTTPS application origin, not localhost, credentials, paths, query strings, fragments, or a reserved example host.",
    );
    expect(placeholderBody.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "frontend-url",
          status: "blocked",
        }),
      ]),
    );

    const pathFrontendApp = await loadApp({
      storageMode: "postgres",
      nodeEnv: "production",
      productionBlockers: [],
      authSecret: productionSafeAuthSecret,
      frontendUrl: "https://app.winrate.ai/settings?tab=billing#provider",
    });
    const pathResponse = await pathFrontendApp.request("/ready");
    const pathBody = await pathResponse.json();

    expect(pathResponse.status).toBe(503);
    expect(pathBody.blockers).toContain(
      "Production FRONTEND_URL must be a real HTTPS application origin, not localhost, credentials, paths, query strings, fragments, or a reserved example host.",
    );
    expect(pathBody.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "frontend-url",
          status: "blocked",
        }),
      ]),
    );
  }, APP_BOOT_TIMEOUT_MS);

  it("allows local readiness with memory storage but marks storage as demo mode", async () => {
    const app = await loadApp({
      storageMode: "memory",
      nodeEnv: "test",
      productionBlockers: [],
    });

    const response = await app.request("/ready");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.checks.core).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "storage",
          status: "warning",
          detail: "Memory storage is active for local or demo mode only.",
        }),
      ]),
    );
  }, APP_BOOT_TIMEOUT_MS);
});
