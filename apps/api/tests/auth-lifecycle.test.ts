import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

async function loadAuthLifecycleApp() {
  const database = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const hashMock = vi.fn(async () => "hashed-next-password");
  const issueEmailVerificationMock = vi.fn(async () => ({
    email: "owner@example.com",
    delivery: {
      mode: "preview" as const,
      previewUrl: "http://localhost:3000/verify-email?email=owner@example.com&token=preview",
    },
  }));
  const issuePasswordResetMock = vi.fn(async () => ({
    email: "owner@example.com",
    delivery: {
      mode: "preview" as const,
      previewUrl: "http://localhost:3000/reset-password?email=owner@example.com&token=preview",
    },
  }));
  const consumeEmailVerificationMock = vi.fn();
  const consumePasswordResetMock = vi.fn();
  const findLifecycleUserByEmailMock = vi.fn();

  vi.doMock("@sales/database", () => ({
    ...database,
    db: {
      select: vi.fn(),
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
      delete: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
      transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
        callback({
          delete: vi.fn(() => ({
            where: vi.fn(async () => undefined),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(async () => undefined),
          })),
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(async () => undefined),
            })),
          })),
        }),
      ),
    },
  }));
  vi.doMock("bcryptjs", () => ({
    hash: hashMock,
  }));
  vi.doMock("../src/auth-lifecycle", () => ({
    consumeEmailVerification: consumeEmailVerificationMock,
    consumePasswordReset: consumePasswordResetMock,
    findLifecycleUserByEmail: findLifecycleUserByEmailMock,
    issueEmailVerification: issueEmailVerificationMock,
    issuePasswordReset: issuePasswordResetMock,
  }));

  const { authRoutes } = await import("../src/routes/auth");
  const app = new Hono();
  app.route("/v1/auth", authRoutes);

  return {
    app,
    hashMock,
    issueEmailVerificationMock,
    issuePasswordResetMock,
    consumeEmailVerificationMock,
    consumePasswordResetMock,
    findLifecycleUserByEmailMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("@sales/database");
  vi.unmock("bcryptjs");
  vi.unmock("../src/auth-lifecycle");
});

describe("auth lifecycle routes", () => {
  it("requires an email for verification resend requests", async () => {
    const { app } = await loadAuthLifecycleApp();

    const response = await app.request("/v1/auth/verify-email/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Email address is required",
    });
  });

  it("issues verification emails for unverified accounts", async () => {
    const { app, findLifecycleUserByEmailMock, issueEmailVerificationMock } =
      await loadAuthLifecycleApp();
    findLifecycleUserByEmailMock.mockResolvedValue({
      id: "user-1",
      email: "owner@example.com",
      displayName: "Owner Example",
      emailVerified: null,
    });

    const response = await app.request("/v1/auth/verify-email/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "owner@example.com",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      email: "owner@example.com",
      requiresEmailVerification: true,
      delivery: {
        mode: "preview",
      },
    });
    expect(issueEmailVerificationMock).toHaveBeenCalledTimes(1);
  });

  it("keeps password reset requests generic when the account does not exist", async () => {
    const { app, findLifecycleUserByEmailMock, issuePasswordResetMock } =
      await loadAuthLifecycleApp();
    findLifecycleUserByEmailMock.mockResolvedValue(null);

    const response = await app.request("/v1/auth/password-reset/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "missing@example.com",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      email: "missing@example.com",
    });
    expect(issuePasswordResetMock).not.toHaveBeenCalled();
  });

  it("rejects invalid verification links", async () => {
    const { app, consumeEmailVerificationMock } = await loadAuthLifecycleApp();
    consumeEmailVerificationMock.mockResolvedValue({
      ok: false,
      reason: "invalid",
    });

    const response = await app.request("/v1/auth/verify-email/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "owner@example.com",
        token: "0".repeat(48),
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid or expired verification link",
    });
  });

  it("hashes the new password before completing password reset", async () => {
    const { app, consumePasswordResetMock, hashMock } = await loadAuthLifecycleApp();
    consumePasswordResetMock.mockResolvedValue({
      ok: true,
      reset: true,
    });

    const response = await app.request("/v1/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "owner@example.com",
        token: "0".repeat(48),
        password: "new-strong-password",
      }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      reset: true,
    });
    expect(hashMock).toHaveBeenCalledWith("new-strong-password", 12);
    expect(consumePasswordResetMock).toHaveBeenCalledWith({
      email: "owner@example.com",
      token: "0".repeat(48),
      passwordHash: "hashed-next-password",
    });
  });
});
