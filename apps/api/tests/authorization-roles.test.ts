import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAppForRole(role: "owner" | "admin" | "member") {
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
        });
        await next();
      },
    };
  });

  const { createApp } = await import("../src/app");
  return createApp();
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("../src/middleware/auth");
});

describe("role-based authorization", () => {
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
  }, 10000);
});
