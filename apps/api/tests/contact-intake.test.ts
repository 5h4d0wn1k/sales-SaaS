import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONTACT_INTAKE_MAX_BODY_BYTES,
  contactIntakeResponseSchema,
} from "@sales/shared";

async function loadApp() {
  process.env.NODE_ENV = "test";
  process.env.AUTH_SECRET = "sales-aaas-test-auth-secret";
  delete process.env.ALLOW_TEST_AUTH_BYPASS;
  delete process.env.DATABASE_URL;

  vi.resetModules();
  const { createApp } = await import("../src/app");
  return createApp();
}

function validContactIntake(overrides: Record<string, unknown> = {}) {
  return {
    intent: "sales_assessment",
    name: "Nina Carter",
    email: "nina@example.com",
    companyName: "VectrCloud",
    website: "https://vectrcloud.example",
    monthlyLeadGoal: 500,
    timeline: "this_month",
    budgetRange: "1500_5000",
    goals: ["Generate qualified leads"],
    channels: ["email", "call"],
    message:
      "We want a structured sales assessment before launching a qualified outbound workflow.",
    ...overrides,
  };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.doUnmock("resend");
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.CONTACT_INTAKE_TO_EMAIL;
  delete process.env.ALLOW_TEST_AUTH_BYPASS;
});

