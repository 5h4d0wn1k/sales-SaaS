import { afterEach, describe, expect, it, vi } from "vitest";

const previousEnv = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
};

async function loadAppWithFrontendUrl(frontendUrl: string) {
  vi.resetModules();
  process.env.NODE_ENV = "production";
  process.env.FRONTEND_URL = frontendUrl;

  const { createApp } = await import("../src/app");
  return createApp();
}

afterEach(() => {
  vi.resetModules();

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
});

describe("API CORS origin handling", () => {
  it("allows production preflight when FRONTEND_URL has a trailing slash", async () => {
    const app = await loadAppWithFrontendUrl("https://app.salesxgrowth.com/");
    const response = await app.request("/v1/dashboard", {
      method: "OPTIONS",
      headers: {
        origin: "https://app.salesxgrowth.com",
        "access-control-request-method": "GET",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.salesxgrowth.com",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBe("true");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("does not emit allow-origin headers for a mismatched origin", async () => {
    const app = await loadAppWithFrontendUrl("https://app.salesxgrowth.com/");
    const response = await app.request("/v1/dashboard", {
      method: "OPTIONS",
      headers: {
        origin: "https://evil.example",
        "access-control-request-method": "GET",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
  });
});
