import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from "cloudflare:workers";

type MetadataValue = string | number | boolean | null;
type Metadata = Record<string, MetadataValue>;
type WorkflowDurationLabel = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
type WorkflowDuration = `${number} ${WorkflowDurationLabel}${"" | "s"}`;

type CampaignDispatchWorkflowParams = {
  requestId?: string;
  instanceId?: string;
  campaignId: string;
  organizationId?: string;
  workspaceId?: string;
  initiatedBy?: string;
  approvalTimeout?: WorkflowDuration;
  metadata?: Metadata;
};

type ApprovalDecision = {
  approved: boolean;
  approvedBy: string;
  notes?: string;
  metadata?: Metadata;
};

type DispatchWebhookResult = {
  ok: boolean;
  status: number;
  contentType: string | null;
  bodyPreview: string | null;
  url: string;
};

type RuntimeEnv = Env & {
  WORKFLOWS_API_TOKEN?: string;
  CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE?: string;
  CAMPAIGN_DISPATCH_BEARER_TOKEN?: string;
};

const DEFAULT_APPROVAL_TIMEOUT: WorkflowDuration = "24 hours";
const APPROVAL_EVENT_TYPE = "campaign-approval";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

function notFound() {
  return json({ error: "Not found" }, { status: 404 });
}

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return false;
    }
    // Block private/internal IP ranges and localhost
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return false;
    }
    // Block private IPv4 ranges
    if (/^10\./.test(host) || // 10.0.0.0/8
        /^192\.168\./.test(host) || // 192.168.0.0/16
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) { // 172.16.0.0/12
      return false;
    }
    // Block link-local and multicast
    if (/^169\.254\./.test(host)) { // 169.254.0.0/16 (link-local)
      return false;
    }
    // Block private IPv6 ranges (simplified check)
    if (/^fe80:/i.test(host) || // fe80::/10 (link-local)
        /^fc00:/i.test(host) || // fc00::/7 (unique local)
        /^fdcb:/i.test(host) || // fd00::/8 (unique local)
        /^ff00:/i.test(host)) { // ff00::/8 (multicast)
      return false;
    }
    // Block cloud metadata endpoints
    if (host === "169.254.169.254" || // AWS/Azure/GCP metadata
        host === "metadata.google.internal" ||
        host === "metadata.azure.internal") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function normalizeParams(input: CampaignDispatchWorkflowParams): Required<
  Pick<CampaignDispatchWorkflowParams, "campaignId" | "requestId" | "instanceId" | "approvalTimeout">
> &
  Omit<CampaignDispatchWorkflowParams, "campaignId" | "requestId" | "instanceId" | "approvalTimeout"> {
  return {
    ...input,
    campaignId: input.campaignId,
    requestId: input.requestId ?? crypto.randomUUID(),
    instanceId: input.instanceId ?? `campaign-${input.campaignId}-${crypto.randomUUID()}`,
    approvalTimeout: input.approvalTimeout ?? DEFAULT_APPROVAL_TIMEOUT,
  };
}

function getAccessToken(request: Request) {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return request.headers.get("x-workflows-token");
}

function requireConfiguredToken(request: Request, env: RuntimeEnv) {
  const expectedToken = env.WORKFLOWS_API_TOKEN;

  if (!isConfigured(expectedToken)) {
    return unauthorized();
  }

  return getAccessToken(request) === expectedToken ? null : unauthorized();
}

async function readJson<T>(request: Request) {
  return await request.json<T>();
}

function validateCreateRequest(payload: CampaignDispatchWorkflowParams) {
  if (!isConfigured(payload.campaignId)) {
    return "campaignId is required.";
  }

  if (payload.approvalTimeout && !isConfigured(payload.approvalTimeout)) {
    return "approvalTimeout must be a non-empty duration string when provided.";
  }

  return null;
}

function validateApprovalDecision(payload: ApprovalDecision) {
  if (typeof payload.approved !== "boolean") {
    return "approved must be a boolean.";
  }

  if (!isConfigured(payload.approvedBy)) {
    return "approvedBy is required.";
  }

  return null;
}