describe("contact intake API", () => {
  it("captures public buyer intent without requiring an authenticated workspace", async () => {
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.10",
      },
      body: JSON.stringify({
        intent: "managed_services",
        name: "Priya Shah",
        email: "priya@example.com",
        companyName: "OrbitOps",
        website: "https://orbitops.example",
        role: "Founder",
        teamSize: "12",
        monthlyLeadGoal: 1200,
        budgetRange: "5000_plus",
        timeline: "this_week",
        goals: ["Book demos", "Launch outbound"],
        channels: ["email", "call", "telegram"],
        message:
          "We need a reviewable outbound system with managed setup, provider readiness, and Telegram visibility.",
      }),
    });

    expect(response.status).toBe(201);
    const payload = contactIntakeResponseSchema.parse(await response.json());

    expect(payload.submission).toMatchObject({
      intent: "managed_services",
      email: "priya@example.com",
      companyName: "OrbitOps",
      priority: "high",
      qualificationScore: 100,
      status: "new",
    });
    expect(payload.notification).toMatchObject({
      mode: "preview",
      provider: "resend",
    });
    expect(payload.detail).toContain("priority");
  });

  it("sends a notification email when contact intake delivery is configured", async () => {
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(validContactIntake({
        sourcePath: "/sales-blueprint",
        referrer: "https://winrate.example/sales-blueprint?blueprintReadiness=90",
        utm: {
          source: "sales_blueprint_tool",
          medium: "owned_tool",
          campaign: "blueprint_readiness",
          pricingPlan: "starter",
          pricingIntent: "blueprint_commercial_fit",
          managedPackage: "operator-assist",
          managedIntent: "blueprint_commercial_fit",
          solutionSegment: "founders-validating-outbound",
          segment: "Founder-led software teams",
          integration: "telegram-command-center",
          integrationIntent: "beta_rollout",
          integrationStatus: "Guarded beta",
          integrationCommercialPath: "Pilot with review gates",
        },
      })),
    });
    const payload = contactIntakeResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(payload.notification).toMatchObject({
      mode: "email",
      provider: "resend",
    });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "sales@example.com",
        to: "hello@example.com",
        replyTo: "nina@example.com",
        subject: expect.stringContaining("VectrCloud"),
        text: expect.stringMatching(
          /Source path: \/sales-blueprint[\s\S]*Referrer: https:\/\/winrate\.example\/sales-blueprint\?blueprintReadiness=90[\s\S]*Acquisition source: sales_blueprint_tool[\s\S]*Acquisition campaign: blueprint_readiness[\s\S]*Pricing plan: starter[\s\S]*Pricing intent: blueprint_commercial_fit[\s\S]*Managed package: operator-assist[\s\S]*Managed intent: blueprint_commercial_fit[\s\S]*Solution segment: founders-validating-outbound[\s\S]*Segment label: Founder-led software teams[\s\S]*Requested integration: telegram-command-center[\s\S]*Integration intent: beta_rollout[\s\S]*Integration status: Guarded beta[\s\S]*Integration commercial path: Pilot with review gates[\s\S]*Monthly lead goal: 500/,
        ),
      }),
    );
  });

  it("redacts secret-like intake content before storing and notifying", async () => {
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(validContactIntake({
        message:
          "We pasted api_key=sk-testtokenvalue123456789012345 and Bearer ghp_123456789012345678901234567890123456 while asking for launch help.",
        utm: {
          campaign: "secret=sk_live_123456789012345678901234",
        },
      })),
    });
    const payload = contactIntakeResponseSchema.parse(await response.json());
    const email = (
      sendMock.mock.calls as unknown as Array<[
        {
          html?: string;
          text?: string;
        },
      ]>
    )[0]?.[0];

    expect(response.status).toBe(201);
    expect(payload.submission.message).toContain("[redacted secret-like value]");
    expect(payload.submission.message).not.toContain("sk-testtokenvalue");
    expect(payload.submission.message).not.toContain("ghp_1234567890");
    expect(payload.submission.utm.campaign).toContain("[redacted secret-like value]");
    expect(email?.text).toContain(
      "Sensitive content: Secret-like values were redacted before storage and notification.",
    );
    expect(email?.text).not.toContain("sk-testtokenvalue");
    expect(email?.text).not.toContain("ghp_1234567890");
    expect(email?.html).not.toContain("sk-testtokenvalue");
  });

  it("rejects oversized public intake bodies before parsing JSON", async () => {
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(CONTACT_INTAKE_MAX_BODY_BYTES + 1),
      },
      body: "{",
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error:
        "Contact request is too large. Please keep the message under 2,400 characters and submit business context only.",
      maxBodyBytes: CONTACT_INTAKE_MAX_BODY_BYTES,
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects oversized public intake streams when content length is unavailable", async () => {
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "not-a-number",
      },
      body: "a".repeat(CONTACT_INTAKE_MAX_BODY_BYTES + 1),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error:
        "Contact request is too large. Please keep the message under 2,400 characters and submit business context only.",
      maxBodyBytes: CONTACT_INTAKE_MAX_BODY_BYTES,
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns a client error for malformed contact intake JSON", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid contact intake JSON payload.",
      code: "invalid_json",
      requestId: expect.any(String),
    });
    expect(sendMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalledWith(
      "Unhandled API error:",
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it("normalizes notification subjects and keeps provider failures best-effort", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sendMock = vi.fn(async (_message: { subject: string }) => {
      throw new Error("provider rejected message");
    });
    vi.doMock("resend", () => ({
      Resend: vi.fn(function ResendMock() {
        return {
          emails: {
            send: sendMock,
          },
        };
      }),
    }));
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(validContactIntake({
        companyName: "VectrCloud\r\nBcc: buyer@example.com",
      })),
    });
    const payload = contactIntakeResponseSchema.parse(await response.json());
    const message = sendMock.mock.calls[0]?.[0];

    expect(response.status).toBe(201);
    expect(payload.submission.companyName).toBe("VectrCloud\r\nBcc: buyer@example.com");
    expect(payload.notification).toMatchObject({
      mode: "failed",
      provider: "resend",
    });
    expect(message?.subject).toBe(
      "[Winrate high] VectrCloud Bcc: buyer@example.com sales assessment",
    );
    expect(message?.subject).not.toMatch(/[\r\n]/);
    expect(errorSpy).toHaveBeenCalledWith(
      "Contact intake notification failed:",
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it("accepts honeypot submissions without storing or notifying", async () => {
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
    process.env.RESEND_API_KEY = "secret-value";
    process.env.RESEND_FROM_EMAIL = "sales@example.com";
    process.env.CONTACT_INTAKE_TO_EMAIL = "hello@example.com";
    const app = await loadApp();
    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.20",
      },
      body: JSON.stringify(validContactIntake({
        companyWebsiteUrl: "https://trap.example",
      })),
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      detail: "Your request was captured for review.",
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rate-limits repeated public intake attempts from the same client", async () => {
    const app = await loadApp();

    for (let index = 0; index < 5; index += 1) {
      const response = await app.request("/v1/contact/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.30",
        },
        body: JSON.stringify(validContactIntake({
          email: `buyer-${index}@example.com`,
        })),
      });

      expect(response.status).toBe(201);
    }

    const response = await app.request("/v1/contact/intake", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.30",
      },
      body: JSON.stringify(validContactIntake({
        email: "buyer-limited@example.com",
      })),
    });
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(response.headers.get("RateLimit-Limit")).toBe("5");
    expect(response.headers.get("RateLimit-Remaining")).toBe("0");
    expect(Number(response.headers.get("RateLimit-Reset"))).toBeGreaterThan(0);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(Number(response.headers.get("X-RateLimit-Reset"))).toBeGreaterThan(0);
    expect(payload).toMatchObject({
      error: "Too many contact requests. Please try again later.",
    });
  });

  it("keeps workspace routes protected while contact intake stays public", async () => {
    const app = await loadApp();
    const response = await app.request("/v1/dashboard");

    expect(response.status).toBe(401);
  });
});
