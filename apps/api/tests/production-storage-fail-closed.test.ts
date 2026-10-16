import { afterEach, describe, expect, it, vi } from "vitest";

const previousEnv = {
  AUTH_SECRET: process.env.AUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  FRONTEND_URL: process.env.FRONTEND_URL,
  NODE_ENV: process.env.NODE_ENV,
  RATE_LIMIT_BACKEND: process.env.RATE_LIMIT_BACKEND,
};

const productionSafeAuthSecret = "sales-aaas-production-safe-secret-2026-storage-check";

function validContactIntake() {
  return {
    intent: "sales_assessment",
    name: "Nina Carter",
    email: "nina@example.com",
    companyName: "VectrCloud",
    website: "https://vectrcloud.example",
    monthlyLeadGoal: 500,
    timeline: "this_month",
    budgetRange: "1500_5000",
    goals: ["Generate qualified leads"],
    channels: ["email", "call"],
    message:
      "We want a structured sales assessment before launching a qualified outbound workflow.",
  };
}

async function loadProductionAppWithUnavailablePostgres() {
  process.env.NODE_ENV = "production";
  process.env.AUTH_SECRET = productionSafeAuthSecret;
  process.env.FRONTEND_URL = "https://app.salesxgrowth.com";
  process.env.RATE_LIMIT_BACKEND = "edge";
  delete process.env.DATABASE_URL;

  vi.resetModules();
  const actualDatabase =
    await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const executeMock = vi.fn(async () => {
    throw new Error("postgres unavailable");
  });

  vi.doMock("@sales/database", () => ({
    ...actualDatabase,
    db: {
      ...actualDatabase.db,
      execute: executeMock,
    },
  }));

  const { createApp } = await import("../src/app");
  return {
    app: createApp(),
    executeMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@sales/database");
  vi.restoreAllMocks();

  if (previousEnv.AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = previousEnv.AUTH_SECRET;
  }

  if (previousEnv.DATABASE_URL === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = previousEnv.DATABASE_URL;
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
});

describe("production storage fail-closed behavior", () => {
  it("keeps readiness explicit without serving demo storage when Postgres is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { app, executeMock } = await loadProductionAppWithUnavailablePostgres();

    const healthResponse = await app.request("/health");
    const health = await healthResponse.json();
    const readyResponse = await app.request("/ready");
    const readiness = await readyResponse.json();

    expect(healthResponse.status).toBe(200);
    expect(health).toMatchObject({
      status: "ok",
      service: "sales-api",
      storage: "unavailable",
    });
    expect(readyResponse.status).toBe(503);
    expect(readiness).toMatchObject({
      status: "blocked",
      service: "sales-api",
      environment: "production",
      blockers: expect.arrayContaining([
        "Production API readiness requires Postgres storage; memory storage is demo-only.",
      ]),
    });
    expect(executeMock).toHaveBeenCalled();

    const intakeResponse = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.88",
      },
      body: JSON.stringify(validContactIntake()),
    });
    const intakeBody = await intakeResponse.json();

    expect(intakeResponse.status).toBe(503);
    expect(intakeBody).toMatchObject({
      error: "Production storage is unavailable.",
      code: "storage_unavailable",
    });
    expect(JSON.stringify(intakeBody)).not.toContain("Northstar Labs");
  });
});
