import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { PgDialect } from "drizzle-orm/pg-core";

const BILLING_PROVIDER_ENV_NAMES = [
  "STRIPE_SECRET_KEY",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
] as const;

const previousBillingProviderEnv = Object.fromEntries(
  BILLING_PROVIDER_ENV_NAMES.map((name) => [name, process.env[name]]),
) as Record<(typeof BILLING_PROVIDER_ENV_NAMES)[number], string | undefined>;

type SelectPlan =
  | {
      kind: "limit";
      result: unknown[];
      onWhere?: (expression: unknown) => void;
    }
  | {
      kind: "orderedLimit";
      result: unknown[];
      onWhere?: (expression: unknown) => void;
    }
  | {
      kind: "direct";
      result: unknown[];
      onWhere?: (expression: unknown) => void;
    };

function createDbMock(selectPlans: SelectPlan[]) {
  let selectCallCount = 0;

  const updateWhereMock = vi.fn(async () => undefined);
  const updateSetMock = vi.fn(() => ({
    where: updateWhereMock,
  }));
  const updateMock = vi.fn(() => ({
    set: updateSetMock,
  }));

  const selectMock = vi.fn(() => {
    const plan = selectPlans[selectCallCount++];

    if (!plan) {
      throw new Error(`Unexpected select call #${selectCallCount}`);
    }

    return {
      from: vi.fn(() => ({
        where: vi.fn((expression: unknown) => {
          plan.onWhere?.(expression);

          if (plan.kind === "direct") {
            return Promise.resolve(plan.result);
          }

          if (plan.kind === "orderedLimit") {
            return {
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => plan.result),
              })),
            };
          }

          return {
            limit: vi.fn(async () => plan.result),
          };
        }),
      })),
    };
  });

    return {
    dbMock: {
      select: selectMock,
      update: updateMock,
      insert: vi.fn(),
    },
    selectMock,
    updateMock,
    updateSetMock,
    updateWhereMock,
  };
}

function configureTestBillingProviderEnv() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  process.env.STRIPE_SECRET_KEY ??= "sk_test_billing_routes";
  process.env.RAZORPAY_KEY_ID ??= "rzp_test_billing_routes";
  process.env.RAZORPAY_KEY_SECRET ??= "razorpay-test-secret";
}

