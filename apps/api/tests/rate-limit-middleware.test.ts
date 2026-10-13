import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const previousEnv = {
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_TRUST_PROXY_HEADERS: process.env.RATE_LIMIT_TRUST_PROXY_HEADERS,
};

async function loadRateLimitedApp() {
  vi.resetModules();
  const { rateLimitMiddleware } = await import("../src/middleware/security");
  const app = new Hono();

  app.use("*", rateLimitMiddleware);
  app.get("/health", (c) => c.json({ status: "ok" }));

  return app;
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();

  if (previousEnv.NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = previousEnv.NODE_ENV;
  }

  if (previousEnv.RATE_LIMIT_TRUST_PROXY_HEADERS === undefined) {
    delete process.env.RATE_LIMIT_TRUST_PROXY_HEADERS;
  } else {
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS = previousEnv.RATE_LIMIT_TRUST_PROXY_HEADERS;
  }
});

describe("global rate limit middleware", () => {
  it("isolates anonymous request buckets by client IP", async () => {
    const app = await loadRateLimitedApp();

    const firstResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get("ratelimit-limit")).toBe("100");
    expect(firstResponse.headers.get("ratelimit-remaining")).toBe("99");
    expect(Number(firstResponse.headers.get("ratelimit-reset"))).toBeGreaterThan(0);

    for (let index = 1; index < 100; index += 1) {
      const response = await app.request("/health", {
        headers: {
          "x-forwarded-for": "203.0.113.10",
        },
      });

      expect(response.status).toBe(200);
    }

    const limitedResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });
    const otherClientResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "203.0.113.11",
      },
    });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("ratelimit-limit")).toBe("100");
    expect(limitedResponse.headers.get("ratelimit-remaining")).toBe("0");
    expect(Number(limitedResponse.headers.get("ratelimit-reset"))).toBeGreaterThan(0);
    expect(Number(limitedResponse.headers.get("retry-after"))).toBeGreaterThan(0);
    await expect(limitedResponse.json()).resolves.toMatchObject({
      error: "Too many requests. Please try again later.",
    });
    expect(otherClientResponse.status).toBe(200);
    expect(otherClientResponse.headers.get("ratelimit-remaining")).toBe("99");
  });

  it("does not trust spoofed forwarded IP headers in production by default", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RATE_LIMIT_TRUST_PROXY_HEADERS;
    const app = await loadRateLimitedApp();

    for (let index = 0; index < 100; index += 1) {
      const response = await app.request("/health", {
        headers: {
          "x-forwarded-for": `203.0.113.${index}`,
        },
      });

      expect(response.status).toBe(200);
    }

    const limitedResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "198.51.100.200",
      },
    });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get("ratelimit-remaining")).toBe("0");
  });

  it("trusts forwarded IP buckets in production only when proxy trust is explicit", async () => {
    process.env.NODE_ENV = "production";
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS = "true";
    const app = await loadRateLimitedApp();

    for (let index = 0; index < 100; index += 1) {
      const response = await app.request("/health", {
        headers: {
          "x-forwarded-for": "203.0.113.10",
        },
      });

      expect(response.status).toBe(200);
    }

    const limitedResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });
    const otherClientResponse = await app.request("/health", {
      headers: {
        "x-forwarded-for": "203.0.113.11",
      },
    });

    expect(limitedResponse.status).toBe(429);
    expect(otherClientResponse.status).toBe(200);
    expect(otherClientResponse.headers.get("ratelimit-remaining")).toBe("99");
  });
});
