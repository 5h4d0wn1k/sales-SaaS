import { describe, expect, it } from "vitest";
import { getSessionTokenFromCookieEntries } from "../lib/session-token";

describe("session token helper", () => {
  it("prefers Auth.js cookies and reassembles chunked values", () => {
    const token = getSessionTokenFromCookieEntries([
      { name: "__Secure-authjs.session-token.1", value: "middle" },
      { name: "__Secure-authjs.session-token.0", value: "start-" },
      { name: "__Secure-authjs.session-token.2", value: "-end" },
    ]);

    expect(token).toBe("start-middle-end");
  });

  it("falls back to legacy NextAuth cookie names", () => {
    const token = getSessionTokenFromCookieEntries([
      { name: "next-auth.session-token", value: "legacy-token" },
    ]);

    expect(token).toBe("legacy-token");
  });
});
