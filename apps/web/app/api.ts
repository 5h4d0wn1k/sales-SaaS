import {
  aiWorkerControlPlaneResponseSchema,
  aiWorkerExecutionReadinessResponseSchema,
  aiWorkerMarginReadinessResponseSchema,
  actionProposalListResponseSchema,
  auditComplianceReadinessResponseSchema,
  auditLogResponseSchema,
  commandCenterBriefResponseSchema,
  commandCenterPolicyCatalogResponseSchema,
  contentOpportunityPlanSchema,
  conversionBriefResponseSchema,
  conversionIntegrationReadinessResponseSchema,
  conversionWorkQueueResponseSchema,
  managedServiceReadinessResponseSchema,
  outboundChannelReadinessResponseSchema,
  outreachSequencePlanResponseSchema,
  planGrowthReadinessResponseSchema,
  providerActivationReadinessResponseSchema,
  providerCostCurveResponseSchema,
  revenueForecastResponseSchema,
  sourceAcquisitionReadinessResponseSchema,
  telegramCommandReadinessResponseSchema,
  telegramNotificationReadinessResponseSchema,
  workspaceInvitationListSchema,
  dashboardResponseSchema,
  providerSummarySchema,
  salesBlueprintResponseSchema,
  suppressionListResponseSchema,
  telegramIntegrationResponseSchema,
  workspaceTeamMemberListSchema,
  type AiWorkerControlPlaneResponse,
  type AiWorkerExecutionReadinessResponse,
  type AiWorkerMarginReadinessResponse,
  type AuditComplianceReadinessResponse,
  type AuditLogResponse,
  type CommandCenterBriefResponse,
  type CommandCenterPolicyCatalogResponse,
  type ContentOpportunityPlan,
  type ConversionBriefResponse,
  type ConversionIntegrationReadinessResponse,
  type ConversionWorkQueueResponse,
  type ManagedServiceReadinessResponse,
  type OutboundChannelReadinessResponse,
  type ProviderSummary,
  type OutreachSequencePlanResponse,
  type PlanGrowthReadinessResponse,
  type ProviderActivationReadinessResponse,
  type ProviderCostCurveResponse,
  type RevenueForecastResponse,
  type SourceAcquisitionReadinessResponse,
  type ActionProposalListResponse,
  type ActionProposalStatus,
  type DashboardResponse,
  type SalesBlueprintResponse,
  type SuppressionRecord,
  type TelegramCommandReadinessResponse,
  type TelegramNotificationReadinessResponse,
  type TelegramIntegrationResponse,
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

export async function getAuditLog(limit = 12): Promise<AuditLogResponse> {
  const baseUrl = getServerApiBaseUrl();
  const normalizedLimit = Math.min(50, Math.max(1, Math.trunc(limit)));

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/audit/recent?limit=${normalizedLimit}`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error || "Recent audit log is temporarily unavailable.",
      );
    }

    return auditLogResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch recent audit log:", error);
    throw error;
  }
}

export async function getAuditComplianceReadiness(): Promise<AuditComplianceReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/audit/compliance-readiness`, {
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
      throw new Error(
        err.error || "Audit compliance readiness is temporarily unavailable.",
      );
    }

    return auditComplianceReadinessResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch audit compliance readiness:", error);
    throw error;
  }
}

export async function getConversionBrief(): Promise<ConversionBriefResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/conversion/brief`, {
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
      throw new Error(
        err.error || "Conversion brief is temporarily unavailable.",
      );
    }

    return conversionBriefResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch conversion brief:", error);
    throw error;
  }
}

export async function getConversionWorkQueue(): Promise<ConversionWorkQueueResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/conversion/work-queue`, {
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
      throw new Error(
        err.error || "Conversion work queue is temporarily unavailable.",
      );
    }

    return conversionWorkQueueResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch conversion work queue:", error);
    throw error;
  }
}

