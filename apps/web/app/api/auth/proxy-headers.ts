import type { NextRequest } from "next/server";

export function createAccountLifecycleApiHeaders(request: NextRequest) {
  const headers = new Headers({
    "content-type": "application/json",
  });

  for (const name of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "user-agent"] as const) {
    const value = request.headers.get(name)?.trim();

    if (value) {
      headers.set(name, value.slice(0, 1000));
    }
  }

  return headers;
}
