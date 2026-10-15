import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

function createDbMock(existingUsers: unknown[] = []) {
  const limitMock = vi.fn(async () => existingUsers);
  const whereMock = vi.fn(() => ({
    limit: limitMock,
  }));
  const fromMock = vi.fn(() => ({
    where: whereMock,
  }));
  const selectMock = vi.fn(() => ({
    from: fromMock,
  }));

  const returningMock = vi.fn(async () => [
    {
      id: "user-1",
      email: "user@example.com",
      displayName: "Jamie Founder",
      emailVerified: null,
    },
  ]);
  const valuesMock = vi.fn(() => ({
    returning: returningMock,
  }));
  const insertMock = vi.fn(() => ({
    values: valuesMock,
  }));

  return {
    db: {
      select: selectMock,
      insert: insertMock,
    },
    valuesMock,
    returningMock,
  };
}

async function loadAuthApp(existingUsers: unknown[] = []) {
  const database = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const dbMock = createDbMock(existingUsers);
  const hashMock = vi.fn(async () => "hashed-password");
  const issueEmailVerificationMock = vi.fn(async () => ({
    email: "user@example.com",
    delivery: {
      mode: "preview" as const,
      previewUrl: "http://localhost:3000/verify-email?email=user@example.com&token=preview",
    },
  }));

  vi.doMock("@sales/database", () => ({
    ...database,
    db: dbMock.db,
  }));
  vi.doMock("bcryptjs", () => ({
    hash: hashMock,
  }));
  vi.doMock("../src/auth-lifecycle", () => ({
    consumeEmailVerification: vi.fn(),
    consumePasswordReset: vi.fn(),
    findLifecycleUserByEmail: vi.fn(),
    issueEmailVerification: issueEmailVerificationMock,
    issuePasswordReset: vi.fn(),
  }));

  const { authRoutes } = await import("../src/routes/auth");
  const app = new Hono();
  app.route("/v1/auth", authRoutes);

  return { app, dbMock, hashMock, issueEmailVerificationMock };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@sales/database");
  vi.doUnmock("bcryptjs");
  vi.doUnmock("../src/auth-lifecycle");
});

describe("registration route", () => {
  it("returns a client error for malformed registration JSON", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { app, dbMock, hashMock, issueEmailVerificationMock } = await loadAuthApp();

    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid registration JSON payload.",
      code: "invalid_json",
      requestId: null,
    });
    expect(dbMock.valuesMock).not.toHaveBeenCalled();
    expect(hashMock).not.toHaveBeenCalled();
    expect(issueEmailVerificationMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalledWith(
      "Registration error:",
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("returns client errors for malformed auth lifecycle JSON", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { app, dbMock, hashMock, issueEmailVerificationMock } = await loadAuthApp();

    for (const [path, message] of [
      ["/v1/auth/verify-email/request", "Invalid verification request JSON payload."],
      ["/v1/auth/verify-email/confirm", "Invalid verification confirmation JSON payload."],
      ["/v1/auth/password-reset/request", "Invalid password reset request JSON payload."],
      ["/v1/auth/password-reset/confirm", "Invalid password reset confirmation JSON payload."],
    ] as const) {
      const response = await app.request(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: message,
        code: "invalid_json",
        requestId: null,
      });
    }

    expect(dbMock.valuesMock).not.toHaveBeenCalled();
    expect(hashMock).not.toHaveBeenCalled();
    expect(issueEmailVerificationMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/error/i),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("rejects invalid registration payloads server-side", async () => {
    const { app } = await loadAuthApp();

    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "invalid-email",
        password: "short",
        name: "A",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.any(String),
    });
  });

  it("bootstraps self-serve registrations as billing owners and normalizes email", async () => {
    const { app, dbMock, hashMock } = await loadAuthApp();

    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "  USER@Example.COM ",
        password: "strong-pass-123",
        name: "Jamie Founder",
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      email: "user@example.com",
    });
    expect(hashMock).toHaveBeenCalledWith("strong-pass-123", 12);
    expect(dbMock.valuesMock).toHaveBeenCalledWith({
      email: "user@example.com",
      passwordHash: "hashed-password",
      displayName: "Jamie Founder",
      role: "owner",
      emailVerified: null,
    });
  });

  it("rate-limits repeated registration attempts from the same client", async () => {
    const { app } = await loadAuthApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await app.request("/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.44",
        },
        body: JSON.stringify({
          email: `buyer-${index}@example.com`,
          password: "strong-pass-123",
          name: "Jamie Founder",
        }),
      });

      expect(response.status).toBe(201);
    }

    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.44",
      },
      body: JSON.stringify({
        email: "buyer-limited@example.com",
        password: "strong-pass-123",
        name: "Jamie Founder",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(response.headers.get("RateLimit-Limit")).toBe("5");
    expect(response.headers.get("RateLimit-Remaining")).toBe("0");
    expect(Number(response.headers.get("RateLimit-Reset"))).toBeGreaterThan(0);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(Number(response.headers.get("X-RateLimit-Reset"))).toBeGreaterThan(0);
    expect(payload).toMatchObject({
      error: "Too many account requests. Please try again later.",
    });
  });
});
