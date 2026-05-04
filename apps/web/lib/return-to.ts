export function resolveReturnTo(
  candidate: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  if (typeof candidate !== "string") {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}

export function appendStatusParam(pathname: string, key: string, value: string) {
  const url = new URL(pathname, "http://localhost");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}
