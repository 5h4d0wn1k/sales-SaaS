import { describe, expect, it, vi } from "vitest";
import {
  getStripeProviderPaymentId,
  insertPaymentIfMissing,
} from "../src/routes/billing-payment-records";

function createPaymentDbMock(existingRecords: unknown[] = []) {
  const limitMock = vi.fn(async () => existingRecords);
  const whereMock = vi.fn(() => ({
    limit: limitMock,
  }));
  const fromMock = vi.fn(() => ({
    where: whereMock,
  }));
  const selectMock = vi.fn(() => ({
    from: fromMock,
  }));

  const valuesMock = vi.fn(async () => undefined);
  const insertMock = vi.fn(() => ({
    values: valuesMock,
  }));

  return {
    db: {
      select: selectMock,
      insert: insertMock,
    },
    insertMock,
    valuesMock,
    whereMock,
    limitMock,
  };
}

describe("billing payment idempotency", () => {
  it("skips duplicate payment inserts when the provider payment ID already exists", async () => {
    const mock = createPaymentDbMock([{ id: "pay-1" }]);

    const inserted = await insertPaymentIfMissing(mock.db, {
      organizationId: "org-1",
      amount: 4999,
      currency: "USD",
      status: "succeeded",
      provider: "stripe",
      providerPaymentId: "pi_123",
      receiptUrl: null,
    });

    expect(inserted).toBe(false);
    expect(mock.insertMock).not.toHaveBeenCalled();
  });

  it("inserts a payment when no matching provider payment ID exists", async () => {
    const mock = createPaymentDbMock([]);

    const inserted = await insertPaymentIfMissing(mock.db, {
      organizationId: "org-1",
      amount: 4999,
      currency: "USD",
      status: "succeeded",
      provider: "stripe",
      providerPaymentId: "pi_124",
      receiptUrl: "https://example.com/receipt",
    });

    expect(inserted).toBe(true);
    expect(mock.insertMock).toHaveBeenCalledTimes(1);
    expect(mock.valuesMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      amount: 4999,
      currency: "USD",
      status: "succeeded",
      provider: "stripe",
      providerPaymentId: "pi_124",
      receiptUrl: "https://example.com/receipt",
    });
  });

  it("still inserts payments without a provider payment ID", async () => {
    const mock = createPaymentDbMock([{ id: "pay-1" }]);

    const inserted = await insertPaymentIfMissing(mock.db, {
      organizationId: "org-1",
      amount: 4999,
      currency: "USD",
      status: "failed",
      provider: "stripe",
      providerPaymentId: null,
      receiptUrl: null,
    });

    expect(inserted).toBe(true);
    expect(mock.insertMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the Stripe invoice ID when payment_intent is absent", () => {
    expect(
      getStripeProviderPaymentId({
        payment_intent: null,
        id: "in_123",
      }),
    ).toBe("in_123");
  });

  it("treats a database unique violation as an idempotent duplicate", async () => {
    const duplicateError = Object.assign(new Error("duplicate key"), {
      code: "23505",
    });
    const valuesMock = vi.fn(async () => {
      throw duplicateError;
    });
    const insertMock = vi.fn(() => ({
      values: valuesMock,
    }));
    const selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => []),
        })),
      })),
    }));

    const inserted = await insertPaymentIfMissing(
      {
        select: selectMock,
        insert: insertMock,
      },
      {
        organizationId: "org-1",
        amount: 4999,
        currency: "USD",
        status: "succeeded",
        provider: "stripe",
        providerPaymentId: "pi_race",
        receiptUrl: null,
      },
    );

    expect(inserted).toBe(false);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
