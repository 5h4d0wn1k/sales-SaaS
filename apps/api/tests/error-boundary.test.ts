import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiErrorBoundary } from "../src/middleware/error-boundary";
import { requestIdMiddleware } from "../src/middleware/security";

describe("api error boundary", () => {
  it("returns a client error for uncaught malformed JSON payloads", async () => {
    const app = new Hono();
    app.onError(apiErrorBoundary);
    app.use("*", requestIdMiddleware);
    app.post("/json", async (c) => {
      await c.req.json();
      return c.json({ ok: true });
    });

    const response = await app.request("/json", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{",
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: "Invalid JSON payload.",
      code: "invalid_json",
      requestId: expect.any(String),
    });
    expect(response.headers.get("x-request-id")).toBe(payload.requestId);
  });
});
