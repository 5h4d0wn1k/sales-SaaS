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
  vi.unmock("@sales/database");
  vi.unmock("bcryptjs");
  vi.unmock("../src/auth-lifecycle");
});

describe("registration route", () => {
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
});
