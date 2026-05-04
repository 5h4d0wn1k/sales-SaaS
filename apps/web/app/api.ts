import { dashboardResponseSchema, type DashboardResponse } from "@sales/shared";
import {
  createServerApiHeaders,
  getServerApiBaseUrl,
  ServerApiUnauthorizedError,
} from "@/lib/server-api-auth";

type ErrorResponse = {
  error?: string;
};

export async function getDashboardData(): Promise<DashboardResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/dashboard`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServerApiUnauthorizedError();
      }

      throw new Error("Dashboard data is temporarily unavailable.");
    }

    return dashboardResponseSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof ServerApiUnauthorizedError) {
      throw error;
    }

    console.error("Failed to fetch dashboard data:", error);
    throw new Error("Dashboard data is temporarily unavailable.");
  }
}

// Billing portal data
export interface BillingPortalData {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  subscription: {
    id: string;
    planKey: string;
    status: string;
    seats: number;
    usageLimit: number;
    cancelAtPeriodEnd?: boolean;
    cancellationRequestedAt?: string | null;
    canceledAt?: string | null;
  } | null;
  paymentHistory: Array<{
    amount: number;
    currency: string;
    status: string;
    provider: string;
    createdAt?: string | null;
  }>;
  usage: Record<string, number>;
}

export async function getBillingPortalData(): Promise<BillingPortalData> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/billing/portal`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn("Billing API returned 401: Not authenticated");
        throw new ServerApiUnauthorizedError();
      }
      // Return empty structure
      return {
        organization: { id: "", name: "", slug: "" },
        subscription: null,
        paymentHistory: [],
        usage: {},
      };
    }

    return response.json();
  } catch (error) {
    if (error instanceof ServerApiUnauthorizedError) {
      throw error;
    }

    console.error("Failed to fetch billing portal data:", error);
    throw error;
  }
}

// Initialize checkout for plan change
export async function initiateCheckout(planKey: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
  const baseUrl = getServerApiBaseUrl();
  const headers = await createServerApiHeaders();

  const response = await fetch(`${baseUrl}/v1/billing/checkout/stripe`, {
    method: "POST",
    headers,
    body: JSON.stringify({ planKey, successUrl, cancelUrl }),
    cache: "no-store",
  });

  if (!response.ok) {
    const err = (await response.json()) as ErrorResponse;
    throw new Error(err.error || "Failed to initiate checkout");
  }

  return response.json();
}

// Cancel subscription
export async function cancelSubscription(): Promise<{ success: boolean }> {
  const baseUrl = getServerApiBaseUrl();
  const headers = await createServerApiHeaders();

  const response = await fetch(`${baseUrl}/v1/billing/cancel`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const err = (await response.json()) as ErrorResponse;
    throw new Error(err.error || "Failed to cancel subscription");
  }

  return response.json();
}
