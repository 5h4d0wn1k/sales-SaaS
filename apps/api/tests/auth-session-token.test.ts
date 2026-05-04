import { describe, expect, it } from "vitest";
import { encode as encodeAuthJsToken } from "next-auth/jwt";
import {
  decodeAuthSessionToken,
  getAuthSessionTokenFromCookies,
  parseCookieHeader,
} from "../src/auth-session-token";

describe("auth session token helpers", () => {
  it("reassembles chunked Auth.js cookies", () => {
    const token = getAuthSessionTokenFromCookies({
      "__Secure-authjs.session-token.1": "middle",
      "__Secure-authjs.session-token.0": "start-",
      "__Secure-authjs.session-token.2": "-end",
    });

    expect(token).toBe("start-middle-end");
  });

  it("parses cookie headers safely", () => {
    expect(
      parseCookieHeader("authjs.session-token=abc123; theme=dark"),
    ).toMatchObject({
      "authjs.session-token": "abc123",
      theme: "dark",
    });
  });

  it("decodes encrypted Auth.js session tokens", async () => {
    const secret = "sales-aaas-test-auth-secret";
    const token = await encodeAuthJsToken({
      secret,
      salt: "__Secure-authjs.session-token",
      token: {
        sub: "user-123",
        role: "owner",
      },
    });

    await expect(decodeAuthSessionToken(token, secret)).resolves.toMatchObject({
      sub: "user-123",
      role: "owner",
    });
  });
});
