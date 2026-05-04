import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

async function loadAppWithEnv(overrides: Record<string, string | undefined>) {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    AUTH_SECRET: process.env.AUTH_SECRET,
    ALLOW_TEST_AUTH_BYPASS: process.env.ALLOW_TEST_AUTH_BYPASS,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  };

  process.env.NODE_ENV = overrides.NODE_ENV ?? previous.NODE_ENV ?? "test";
  process.env.AUTH_SECRET = overrides.AUTH_SECRET ?? previous.AUTH_SECRET ?? "sales-aaas-test-auth-secret";

  if (overrides.ALLOW_TEST_AUTH_BYPASS === undefined) {
    delete process.env.ALLOW_TEST_AUTH_BYPASS;
  } else {
    process.env.ALLOW_TEST_AUTH_BYPASS = overrides.ALLOW_TEST_AUTH_BYPASS;
  }

  if (overrides.STRIPE_WEBHOOK_SECRET === undefined) {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  } else {
    process.env.STRIPE_WEBHOOK_SECRET = overrides.STRIPE_WEBHOOK_SECRET;
  }

  if (overrides.RAZORPAY_WEBHOOK_SECRET === undefined) {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  } else {
    process.env.RAZORPAY_WEBHOOK_SECRET = overrides.RAZORPAY_WEBHOOK_SECRET;
  }

  vi.resetModules();
  const { createApp } = await import("../src/app");

  return {
    app: createApp(),
    restore() {
      if (previous.NODE_ENV === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous.NODE_ENV;
      }

      if (previous.AUTH_SECRET === undefined) {
        delete process.env.AUTH_SECRET;
      } else {
        process.env.AUTH_SECRET = previous.AUTH_SECRET;
      }

      if (previous.ALLOW_TEST_AUTH_BYPASS === undefined) {
        delete process.env.ALLOW_TEST_AUTH_BYPASS;
      } else {
        process.env.ALLOW_TEST_AUTH_BYPASS = previous.ALLOW_TEST_AUTH_BYPASS;
      }

      if (previous.STRIPE_WEBHOOK_SECRET === undefined) {
        delete process.env.STRIPE_WEBHOOK_SECRET;
      } else {
        process.env.STRIPE_WEBHOOK_SECRET = previous.STRIPE_WEBHOOK_SECRET;
      }

      if (previous.RAZORPAY_WEBHOOK_SECRET === undefined) {
        delete process.env.RAZORPAY_WEBHOOK_SECRET;
      } else {
        process.env.RAZORPAY_WEBHOOK_SECRET = previous.RAZORPAY_WEBHOOK_SECRET;
      }
    },
  };
}

function createThrowingDbMock() {
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            throw new Error("database exploded");
          }),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => {
          throw new Error("database exploded");
        }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => {
        throw new Error("database exploded");
      }),
    })),
  };
}

function createLifecycleDbMock(selectResults: unknown[][]) {
  let selectIndex = 0;
  const updateWhereMock = vi.fn(async () => undefined);
  const updateSetMock = vi.fn(() => ({
    where: updateWhereMock,
  }));
  const updateMock = vi.fn(() => ({
    set: updateSetMock,
  }));

  return {
    dbMock: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => selectResults[selectIndex++] ?? []),
          })),
        })),
      })),
      update: updateMock,
      insert: vi.fn(() => ({
        values: vi.fn(async () => undefined),
      })),
    },
    updateMock,
    updateSetMock,
    updateWhereMock,
  };
}

async function loadBillingWebhookApp(options: {
  stripeEvent?: unknown;
  dbMock?: ReturnType<typeof createThrowingDbMock>;
}) {
  const actualDatabase = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const dbMock = options.dbMock ?? createThrowingDbMock();

  vi.doMock("@sales/database", () => ({
    ...actualDatabase,
    db: dbMock,
  }));

  vi.doMock("stripe", () => ({
    default: class Stripe {
      customers = { create: vi.fn() };
      checkout = { sessions: { create: vi.fn() } };
      paymentIntents = { retrieve: vi.fn() };
      subscriptions = { update: vi.fn() };
      webhooks = {
        constructEvent: vi.fn(() => options.stripeEvent),
      };
    },
  }));

  const { billingRoutes } = await import("../src/routes/billing");
  const app = new Hono();
  app.route("/v1/billing", billingRoutes);

  return { app };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unmock("@sales/database");
  vi.unmock("stripe");
});

