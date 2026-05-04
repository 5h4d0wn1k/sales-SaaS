import {
  workspaceInvitationListSchema,
  dashboardResponseSchema,
  providerSummarySchema,
  workspaceTeamMemberListSchema,
  type ProviderSummary,
  type DashboardResponse,
  type WorkspaceInvitation,
  workspaceMembershipListSchema,
  type WorkspaceMembershipList,
  type WorkspaceTeamMember,
} from "@sales/shared";
import {
  createServerApiHeaders,
  getServerApiBaseUrl,
  ServerApiUnauthorizedError,
  ServerApiWorkspaceSelectionRequiredError,
} from "@/lib/server-api-auth";

type ErrorResponse = {
  error?: string;
  code?: string;
};

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

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

      if (response.status === 409) {
        const err = await readErrorResponse(response);
        if (err.code === "workspace_selection_required") {
          throw new ServerApiWorkspaceSelectionRequiredError(
            err.error ?? "Workspace selection required.",
          );
        }
      }

      throw new Error("Dashboard data is temporarily unavailable.");
    }

    return dashboardResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch dashboard data:", error);
    throw new Error("Dashboard data is temporarily unavailable.");
  }
}

export async function getWorkspaceMemberships(): Promise<WorkspaceMembershipList["memberships"]> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/account/workspaces`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServerApiUnauthorizedError();
      }

      const err = await readErrorResponse(response);
      throw new Error(err.error || "Workspace data is temporarily unavailable.");
    }

    return workspaceMembershipListSchema.parse(await response.json()).memberships;
  } catch (error) {
    if (error instanceof ServerApiUnauthorizedError) {
      throw error;
    }

    console.error("Failed to fetch workspace memberships:", error);
    throw error;
  }
}

export async function getProviderSummary(): Promise<ProviderSummary> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/providers`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServerApiUnauthorizedError();
      }

      const err = await readErrorResponse(response);
      throw new Error(err.error || "Provider health is temporarily unavailable.");
    }

    return providerSummarySchema.parse(await response.json());
  } catch (error) {
    if (error instanceof ServerApiUnauthorizedError) {
      throw error;
    }

    console.error("Failed to fetch provider summary:", error);
    throw error;
  }
}

export async function getWorkspaceTeamMembers(): Promise<WorkspaceTeamMember[]> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/account/team`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServerApiUnauthorizedError();
      }

      if (response.status === 409) {
        const err = await readErrorResponse(response);
        if (err.code === "workspace_selection_required") {
          throw new ServerApiWorkspaceSelectionRequiredError(
            err.error ?? "Workspace selection required.",
          );
        }
      }

      const err = await readErrorResponse(response);
      throw new Error(err.error || "Team members are temporarily unavailable.");
    }

    return workspaceTeamMemberListSchema.parse(await response.json()).members;
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch workspace team members:", error);
    throw error;
  }
}

export async function getWorkspaceInvitations(): Promise<WorkspaceInvitation[]> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/account/team/invitations`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServerApiUnauthorizedError();
      }

      if (response.status === 409) {
        const err = await readErrorResponse(response);
        if (err.code === "workspace_selection_required") {
          throw new ServerApiWorkspaceSelectionRequiredError(
            err.error ?? "Workspace selection required.",
          );
        }
      }

      const err = await readErrorResponse(response);
      throw new Error(err.error || "Workspace invites are temporarily unavailable.");
    }

    return workspaceInvitationListSchema.parse(await response.json()).invitations;
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch workspace invites:", error);
    throw error;
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

      if (response.status === 409) {
        const err = await readErrorResponse(response);
        if (err.code === "workspace_selection_required") {
          throw new ServerApiWorkspaceSelectionRequiredError(
            err.error ?? "Workspace selection required.",
          );
        }
      }

      const err = await readErrorResponse(response);
      throw new Error(err.error || "Billing data is temporarily unavailable.");
    }

    return response.json();
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
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