async function dispatchApprovedCampaign(
  env: RuntimeEnv,
  request: ReturnType<typeof normalizeParams>,
  approval: ApprovalDecision,
): Promise<DispatchWebhookResult | null> {
  const template = env.CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE;

  if (!template || !isConfigured(template)) {
    return null;
  }

  const url = template
    .replaceAll("{campaignId}", encodeURIComponent(request.campaignId))
    .replaceAll("{requestId}", encodeURIComponent(request.requestId));

  if (!isValidUrl(url)) {
    return null;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(isConfigured(env.CAMPAIGN_DISPATCH_BEARER_TOKEN)
        ? { authorization: `Bearer ${env.CAMPAIGN_DISPATCH_BEARER_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      requestId: request.requestId,
      campaignId: request.campaignId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      initiatedBy: request.initiatedBy,
      approval,
      metadata: request.metadata ?? {},
    }),
  });

  const contentType = response.headers.get("content-type");
  const bodyPreview = (await response.text()).slice(0, 1000) || null;

  return {
    ok: response.ok,
    status: response.status,
    contentType,
    bodyPreview,
    url,
  };
}

export class CampaignApprovalWorkflow extends WorkflowEntrypoint<
  RuntimeEnv,
  CampaignDispatchWorkflowParams
> {
  async run(event: WorkflowEvent<CampaignDispatchWorkflowParams>, step: WorkflowStep) {
    const request = await step.do("normalize campaign approval request", async () => {
      return normalizeParams(event.payload);
    });

    const approvalEvent = await step.waitForEvent<ApprovalDecision>(
      "wait for explicit campaign approval",
      {
        type: APPROVAL_EVENT_TYPE,
        timeout: request.approvalTimeout,
      },
    );

    if (!approvalEvent.payload.approved) {
      return {
        status: "rejected",
        requestId: request.requestId,
        campaignId: request.campaignId,
        approval: approvalEvent.payload,
      };
    }

    const dispatchResult = await step.do(
      "dispatch approved campaign webhook",
      {
        retries: {
          limit: 3,
          delay: "10 second",
          backoff: "exponential",
        },
        timeout: "5 minutes",
      },
      async () => {
        return await dispatchApprovedCampaign(this.env, request, approvalEvent.payload);
      },
    );

    return {
      status: dispatchResult?.ok ? "dispatched" : "approved",
      requestId: request.requestId,
      campaignId: request.campaignId,
      approval: approvalEvent.payload,
      dispatch: dispatchResult,
    };
  }
}

export default {
  async fetch(request: Request, env: RuntimeEnv): Promise<Response> {
    const tokenError = requireConfiguredToken(request, env);
    if (tokenError) {
      return tokenError;
    }

    const url = new URL(request.url);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        status: "ok",
        service: "sales-workflows",
        workflowBinding: "CAMPAIGN_APPROVAL_WORKFLOW",
        dispatchWebhookConfigured: isConfigured(env.CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE),
      });
    }

    if (request.method === "POST" && url.pathname === "/workflows/campaign-dispatch") {
      const body = await readJson<CampaignDispatchWorkflowParams>(request);
      const validationError = validateCreateRequest(body);
      if (validationError) {
        return badRequest(validationError);
      }

      const payload = normalizeParams(body);
      const instance = await env.CAMPAIGN_APPROVAL_WORKFLOW.create({
        id: payload.instanceId,
        params: payload,
        retention: {
          successRetention: "7 days",
          errorRetention: "14 days",
        },
      });

      return json(
        {
          id: instance.id,
          requestId: payload.requestId,
          status: await instance.status(),
        },
        { status: 202 },
      );
    }

    if (pathSegments[0] === "workflows" && pathSegments.length === 2 && request.method === "GET") {
      const instance = await env.CAMPAIGN_APPROVAL_WORKFLOW.get(pathSegments[1]);
      return json({
        id: pathSegments[1],
        status: await instance.status(),
      });
    }

    if (
      pathSegments[0] === "workflows" &&
      pathSegments.length === 3 &&
      pathSegments[2] === "approval" &&
      request.method === "POST"
    ) {
      const approval = await readJson<ApprovalDecision>(request);
      const validationError = validateApprovalDecision(approval);
      if (validationError) {
        return badRequest(validationError);
      }

      const instance = await env.CAMPAIGN_APPROVAL_WORKFLOW.get(pathSegments[1]);

      await instance.sendEvent({
        type: APPROVAL_EVENT_TYPE,
        payload: approval,
      });

      return json({
        id: pathSegments[1],
        accepted: true,
        eventType: APPROVAL_EVENT_TYPE,
      });
    }

    return notFound();
  },
};
