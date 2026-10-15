import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

function createPostRequest(
  url: string,
  entries: Array<[string, string]>,
  headers: Record<string, string> = {},
) {
  const body = new URLSearchParams();

  for (const [key, value] of entries) {
    body.append(key, value);
  }

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "cf-connecting-ip": "198.51.100.70",
      "x-forwarded-for": "198.51.100.70, 10.0.0.20",
      "x-real-ip": "198.51.100.70",
      "user-agent": "Mozilla/5.0 account-flow",
      ...headers,
    },
    body,
  }) as NextRequest;
}

async function loadRoute<T extends { POST: (request: NextRequest) => Promise<Response> }>(
  modulePath: string,
  response: Response,
  session: { user?: { email?: string | null } } | null = null,
) {
  vi.resetModules();
  const fetchMock = vi.fn(
    async (_input: string | URL | Request, _init?: RequestInit) => response,
  );

  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
  vi.doMock("@/auth", () => ({
    auth: vi.fn(async () => session),
  }));
  vi.doMock("../auth", () => ({
    auth: vi.fn(async () => session),
  }));
  vi.doMock("@/lib/server-api-auth", () => ({
    getServerApiBaseUrl: () => "https://api.example.com",
  }));
  vi.doMock("@/lib/return-to", () => ({
    appendStatusParam: (target: string, key: string, value: string) => {
      const url = new URL(target, "http://localhost");
      url.searchParams.set(key, value);
      return `${url.pathname}${url.search}`;
    },
    resolveReturnTo: (value: FormDataEntryValue | null, fallback: string) =>
      typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
        ? value
        : fallback,
  }));

  const route = await import(modulePath) as T;
  return {
    ...route,
    fetchMock,
  };
}

function expectForwardedHeaders(headers: Headers) {
  expect(headers.get("content-type")).toBe("application/json");
  expect(headers.get("cf-connecting-ip")).toBe("198.51.100.70");
  expect(headers.get("x-forwarded-for")).toBe("198.51.100.70, 10.0.0.20");
  expect(headers.get("x-real-ip")).toBe("198.51.100.70");
  expect(headers.get("user-agent")).toBe("Mozilla/5.0 account-flow");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/auth");
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.doUnmock("../auth");
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("account lifecycle proxy routes", () => {
  it("forwards client identity headers when requesting a verification email", async () => {
    const { POST, fetchMock } = await loadRoute<typeof import("../app/api/auth/verify-email/request/route")>(
      "../app/api/auth/verify-email/request/route",
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const response = await POST(createPostRequest("http://localhost/api/auth/verify-email/request", [
      ["email", "owner@example.com"],
      ["returnTo", "/get-started"],
    ]));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));

    expect(response.status).toBe(303);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/auth/verify-email/request",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
      }),
    );
    expectForwardedHeaders(init?.headers as Headers);
    expect(body).toEqual({ email: "owner@example.com" });
  });

  it("forwards client identity headers when requesting a password reset", async () => {
    const { POST, fetchMock } = await loadRoute<typeof import("../app/api/auth/password-reset/request/route")>(
      "../app/api/auth/password-reset/request/route",
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const response = await POST(createPostRequest("http://localhost/api/auth/password-reset/request", [
      ["email", "owner@example.com"],
    ]));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));

    expect(response.status).toBe(303);
    expectForwardedHeaders(init?.headers as Headers);
    expect(body).toEqual({ email: "owner@example.com" });
  });

  it("forwards client identity headers when confirming a password reset", async () => {
    const { POST, fetchMock } = await loadRoute<typeof import("../app/api/auth/password-reset/confirm/route")>(
      "../app/api/auth/password-reset/confirm/route",
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const response = await POST(createPostRequest("http://localhost/api/auth/password-reset/confirm", [
      ["email", "owner@example.com"],
      ["token", "reset-token"],
      ["password", "new-strong-password"],
    ]));
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));

    expect(response.status).toBe(303);
    expectForwardedHeaders(init?.headers as Headers);
    expect(body).toEqual({
      email: "owner@example.com",
      token: "reset-token",
      password: "new-strong-password",
    });
  });
});
