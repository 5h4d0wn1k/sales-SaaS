import { and, eq } from "drizzle-orm";
import { payments } from "@sales/database";

type PaymentDatabase = {
  select: any;
  insert: any;
};

type PaymentInsertRecord = typeof payments.$inferInsert;

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function insertPaymentIfMissing<TDatabase extends PaymentDatabase>(
  database: TDatabase,
  paymentRecord: PaymentInsertRecord,
) {
  if (paymentRecord.providerPaymentId) {
    const [existing] = await database
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.provider, paymentRecord.provider),
          eq(payments.providerPaymentId, paymentRecord.providerPaymentId),
        ),
      )
      .limit(1);

    if (existing) {
      return false;
    }
  }

  try {
    await database.insert(payments).values(paymentRecord);
  } catch (error) {
    if (paymentRecord.providerPaymentId && isUniqueViolation(error)) {
      return false;
    }

    throw error;
  }

  return true;
}

export function getStripeProviderPaymentId(source: {
  payment_intent?: string | null;
  id?: string | null;
}) {
  if (typeof source.payment_intent === "string" && source.payment_intent.length > 0) {
    return source.payment_intent;
  }

  if (typeof source.id === "string" && source.id.length > 0) {
    return source.id;
  }

  return null;
}