export async function getConversionIntegrationReadiness(): Promise<ConversionIntegrationReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/conversion/integration-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error ||
          "Conversion integration readiness is temporarily unavailable.",
      );
    }

    return conversionIntegrationReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch conversion integration readiness:", error);
    throw error;
  }
}

export async function getOutreachSequencePlan(): Promise<OutreachSequencePlanResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/outreach/sequence-plan`, {
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
      throw new Error(
        err.error || "Outreach sequence plan is temporarily unavailable.",
      );
    }

    return outreachSequencePlanResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch outreach sequence plan:", error);
    throw error;
  }
}

export async function getOutboundChannelReadiness(): Promise<OutboundChannelReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/outreach/channel-readiness`, {
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
      throw new Error(
        err.error ||
          "Outbound channel readiness is temporarily unavailable.",
      );
    }

    return outboundChannelReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch outbound channel readiness:", error);
    throw error;
  }
}

export async function getRevenueForecast(): Promise<RevenueForecastResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/revenue/forecast`, {
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
      throw new Error(
        err.error || "Revenue forecast is temporarily unavailable.",
      );
    }

    return revenueForecastResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch revenue forecast:", error);
    throw error;
  }
}

export async function getPlanGrowthReadiness(): Promise<PlanGrowthReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/growth/plan-readiness`, {
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
      throw new Error(
        err.error || "Plan growth readiness is temporarily unavailable.",
      );
    }

    return planGrowthReadinessResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch plan growth readiness:", error);
    throw error;
  }
}

export async function getManagedServiceReadiness(): Promise<ManagedServiceReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/growth/managed-service-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error || "Managed service readiness is temporarily unavailable.",
      );
    }

    return managedServiceReadinessResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch managed service readiness:", error);
    throw error;
  }
}

export async function getWorkspaceMemberships(): Promise<
  WorkspaceMembershipList["memberships"]
> {
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
      throw new Error(
        err.error || "Workspace data is temporarily unavailable.",
      );
    }

    return workspaceMembershipListSchema.parse(await response.json())
      .memberships;
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
      throw new Error(
        err.error || "Provider health is temporarily unavailable.",
      );
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

export async function getProviderActivationReadiness(): Promise<ProviderActivationReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/providers/activation-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error ||
          "Provider activation readiness is temporarily unavailable.",
      );
    }

    return providerActivationReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch provider activation readiness:", error);
    throw error;
  }
}

export async function getProviderCostCurves(): Promise<ProviderCostCurveResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/providers/cost-curves`, {
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
      throw new Error(
        err.error || "Provider cost curves are temporarily unavailable.",
      );
    }

    return providerCostCurveResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch provider cost curves:", error);
    throw error;
  }
}

export async function getSourceAcquisitionReadiness(): Promise<SourceAcquisitionReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/leads/source-acquisition-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error || "Source acquisition readiness is temporarily unavailable.",
      );
    }

    return sourceAcquisitionReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch source acquisition readiness:", error);
    throw error;
  }
}

export async function getSalesBlueprint(): Promise<SalesBlueprintResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/sales-blueprint`, {
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
      throw new Error(
        err.error || "Sales blueprint is temporarily unavailable.",
      );
    }

    return salesBlueprintResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch sales blueprint:", error);
    throw error;
  }
}

export async function getContentOpportunityPlan(
  limit = 5,
): Promise<ContentOpportunityPlan> {
  const baseUrl = getServerApiBaseUrl();
  const query = new URLSearchParams({ limit: String(limit) });

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/content/opportunities?${query}`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error || "Content opportunities are temporarily unavailable.",
      );
    }

    return contentOpportunityPlanSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch content opportunities:", error);
    throw error;
  }
}

export async function getActionProposals(
  status?: ActionProposalStatus,
): Promise<ActionProposalListResponse> {
  const baseUrl = getServerApiBaseUrl();
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/action-proposals${query}`, {
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
      throw new Error(
        err.error || "Approval proposals are temporarily unavailable.",
      );
    }

    return actionProposalListResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch approval proposals:", error);
    throw error;
  }
}

