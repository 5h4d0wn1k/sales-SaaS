import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { ProductionStorageUnavailableError } from "../storage";

function requestTiming(c: Context) {
  const startedAt = c.get("requestStartedAt") as number | undefined;
  return Math.max(0, Date.now() - (startedAt ?? Date.now()));
}

function applyOperationalHeaders(c: Context, response: Response) {
  const requestId = c.get("requestId") as string | undefined;
  const durationMs = requestTiming(c);

  if (requestId) {
    response.headers.set("x-request-id", requestId);
  }

  response.headers.set("x-response-time-ms", String(durationMs));
  response.headers.set("Server-Timing", `app;dur=${durationMs}`);

  return response;
}

export function isJsonParseError(error: unknown) {
  return error instanceof SyntaxError;
}

export function isJsonPayloadRequest(c: Context) {
  return (
    c.req.method !== "GET" &&
    c.req.method !== "HEAD" &&
    (c.req.header("content-type") ?? "").includes("application/json")
  );
}

export function invalidJsonPayloadResponse(
  c: Context,
  message = "Invalid JSON payload.",
) {
  const requestId = c.get("requestId") as string | undefined;
  const response = c.json(
    {
      error: message,
      code: "invalid_json",
      requestId: requestId ?? null,
    },
    400,
  );

  return applyOperationalHeaders(c, response);
}

export function apiErrorBoundary(error: Error, c: Context) {
  const requestId = c.get("requestId") as string | undefined;

  if (
    isJsonParseError(error) &&
    isJsonPayloadRequest(c)
  ) {
    return invalidJsonPayloadResponse(c);
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    const response = c.json(
      {
        error: issue?.message ?? "Invalid request payload.",
        code: "validation_failed",
        requestId: requestId ?? null,
      },
      400,
    );

    return applyOperationalHeaders(c, response);
  }

  if (error instanceof HTTPException) {
    return applyOperationalHeaders(c, error.getResponse());
  }

  if (error instanceof ProductionStorageUnavailableError) {
    const response = c.json(
      {
        error: "Production storage is unavailable.",
        code: "storage_unavailable",
        requestId: requestId ?? null,
      },
      503,
    );

    return applyOperationalHeaders(c, response);
  }

  console.error("Unhandled API error:", {
    requestId: requestId ?? null,
    method: c.req.method,
    path: c.req.path,
    error,
  });

  const response = c.json(
    {
      error: "Internal server error",
      code: "internal_server_error",
      requestId: requestId ?? null,
    },
    500,
  );

  return applyOperationalHeaders(c, response);
}
