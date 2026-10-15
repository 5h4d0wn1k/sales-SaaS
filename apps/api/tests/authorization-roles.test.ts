import { afterEach, describe, expect, it, vi } from "vitest";

const APP_BOOT_TIMEOUT_MS = 30000;

async function loadAppForUser({
  role,
  emailVerified = true,
}: {
  role: "owner" | "admin" | "member";
  emailVerified?: boolean;
}) {
  vi.resetModules();
  vi.doMock("../src/middleware/auth", async () => {
    const actual = await vi.importActual<typeof import("../src/middleware/auth")>("../src/middleware/auth");

    return {
      ...actual,
      authMiddleware: async (c: any, next: () => Promise<void>) => {
        c.set("user", {
          id: "user-1",
          email: `${role}@example.com`,
          name: role,
          role,
          emailVerified,
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

async function loadAppForRole(role: "owner" | "admin" | "member") {
  return loadAppForUser({ role });
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("../src/middleware/auth");
});

describe("role-based authorization", () => {
  it("blocks members from creating campaigns", async () => {
    const app = await loadAppForRole("member");

    const response = await app.request("/v1/campaigns", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Member-created campaign",
        channel: "email",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks members from approving campaigns", async () => {
    const app = await loadAppForRole("member");

    const response = await app.request("/v1/campaigns/camp_1/approve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks unverified owners from approving campaigns", async () => {
    const app = await loadAppForUser({ role: "owner", emailVerified: false });

    const response = await app.request("/v1/campaigns/camp_1/approve", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Verify your email before approving outreach.",
      code: "email_verification_required",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks members from scheduling meetings", async () => {
    const app = await loadAppForRole("member");

    const response = await app.request("/v1/meetings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
        scheduledFor: "2026-06-03T10:30:00.000Z",
        owner: "sales-ops",
        notes: "Manual meeting booked from dashboard conversion workflow.",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks unverified owners from updating meeting outcomes", async () => {
    const app = await loadAppForUser({ role: "owner", emailVerified: false });

    const response = await app.request("/v1/meetings/meet_1", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: "completed",
        notes: "Meeting completed with clear next steps.",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Verify your email before updating meeting outcomes.",
      code: "email_verification_required",
    });
  }, APP_BOOT_TIMEOUT_MS);

  it("blocks members from dispatching live calls", async () => {
    const app = await loadAppForRole("member");

    const response = await app.request("/v1/calls/dispatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        leadId: "lead_1",
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Insufficient permissions",
    });
  }, APP_BOOT_TIMEOUT_MS);
});
