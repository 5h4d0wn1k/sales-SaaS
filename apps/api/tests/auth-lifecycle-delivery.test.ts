import { afterEach, describe, expect, it, vi } from "vitest";

async function loadAuthLifecycleDelivery() {
  const database = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const transactionMock = vi.fn(async (callback: (tx: {
    delete: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  }) => Promise<unknown>) =>
    callback({
      delete: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(async () => undefined),
      })),
    }),
  );
  const sendMock = vi.fn(async (_message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => ({ id: "email_1" }));

  vi.doMock("@sales/database", () => ({
    ...database,
    db: {
      transaction: transactionMock,
    },
  }));
  vi.doMock("resend", () => ({
    Resend: vi.fn(function ResendMock() {
      return {
        emails: {
          send: sendMock,
        },
      };
    }),
  }));

  const lifecycle = await import("../src/auth-lifecycle");

  return {
    ...lifecycle,
    sendMock,
    transactionMock,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.doUnmock("@sales/database");
  vi.doUnmock("resend");
  vi.unstubAllEnvs();
});

describe("auth lifecycle email delivery", () => {
  it("does not send production verification email when the public app URL is missing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "secret-value");
    vi.stubEnv("RESEND_FROM_EMAIL", "sales@example.com");
    const { issueEmailVerification, sendMock } = await loadAuthLifecycleDelivery();

    const result = await issueEmailVerification({
      id: "user-1",
      email: "OWNER@EXAMPLE.COM",
      displayName: "Owner Example",
      emailVerified: null,
    });

    expect(result).toMatchObject({
      email: "owner@example.com",
      delivery: {
        mode: "unavailable",
      },
    });
    expect(result.delivery).not.toHaveProperty("previewUrl");
    expect(sendMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Lifecycle email delivery is unavailable: missing Resend or FRONTEND_URL configuration.",
    );
  });

  it("uses the configured public app URL in production verification email links", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "secret-value");
    vi.stubEnv("RESEND_FROM_EMAIL", "sales@example.com");
    vi.stubEnv("FRONTEND_URL", "https://app.winrate.ai");
    const { issueEmailVerification, sendMock } = await loadAuthLifecycleDelivery();

    const result = await issueEmailVerification({
      id: "user-1",
      email: "owner@example.com",
      displayName: "Owner Example",
      emailVerified: null,
    });
    const message = sendMock.mock.calls[0]?.[0];

    expect(result.delivery).toEqual({ mode: "email" });
    expect(message?.to).toBe("owner@example.com");
    expect(message?.subject).toBe("Verify your Winrate account");
    expect(message?.text).toContain("https://app.winrate.ai/verify-email?");
    expect(message?.html).toContain("https://app.winrate.ai/verify-email?");
  });
});
