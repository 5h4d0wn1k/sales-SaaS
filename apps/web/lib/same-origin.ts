import { NextResponse } from "next/server";

function normalizeHttpOrigin(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function configuredOrigins(request: Request) {
  const origins = new Set<string>();
  const requestOrigin = normalizeHttpOrigin(request.url);

  if (requestOrigin) {
    origins.add(requestOrigin);
  }

  for (const value of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL,
  ]) {
    if (!value) {
      continue;
    }

    const origin = normalizeHttpOrigin(value);

    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
}

function hasCrossSiteFetchMetadata(request: Request) {
  return request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "cross-site";
}

export function isTrustedMutationOrigin(request: Request) {
  if (hasCrossSiteFetchMetadata(request)) {
    return false;
  }

  const allowedOrigins = configuredOrigins(request);
  const origin = request.headers.get("origin");

  if (origin) {
    const normalizedOrigin = normalizeHttpOrigin(origin);
    return normalizedOrigin !== null && allowedOrigins.has(normalizedOrigin);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    const normalizedReferer = normalizeHttpOrigin(referer);
    return normalizedReferer !== null && allowedOrigins.has(normalizedReferer);
  }

  return true;
}

export function rejectCrossOriginMutation(request: Request) {
  if (isTrustedMutationOrigin(request)) {
    return null;
  }

  return NextResponse.json(
    { error: "Cross-origin mutation requests are not allowed" },
    {
      status: 403,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
