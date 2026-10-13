export const LOCAL_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
] as const;

export function normalizeHttpOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function isOriginOnlyUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

export function getAllowedFrontendOrigins(input: {
  frontendUrl?: string | null;
  environment?: string;
} = {}) {
  const environment = input.environment ?? process.env.NODE_ENV ?? "development";
  const frontendOrigin = normalizeHttpOrigin(
    input.frontendUrl ?? process.env.FRONTEND_URL,
  );
  const origins = new Set<string>();

  if (frontendOrigin) {
    origins.add(frontendOrigin);
  }

  if (environment !== "production") {
    for (const origin of LOCAL_FRONTEND_ORIGINS) {
      origins.add(origin);
    }
  }

  return origins;
}

export function isAllowedFrontendReturnUrl(
  candidate: string,
  allowedOrigins = getAllowedFrontendOrigins(),
) {
  const origin = normalizeHttpOrigin(candidate);

  return origin !== null && allowedOrigins.has(origin);
}
