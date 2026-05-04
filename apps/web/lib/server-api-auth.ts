import { cookies } from "next/headers";
import { auth } from "../auth";
import { getSessionTokenFromCookieStore } from "./session-token";

export class ServerApiUnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "ServerApiUnauthorizedError";
  }
}

export class ServerApiWorkspaceSelectionRequiredError extends Error {
  constructor(message = "Workspace selection required") {
    super(message);
    this.name = "ServerApiWorkspaceSelectionRequiredError";
  }
}

export function isServerApiUnauthorizedError(error: unknown): error is ServerApiUnauthorizedError {
  return error instanceof ServerApiUnauthorizedError;
}

export function isServerApiWorkspaceSelectionRequiredError(
  error: unknown,
): error is ServerApiWorkspaceSelectionRequiredError {
  return error instanceof ServerApiWorkspaceSelectionRequiredError;
}

export function getServerApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function requireServerApiSessionToken() {
  const session = await auth();

  if (!session?.user) {
    throw new ServerApiUnauthorizedError();
  }

  const cookieStore = await cookies();
  const sessionToken = getSessionTokenFromCookieStore(cookieStore);

  if (!sessionToken) {
    throw new ServerApiUnauthorizedError();
  }

  return sessionToken;
}

export async function createServerApiHeaders(
  init: HeadersInit = {},
  options?: {
    contentType?: string | false;
  },
) {
  const sessionToken = await requireServerApiSessionToken();
  const headers = new Headers(init);

  if (options?.contentType !== false && !headers.has("content-type")) {
    headers.set("content-type", options?.contentType ?? "application/json");
  }

  headers.set("authorization", `Bearer ${sessionToken}`);
  return headers;
}