function restoreBillingProviderEnv() {
  for (const name of BILLING_PROVIDER_ENV_NAMES) {
    const value = previousBillingProviderEnv[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

async function loadBillingApp(
  dbMock: ReturnType<typeof createDbMock>["dbMock"],
  options: {
    role?: "owner" | "admin" | "member";
    emailVerified?: boolean;
    organizationId?: string;
    stripeCheckoutError?: Error;
    stripeUpdateError?: Error;
    razorpayCheckoutError?: Error;
    razorpayCancelError?: Error;
  } = {},
) {
  configureTestBillingProviderEnv();
  const actualDatabase = await vi.importActual<typeof import("@sales/database")>("@sales/database");
  const stripeConstructorMock = vi.fn();
  const razorpayConstructorMock = vi.fn();
  const stripeCheckoutMock = vi.fn(async () => {
    if (options.stripeCheckoutError) {
      throw options.stripeCheckoutError;
    }

    return {
      url: "https://checkout.stripe.example/session",
    };
  });
  const stripeUpdateMock = vi.fn(async () => {
    if (options.stripeUpdateError) {
      throw options.stripeUpdateError;
    }

    return {};
  });
  const razorpayCheckoutMock = vi.fn(async () => {
    if (options.razorpayCheckoutError) {
      throw options.razorpayCheckoutError;
    }

    return {
      id: "razorpay-sub-created",
    };
  });
  const razorpayCancelMock = vi.fn(async () => {
    if (options.razorpayCancelError) {
      throw options.razorpayCancelError;
    }

    return {};
  });

  vi.doMock("@sales/database", () => ({
    ...actualDatabase,
    db: dbMock,
  }));

  vi.doMock("stripe", () => ({
    default: class Stripe {
      constructor(apiKey: string) {
        stripeConstructorMock(apiKey);
      }

      customers = { create: vi.fn() };
      checkout = { sessions: { create: stripeCheckoutMock } };
      paymentIntents = { retrieve: vi.fn() };
      subscriptions = { update: stripeUpdateMock };
      webhooks = { constructEvent: vi.fn() };
    },
  }));

  vi.doMock("razorpay", () => ({
    default: class Razorpay {
      constructor(options: { key_id: string; key_secret: string }) {
        razorpayConstructorMock(options);
      }

      customers = { create: vi.fn() };
      subscriptions = {
        create: razorpayCheckoutMock,
        cancel: razorpayCancelMock,
      };
    },
  }));

  const { billingRoutes } = await import("../src/routes/billing");

  const app = new Hono<{
    Variables: {
      user: {
        id: string;
        email: string;
        role: "owner" | "admin" | "member";
        emailVerified: boolean;
        organizationId?: string;
      };
    };
  }>();
  app.use("*", async (c, next) => {
    c.set("user", {
      id: "user-1",
      email: "owner@example.com",
      role: options.role ?? "owner",
      emailVerified: options.emailVerified ?? true,
      organizationId: Object.prototype.hasOwnProperty.call(options, "organizationId")
        ? options.organizationId
        : "org-1",
    });
    await next();
  });
  app.route("/v1/billing", billingRoutes);

  return {
    app,
    stripeConstructorMock,
    stripeCheckoutMock,
    stripeUpdateMock,
    razorpayConstructorMock,
    razorpayCheckoutMock,
    razorpayCancelMock,
  };
}

afterEach(() => {
  restoreBillingProviderEnv();
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("@sales/database");
  vi.doUnmock("stripe");
  vi.doUnmock("razorpay");
});

describe("billing routes", () => {
  it("keeps the billing portal usage query scoped to the current organization", async () => {
    let usageWhereExpression: unknown;

    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            id: "org-1",
            name: "Northstar Labs",
            slug: "northstar-labs",
          },
        ],
      },
      {
        kind: "limit",
        result: [
          {
            id: "sub-1",
            planKey: "starter",
            status: "active",
          },
        ],
      },
      {
        kind: "orderedLimit",
        result: [],
      },
      {
        kind: "direct",
        result: [
          {
            metric: "leads_created",
            quantity: 7,
          },
          {
            metric: "provider_cost_cents",
            quantity: 25,
          },
        ],
        onWhere(expression) {
          usageWhereExpression = expression;
        },
      },
    ]);

    const { app } = await loadBillingApp(db.dbMock);
    const response = await app.request("/v1/billing/portal");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      subscription: {
        providerCostBudgetCents: 1500,
        includedChannels: ["email"],
      },
      usage: {
        leads_created: 7,
        provider_cost_cents: 25,
      },
    });

    expect(usageWhereExpression).toBeTruthy();

    const compiled = new PgDialect().sqlToQuery(usageWhereExpression as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(compiled.sql).toContain('"usage_events"."organization_id" = $1');
    expect(compiled.sql).toContain('"usage_events"."created_at" > $2');
    expect(compiled.params[0]).toBe("org-1");
  });

  it("marks Stripe subscriptions for end-of-period cancellation without downgrading them early", async () => {
    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            id: "sub-1",
            status: "active",
            stripeSubscriptionId: "stripe-sub-1",
            razorpaySubscriptionId: null,
          },
        ],
      },
    ]);

    const { app, stripeUpdateMock } = await loadBillingApp(db.dbMock);
    const response = await app.request("/v1/billing/cancel", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      status: "active",
      cancelAtPeriodEnd: true,
    });
    expect(stripeUpdateMock).toHaveBeenCalledWith("stripe-sub-1", {
      cancel_at_period_end: true,
    });
    expect(db.updateMock).toHaveBeenCalledTimes(1);
    expect(db.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: expect.any(Date),
      canceledAt: null,
    }));
    expect(db.updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("schedules Razorpay cancellations for the end of the billing cycle", async () => {
    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            id: "sub-2",
            status: "active",
            stripeSubscriptionId: null,
            razorpaySubscriptionId: "razorpay-sub-1",
          },
        ],
      },
    ]);

    const { app, razorpayCancelMock } = await loadBillingApp(db.dbMock);
    const response = await app.request("/v1/billing/cancel", {
      method: "POST",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      status: "active",
      cancelAtPeriodEnd: true,
    });
    expect(razorpayCancelMock).toHaveBeenCalledWith("razorpay-sub-1", true);
    expect(db.updateMock).toHaveBeenCalledTimes(1);
    expect(db.updateSetMock).toHaveBeenCalledWith(expect.objectContaining({
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: expect.any(Date),
      canceledAt: null,
    }));
    expect(db.updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("does not leak internal billing portal errors to clients", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = createDbMock([]);

    const { app } = await loadBillingApp(db.dbMock);
    const response = await app.request("/v1/billing/portal");
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Billing portal is temporarily unavailable.",
    });
    expect(JSON.stringify(body)).not.toContain("Unexpected select call");
    expect(consoleError).toHaveBeenCalledWith(
      "Billing portal error:",
      expect.objectContaining({
        message: expect.stringContaining("Unexpected select call"),
      }),
    );
    consoleError.mockRestore();
  });

  it("returns client errors for malformed checkout JSON", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = createDbMock([]);

    const {
      app,
      stripeCheckoutMock,
      razorpayCheckoutMock,
    } = await loadBillingApp(db.dbMock);

    for (const path of [
      "/v1/billing/checkout/stripe",
      "/v1/billing/checkout/razorpay",
    ] as const) {
      const response = await app.request(path, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: "{",
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: "Invalid billing JSON payload.",
        code: "invalid_json",
        requestId: null,
      });
    }

    expect(db.selectMock).not.toHaveBeenCalled();
    expect(stripeCheckoutMock).not.toHaveBeenCalled();
    expect(razorpayCheckoutMock).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("does not leak Stripe checkout provider errors to clients", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            stripeCustomerId: "cus-existing",
          },
        ],
      },
    ]);

    const { app, stripeCheckoutMock } = await loadBillingApp(db.dbMock, {
      stripeCheckoutError: new Error("stripe provider secret failure"),
    });
    const response = await app.request("/v1/billing/checkout/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        planKey: "starter",
        successUrl: "http://localhost:3000/success",
        cancelUrl: "http://localhost:3000/cancel",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Stripe checkout is temporarily unavailable.",
    });
    expect(JSON.stringify(body)).not.toContain("provider secret");
    expect(stripeCheckoutMock).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "Stripe checkout error:",
      expect.objectContaining({
        message: "stripe provider secret failure",
      }),
    );
    consoleError.mockRestore();
  });

  it("does not leak Razorpay checkout provider errors to clients", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            razorpayCustomerId: "cust_existing",
          },
        ],
      },
    ]);

    const { app, razorpayCheckoutMock } = await loadBillingApp(db.dbMock, {
      razorpayCheckoutError: new Error("razorpay provider secret failure"),
    });
    const response = await app.request("/v1/billing/checkout/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        planKey: "starter",
        successUrl: "http://localhost:3000/success",
        cancelUrl: "http://localhost:3000/cancel",
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Razorpay checkout is temporarily unavailable.",
    });
    expect(JSON.stringify(body)).not.toContain("provider secret");
    expect(razorpayCheckoutMock).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      "Razorpay checkout error:",
      expect.objectContaining({
        message: "razorpay provider secret failure",
      }),
    );
    consoleError.mockRestore();
  });

  it("does not leak provider errors during subscription cancellation", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            id: "sub-1",
            status: "active",
            stripeSubscriptionId: "stripe-sub-1",
            razorpaySubscriptionId: null,
          },
        ],
      },
    ]);

    const { app, stripeUpdateMock } = await loadBillingApp(db.dbMock, {
      stripeUpdateError: new Error("stripe cancellation secret failure"),
    });
    const response = await app.request("/v1/billing/cancel", {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: "Billing cancellation is temporarily unavailable.",
    });
    expect(JSON.stringify(body)).not.toContain("secret failure");
    expect(stripeUpdateMock).toHaveBeenCalledWith("stripe-sub-1", {
      cancel_at_period_end: true,
    });
    expect(db.updateMock).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Cancel subscription error:",
      expect.objectContaining({
        message: "stripe cancellation secret failure",
      }),
    );
    consoleError.mockRestore();
  });

  it("blocks members from mutating billing state", async () => {
    const db = createDbMock([]);

    const { app } = await loadBillingApp(db.dbMock, { role: "member" });
    const checkoutResponse = await app.request("/v1/billing/checkout/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        planKey: "starter",
        successUrl: "http://localhost:3000/success",
        cancelUrl: "http://localhost:3000/cancel",
      }),
    });
    const cancelResponse = await app.request("/v1/billing/cancel", {
      method: "POST",
    });

    expect(checkoutResponse.status).toBe(403);
    await expect(checkoutResponse.json()).resolves.toMatchObject({
      error: "Billing management requires owner or admin access",
    });
    expect(cancelResponse.status).toBe(403);
    await expect(cancelResponse.json()).resolves.toMatchObject({
      error: "Billing management requires owner or admin access",
    });
    expect(db.selectMock).not.toHaveBeenCalled();
    expect(db.updateMock).not.toHaveBeenCalled();
  });

  it("requires verified email before billing mutations", async () => {
    const db = createDbMock([]);

    const { app } = await loadBillingApp(db.dbMock, {
      role: "owner",
      emailVerified: false,
    });
    const response = await app.request("/v1/billing/cancel", {
      method: "POST",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Verify your email before managing billing or starting paid checkout.",
      code: "email_verification_required",
    });
    expect(db.selectMock).not.toHaveBeenCalled();
    expect(db.updateMock).not.toHaveBeenCalled();
  });

  it("fails closed when Stripe billing is not configured outside tests", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousStripeSecret = process.env.STRIPE_SECRET_KEY;
    process.env.NODE_ENV = "production";
    delete process.env.STRIPE_SECRET_KEY;

    const db = createDbMock([]);

    try {
      const { app, stripeConstructorMock } = await loadBillingApp(db.dbMock, {
        role: "owner",
      });
      const response = await app.request("/v1/billing/checkout/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          planKey: "starter",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      });

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({
        error: "stripe billing is not configured",
      });
      expect(db.selectMock).not.toHaveBeenCalled();
      expect(stripeConstructorMock).not.toHaveBeenCalled();
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }

      if (previousStripeSecret === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = previousStripeSecret;
      }
    }
  });

  it("fails closed when Razorpay billing is not configured outside tests", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousKeyId = process.env.RAZORPAY_KEY_ID;
    const previousKeySecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const db = createDbMock([]);

    try {
      const { app, razorpayConstructorMock } = await loadBillingApp(db.dbMock, {
        role: "owner",
      });
      const response = await app.request("/v1/billing/checkout/razorpay", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          planKey: "starter",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      });

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({
        error: "razorpay billing is not configured",
      });
      expect(db.selectMock).not.toHaveBeenCalled();
      expect(razorpayConstructorMock).not.toHaveBeenCalled();
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }

      if (previousKeyId === undefined) {
        delete process.env.RAZORPAY_KEY_ID;
      } else {
        process.env.RAZORPAY_KEY_ID = previousKeyId;
      }

      if (previousKeySecret === undefined) {
        delete process.env.RAZORPAY_KEY_SECRET;
      } else {
        process.env.RAZORPAY_KEY_SECRET = previousKeySecret;
      }
    }
  });

  it("rejects checkout return URLs that do not match the allowed frontend origin", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFrontendUrl = process.env.FRONTEND_URL;
    const previousStripeSecret = process.env.STRIPE_SECRET_KEY;
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://app.example.com";
    process.env.STRIPE_SECRET_KEY = "sk_test_configured";

    const db = createDbMock([]);

    try {
      const { app } = await loadBillingApp(db.dbMock, { role: "owner" });
      const response = await app.request("/v1/billing/checkout/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          planKey: "starter",
          successUrl: "https://evil.example.com/success",
          cancelUrl: "https://app.example.com/cancel",
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: "Checkout return URLs must use an allowed frontend origin",
      });
      expect(db.selectMock).not.toHaveBeenCalled();
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }

      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }

      if (previousStripeSecret === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = previousStripeSecret;
      }
    }
  });

  it("accepts checkout return URLs on the normalized production frontend origin", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFrontendUrl = process.env.FRONTEND_URL;
    const previousStripeSecret = process.env.STRIPE_SECRET_KEY;
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://app.example.com/";
    process.env.STRIPE_SECRET_KEY = "sk_test_configured";

    const db = createDbMock([
      {
        kind: "limit",
        result: [
          {
            stripeCustomerId: "cus-existing",
          },
        ],
      },
    ]);

    try {
      const { app, stripeCheckoutMock } = await loadBillingApp(db.dbMock, {
        role: "owner",
      });
      const response = await app.request("/v1/billing/checkout/stripe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          planKey: "starter",
          successUrl: "https://app.example.com/billing/success?checkout=1",
          cancelUrl: "https://app.example.com/billing/cancel",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        url: "https://checkout.stripe.example/session",
      });
      expect(stripeCheckoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: "https://app.example.com/billing/success?checkout=1",
          cancel_url: "https://app.example.com/billing/cancel",
        }),
      );
    } finally {
      if (previousNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }

      if (previousFrontendUrl === undefined) {
        delete process.env.FRONTEND_URL;
      } else {
        process.env.FRONTEND_URL = previousFrontendUrl;
      }

      if (previousStripeSecret === undefined) {
        delete process.env.STRIPE_SECRET_KEY;
      } else {
        process.env.STRIPE_SECRET_KEY = previousStripeSecret;
      }
    }
  });

  it("fails closed when checkout is attempted without an organization context", async () => {
    const db = createDbMock([]);
    const { app } = await loadBillingApp(db.dbMock, {
      role: "owner",
      organizationId: undefined,
    });

    const response = await app.request("/v1/billing/checkout/stripe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        planKey: "starter",
        successUrl: "http://localhost:3000/success",
        cancelUrl: "http://localhost:3000/cancel",
      }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "No organization associated with user",
    });
    expect(db.selectMock).not.toHaveBeenCalled();
    expect(db.updateMock).not.toHaveBeenCalled();
  });
});
