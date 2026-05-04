import { decode as decodeAuthJsToken } from "next-auth/jwt";
import { jwtVerify, type JWTPayload } from "jose";

const legacySecret = process.env.AUTH_SECRET
  ? new TextEncoder().encode(process.env.AUTH_SECRET)
  : null;

export const AUTH_SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

type CookieMap = Record<string, string>;

function getCookieChunkIndex(name: string, cookieName: string) {
  if (name === cookieName) {
    return 0;
  }

  const suffix = name.slice(cookieName.length + 1);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function parseCookieHeader(cookieHeader: string | null): CookieMap {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, value] = part.split("=").map((segment) => segment.trim());
    if (!key || !value) {
      return acc;
    }

    try {
      acc[key] = decodeURIComponent(value);
    } catch {
      acc[key] = value;
    }

    return acc;
  }, {} as CookieMap);
}

export function getAuthSessionTokenFromCookies(cookies: CookieMap) {
  for (const cookieName of AUTH_SESSION_COOKIE_NAMES) {
    const matchingCookies = Object.entries(cookies)
      .filter(([name, value]) => value && (name === cookieName || name.startsWith(`${cookieName}.`)))
      .sort(([left], [right]) => {
        return getCookieChunkIndex(left, cookieName) - getCookieChunkIndex(right, cookieName);
      });

    if (matchingCookies.length > 0) {
      return matchingCookies.map(([, value]) => value).join("");
    }
  }

  return null;
}

export async function decodeAuthSessionToken(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  for (const salt of AUTH_SESSION_COOKIE_NAMES) {
    try {
      const payload = await decodeAuthJsToken({
        token,
        secret,
        salt,
      });

      if (payload) {
        return payload;
      }
    } catch {
      // Try the next known salt.
    }
  }

  if (!legacySecret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, legacySecret, {
      algorithms: ["HS256"],
    });

    return payload;
  } catch {
    return null;
  }
}
