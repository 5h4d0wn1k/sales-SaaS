import { afterEach, describe, expect, it, vi } from "vitest";
import webPackage from "../package.json";

async function loadRoute() {
  vi.resetModules();
  return import("../app/ready/route");
}

type WebReadinessBody = {
  status: string;
  blockers: string[];
  warnings: string[];
  release: {
    version: string;
    commitSha: string | null;
    deploymentId: string | null;
  };
  checks: {
    web: {
      authSecret: {
        status: string;
        detail: string;
      };
      apiUrl: {
        status: string;
        detail: string;
      };
    };
    api: {
      ok: boolean;
      statusCode: number;
      status: string;
      blockers: number;
      warnings: number;
      blockerDetails: string[];
      warningDetails: string[];
    };
  };
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("web readiness route", () => {
  it("returns ready when the API readiness endpoint is ready", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.winrate.ai");
    vi.stubEnv("AUTH_SECRET", "sales-web-production-safe-secret-2026-rotated-value");
    vi.stubEnv("RELEASE_COMMIT_SHA", "web-commit-123");
    vi.stubEnv("RELEASE_DEPLOYMENT_ID", "web-deploy-456");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "ready",
          service: "sales-api",
          blockers: [],
          warnings: ["Provider configuration warning"],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      status: "ready",
      service: "sales-web",
      version: webPackage.version,
      release: {
        version: webPackage.version,
        commitSha: "web-commit-123",
        deploymentId: "web-deploy-456",
      },
      checks: {
        web: {
          authSecret: {
            status: "ready",
          },
          apiUrl: {
            status: "ready",
          },
        },
        api: {
          ok: true,
          statusCode: 200,
          status: "ready",
          service: "sales-api",
          blockers: 0,
          warnings: 1,
        },
      },
      blockers: [],
      warnings: ["API: Provider configuration warning"],
    });
    expect(body.checks.api.warningDetails).toEqual(["Provider configuration warning"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.winrate.ai/ready",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("blocks production readiness when the API URL is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.stubEnv("AUTH_SECRET", "sales-web-production-safe-secret-2026-rotated-value");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(503);
    expect(body.status).toBe("blocked");
    expect(body.blockers).toContain(
      "NEXT_PUBLIC_API_URL is required before web can serve production traffic.",
    );
    expect(body.checks.web.apiUrl).toMatchObject({
      status: "blocked",
      detail: "NEXT_PUBLIC_API_URL is required before web can serve production traffic.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks production readiness when the API URL is localhost or a reserved origin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    vi.stubEnv("AUTH_SECRET", "sales-web-production-safe-secret-2026-rotated-value");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(503);
    expect(body.status).toBe("blocked");
    expect(body.checks.web.apiUrl).toMatchObject({
      status: "blocked",
      detail:
        "Production NEXT_PUBLIC_API_URL must be a real HTTPS API origin, not localhost, credentials, or a reserved example host.",
    });
    expect(body.blockers).toContain(
      "Production NEXT_PUBLIC_API_URL must be a real HTTPS API origin, not localhost, credentials, or a reserved example host.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces local web readiness warnings without blocking local mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    vi.stubEnv("AUTH_SECRET", "local-secret");
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "ready",
          service: "sales-api",
          blockers: [],
          warnings: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.warnings).toContain(
      "NEXT_PUBLIC_API_URL is acceptable for local use, but production requires a real HTTPS API origin.",
    );
    expect(body.warnings).toContain(
      "AUTH_SECRET is configured for local or test use, but production requires a non-placeholder secret with at least 32 characters.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/ready",
      expect.objectContaining({
        cache: "no-store",
      }),
    );
  });

  it("blocks production readiness when AUTH_SECRET is the example placeholder", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("AUTH_SECRET", "your-secret-key-min-32-chars-change-in-production");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(503);
    expect(body.status).toBe("blocked");
    expect(body.checks.web.authSecret).toMatchObject({
      status: "blocked",
      detail: "Production AUTH_SECRET must be a non-placeholder secret with at least 32 characters.",
    });
    expect(body.blockers).toContain(
      "Production AUTH_SECRET must be a non-placeholder secret with at least 32 characters.",
    );
    expect(JSON.stringify(body)).not.toContain("your-secret-key");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks readiness when the API readiness endpoint is blocked", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    vi.stubEnv("AUTH_SECRET", "sales-web-production-safe-secret-2026-rotated-value");
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "blocked",
          service: "sales-api",
          blockers: ["Production API readiness requires Postgres storage."],
          warnings: [],
        }),
        { status: 503 },
      ),
    ));

    const { GET } = await loadRoute();
    const response = await GET();
    const body = (await response.json()) as WebReadinessBody;

    expect(response.status).toBe(503);
    expect(body.status).toBe("blocked");
    expect(body.checks.api).toMatchObject({
      ok: false,
      statusCode: 503,
      status: "blocked",
      blockers: 1,
      blockerDetails: ["Production API readiness requires Postgres storage."],
    });
    expect(body.blockers).toContain("API readiness is not ready.");
    expect(body.blockers).toContain("API: Production API readiness requires Postgres storage.");
  });
});