describe("billing webhook ingress", () => {
  it("allows unauthenticated Stripe webhooks to reach the handler", async () => {
    const { app, restore } = await loadAppWithEnv({
      NODE_ENV: "test",
      AUTH_SECRET: "sales-aaas-test-auth-secret",
      ALLOW_TEST_AUTH_BYPASS: "false",
    });

    try {
      const response = await app.request("/v1/billing/webhook/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{}",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: "No signature",
      });
    } finally {
      restore();
    }
  }, 10000);

  it("allows unauthenticated Razorpay webhooks to reach the handler", async () => {
    const { app, restore } = await loadAppWithEnv({
      NODE_ENV: "test",
      AUTH_SECRET: "sales-aaas-test-auth-secret",
      ALLOW_TEST_AUTH_BYPASS: "false",
    });

    try {
      const response = await app.request("/v1/billing/webhook/razorpay", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{}",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: "Missing signature or secret",
      });
    } finally {
      restore();
    }
  }, 10000);

  it("returns 500 when verified Stripe webhook processing fails", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const { app } = await loadBillingWebhookApp({
      stripeEvent: {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: {
              organizationId: "org-1",
              planKey: "starter",
            },
            subscription: "sub_123",
          },
        },
      },
    });

    const response = await app.request("/v1/billing/webhook/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "sig_test",
      },
      body: "{}",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Webhook processing failed",
    });
  });

  it("returns 500 when verified Razorpay webhook processing fails", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret";
    const { app } = await loadBillingWebhookApp({});
    const body = JSON.stringify({
      event: "subscription.activated",
      payload: {
        subscription: {
          id: "sub_razorpay_123",
          notes: {
            organizationId: "org-1",
            planKey: "starter",
          },
        },
      },
    });
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    const response = await app.request("/v1/billing/webhook/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Razorpay-Signature": signature,
      },
      body,
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Webhook processing failed",
    });
  });

  it("records Stripe scheduled cancellations without downgrading the subscription early", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const lifecycle = createLifecycleDbMock([
      [
        {
          id: "sub-local-1",
          cancelAtPeriodEnd: false,
          cancellationRequestedAt: null,
        },
      ],
    ]);
    const { app } = await loadBillingWebhookApp({
      dbMock: lifecycle.dbMock as never,
      stripeEvent: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123",
            status: "active",
            cancel_at_period_end: true,
            items: {
              data: [],
            },
          },
        },
      },
    });

    const response = await app.request("/v1/billing/webhook/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": "sig_test",
      },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(lifecycle.updateMock).toHaveBeenCalledTimes(1);
    expect(lifecycle.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "active",
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: expect.any(Date),
      canceledAt: null,
    }));
    expect(lifecycle.updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("marks Razorpay subscriptions canceled when the provider sends the final cancellation event", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_webhook_secret";
    const lifecycle = createLifecycleDbMock([
      [
        {
          id: "sub-local-2",
        },
      ],
    ]);
    const { app } = await loadBillingWebhookApp({
      dbMock: lifecycle.dbMock as never,
    });
    const body = JSON.stringify({
      event: "subscription.cancelled",
      payload: {
        subscription: {
          id: "sub_razorpay_123",
        },
      },
    });
    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    const response = await app.request("/v1/billing/webhook/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signature,
      },
      body,
    });

    expect(response.status).toBe(200);
    expect(lifecycle.updateMock).toHaveBeenCalledTimes(1);
    expect(lifecycle.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      status: "canceled",
      cancelAtPeriodEnd: false,
      cancellationRequestedAt: expect.any(Date),
      canceledAt: expect.any(Date),
    }));
    expect(lifecycle.updateWhereMock).toHaveBeenCalledTimes(1);
  });
});
