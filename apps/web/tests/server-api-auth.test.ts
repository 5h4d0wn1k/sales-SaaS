import { afterEach, describe, expect, it, vi } from "vitest";

async function loadServerApiAuth(options: {
  session: { user?: { id?: string } } | null;
  cookies?: Array<{ name: string; value: string }>;
}) {
  vi.resetModules();

  vi.doMock("next/headers", () => ({
    cookies: vi.fn(async () => ({
      getAll: () => options.cookies ?? [],
    })),
  }));

  vi.doMock("../auth", () => ({
    auth: vi.fn(async () => options.session),
  }));

  return import("../lib/server-api-auth");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("next/headers");
  vi.doUnmock("../auth");
});

describe("server api auth helper", () => {
  it("requires an authenticated session before forwarding API requests", async () => {
    const { requireServerApiSessionToken, ServerApiUnauthorizedError } = await loadServerApiAuth({
      session: null,
    });

    await expect(requireServerApiSessionToken()).rejects.toBeInstanceOf(ServerApiUnauthorizedError);
  });

  it("requires an Auth.js session token cookie for server-side API forwarding", async () => {
    const { requireServerApiSessionToken, ServerApiUnauthorizedError } = await loadServerApiAuth({
      session: { user: { id: "user-1" } },
      cookies: [],
    });

    await expect(requireServerApiSessionToken()).rejects.toBeInstanceOf(ServerApiUnauthorizedError);
  });

  it("creates bearer headers from an authenticated Auth.js session token", async () => {
    const { createServerApiHeaders } = await loadServerApiAuth({
      session: { user: { id: "user-1" } },
      cookies: [
        { name: "__Secure-authjs.session-token.1", value: "middle" },
        { name: "__Secure-authjs.session-token.0", value: "start-" },
        { name: "__Secure-authjs.session-token.2", value: "-end" },
      ],
    });

    const headers = await createServerApiHeaders();

    expect(headers.get("authorization")).toBe("Bearer start-middle-end");
    expect(headers.get("content-type")).toBe("application/json");
  });
});
