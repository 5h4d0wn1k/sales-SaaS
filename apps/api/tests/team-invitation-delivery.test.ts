import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("resend");
  vi.unstubAllEnvs();
});

describe("team invitation email delivery", () => {
  it("normalizes subjects and escapes user-visible invite HTML", async () => {
    const sendMock = vi.fn(async (_message: {
      subject: string;
      html: string;
      text: string;
    }) => ({ id: "email_1" }));
    vi.doMock("resend", () => ({
      Resend: vi.fn(function ResendMock() {
        return {
          emails: {
            send: sendMock,
          },
        };
      }),
    }));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "secret-value");
    vi.stubEnv("RESEND_FROM_EMAIL", "sales@example.com");
    vi.stubEnv("FRONTEND_URL", "https://app.salesxgrowth.com");

    const { sendWorkspaceInvitationEmail } = await import("../src/team-invitation-delivery");
    const delivery = await sendWorkspaceInvitationEmail({
      email: "teammate@example.com",
      rawToken: "invite-token",
      workspaceName: "Outbound <Ops>",
      organizationName: "Northstar\r\nBcc: buyer@example.com",
      invitedByName: "Owner <script>alert(1)</script>",
    });
    const message = sendMock.mock.calls[0]?.[0];

    expect(delivery).toEqual({ mode: "email" });
    expect(message?.subject).toBe("Join Northstar Bcc: buyer@example.com in salesxgrowth");
    expect(message?.subject).not.toMatch(/[\r\n]/);
    expect(message?.html).toContain("Owner &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(message?.html).toContain("Outbound &lt;Ops&gt;");
    expect(message?.html).toContain("Northstar");
    expect(message?.html).not.toContain("<script>");
    expect(message?.text).toContain("Open this link to continue: https://app.salesxgrowth.com/get-started?");
  });

  it("blocks production invite delivery when transactional email is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FRONTEND_URL", "https://app.salesxgrowth.com");

    const { sendWorkspaceInvitationEmail } = await import("../src/team-invitation-delivery");
    const delivery = await sendWorkspaceInvitationEmail({
      email: "teammate@example.com",
      rawToken: "invite-token",
      workspaceName: "Outbound Ops",
      organizationName: "Northstar",
      invitedByName: "Owner",
    });

    expect(delivery).toEqual({ mode: "unavailable" });
  });

  it("blocks production invite delivery when the public app URL is missing", async () => {
    const sendMock = vi.fn(async () => ({ id: "email_1" }));
    vi.doMock("resend", () => ({
      Resend: vi.fn(function ResendMock() {
        return {
          emails: {
            send: sendMock,
          },
        };
      }),
    }));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "secret-value");
    vi.stubEnv("RESEND_FROM_EMAIL", "sales@example.com");

    const { sendWorkspaceInvitationEmail } = await import("../src/team-invitation-delivery");
    const delivery = await sendWorkspaceInvitationEmail({
      email: "teammate@example.com",
      rawToken: "invite-token",
      workspaceName: "Outbound Ops",
      organizationName: "Northstar",
      invitedByName: "Owner",
    });

    expect(delivery).toEqual({ mode: "unavailable" });
    expect(sendMock).not.toHaveBeenCalled();
  });
});
