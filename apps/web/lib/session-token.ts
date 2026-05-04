type SessionCookieEntry = {
  name: string;
  value: string;
};

type CookieStoreLike = {
  getAll(): SessionCookieEntry[];
};

const AUTH_SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

function getCookieChunkIndex(name: string, cookieName: string) {
  if (name === cookieName) {
    return 0;
  }

  const suffix = name.slice(cookieName.length + 1);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function getSessionTokenFromCookieEntries(cookies: SessionCookieEntry[]) {
  for (const cookieName of AUTH_SESSION_COOKIE_NAMES) {
    const matchingCookies = cookies
      .filter(({ name, value }) => value && (name === cookieName || name.startsWith(`${cookieName}.`)))
      .sort((left, right) => {
        return getCookieChunkIndex(left.name, cookieName) - getCookieChunkIndex(right.name, cookieName);
      });

    if (matchingCookies.length > 0) {
      return matchingCookies.map(({ value }) => value).join("");
    }
  }

  return null;
}

export function getSessionTokenFromCookieStore(cookieStore: CookieStoreLike) {
  return getSessionTokenFromCookieEntries(cookieStore.getAll());
}
