import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

async function loadRoute(response: Response) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => response);

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/server-api-auth", () => ({
    createServerApiHeaders: vi.fn(async () => new Headers({
      authorization: "Bearer token",
      "content-type": "application/json",
    })),
    getServerApiBaseUrl: vi.fn(() => "https://api.example.com"),
  }));
  vi.doMock("@/lib/return-to", async () => import("../lib/return-to"));

  const route = await import("../app/api/ai-workers/runs/[id]/complete/route");
  return {
    ...route,
    fetchMock,
  };
}

function createPostRequest(form: Record<string, string>) {
  return new Request("http://localhost/api/ai-workers/runs/run_1/complete", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  }) as NextRequest;
}

const routeContext = {
  params: Promise.resolve({
    id: "run_1",
  }),
};

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@/lib/server-api-auth");
  vi.doUnmock("@/lib/return-to");
  vi.unstubAllGlobals();
});

describe("AI worker dry-run completion proxy route", () => {
  it("records a dry-run result through the server API", async () => {
    const { POST, fetchMock } = await loadRoute(
      new Response(JSON.stringify({ id: "run_1", status: "completed" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard#ai-workers",
      resultSummary: "Dry-run produced a reviewable source batch.",
      actualCost: "12",
    }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.hash).toBe("#ai-workers");
    expect(location.searchParams.get("workerStatus")).toBe("completed");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/ai-workers/runs/run_1/result",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({
          resultSummary: "Dry-run produced a reviewable source batch.",
          actualCostCents: 1200,
        }),
      }),
    );
  });

  it("reports completion errors back to the dashboard", async () => {
    const { POST } = await loadRoute(
      new Response(JSON.stringify({ error: "Only approved AI worker runs can receive dry-run results." }), {
        status: 409,
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const response = await POST(createPostRequest({
      returnTo: "/dashboard#ai-workers",
      resultSummary: "Dry-run attempted before approval.",
      actualCost: "1",
    }), routeContext);
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(303);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("workerStatus")).toBe("error");
    expect(location.searchParams.get("workerMessage")).toBe(
      "Only approved AI worker runs can receive dry-run results.",
    );
  });
});