export async function getAiWorkerControlPlane(): Promise<AiWorkerControlPlaneResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/ai-workers`, {
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
      throw new Error(
        err.error || "AI worker control plane is temporarily unavailable.",
      );
    }

    return aiWorkerControlPlaneResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch AI worker control plane:", error);
    throw error;
  }
}

export async function getAiWorkerExecutionReadiness(): Promise<AiWorkerExecutionReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/ai-workers/execution-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error ||
          "AI worker execution readiness is temporarily unavailable.",
      );
    }

    return aiWorkerExecutionReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch AI worker execution readiness:", error);
    throw error;
  }
}

export async function getAiWorkerMarginReadiness(): Promise<AiWorkerMarginReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/ai-workers/margin-readiness`, {
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
      throw new Error(
        err.error || "AI worker margin readiness is temporarily unavailable.",
      );
    }

    return aiWorkerMarginReadinessResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch AI worker margin readiness:", error);
    throw error;
  }
}

export async function getCommandCenterBrief(): Promise<CommandCenterBriefResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/command-center/brief`, {
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
      throw new Error(
        err.error || "Command center brief is temporarily unavailable.",
      );
    }

    return commandCenterBriefResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch command center brief:", error);
    throw error;
  }
}

export async function getCommandCenterPolicies(): Promise<CommandCenterPolicyCatalogResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/command-center/policies`, {
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
      throw new Error(
        err.error || "Command center policies are temporarily unavailable.",
      );
    }

    return commandCenterPolicyCatalogResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch command center policies:", error);
    throw error;
  }
}

export async function getTelegramCommandReadiness(): Promise<TelegramCommandReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/command-center/telegram-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error ||
          "Telegram command readiness is temporarily unavailable.",
      );
    }

    return telegramCommandReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch Telegram command readiness:", error);
    throw error;
  }
}

export async function getSuppressions(): Promise<SuppressionRecord[]> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/suppressions`, {
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
      throw new Error(err.error || "Suppressions are temporarily unavailable.");
    }

    return suppressionListResponseSchema.parse(await response.json())
      .suppressions;
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch suppressions:", error);
    throw error;
  }
}

export async function getTelegramNotificationReadiness(): Promise<TelegramNotificationReadinessResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${baseUrl}/v1/command-center/telegram-notification-readiness`,
      {
        headers,
        cache: "no-store",
      },
    );

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
      throw new Error(
        err.error ||
          "Telegram notification readiness is temporarily unavailable.",
      );
    }

    return telegramNotificationReadinessResponseSchema.parse(
      await response.json(),
    );
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch Telegram notification readiness:", error);
    throw error;
  }
}

export async function getTelegramIntegration(): Promise<TelegramIntegrationResponse> {
  const baseUrl = getServerApiBaseUrl();

  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${baseUrl}/v1/integrations/telegram`, {
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
      throw new Error(
        err.error || "Telegram integration is temporarily unavailable.",
      );
    }

    return telegramIntegrationResponseSchema.parse(await response.json());
  } catch (error) {
    if (
      error instanceof ServerApiUnauthorizedError ||
      error instanceof ServerApiWorkspaceSelectionRequiredError
    ) {
      throw error;
    }

    console.error("Failed to fetch Telegram integration:", error);
    throw error;
  }
}

export async function getWorkspaceTeamMembers(): Promise<
  WorkspaceTeamMember[]
> {
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

export async function getWorkspaceInvitations(): Promise<
  WorkspaceInvitation[]
> {
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
      throw new Error(
        err.error || "Workspace invites are temporarily unavailable.",
      );
    }

    return workspaceInvitationListSchema.parse(await response.json())
      .invitations;
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
    providerCostBudgetCents?: number;
    includedChannels?: string[];
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
export async function initiateCheckout(
  planKey: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{ url: string }> {
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
