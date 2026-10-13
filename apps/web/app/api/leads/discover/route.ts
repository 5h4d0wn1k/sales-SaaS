import { NextRequest, NextResponse } from "next/server";
import { discoverLeadsInputSchema, discoverLeadsResponseSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";
import {
  appendUpgradeSearchParams,
  normalizeUpgradeRecommendation,
} from "@/lib/upgrade-recommendation";
import {
  appendSourceProviderGovernanceSearchParams,
  normalizeSourceProviderGovernanceError,
  type SourceProviderGovernanceContext,
} from "@/lib/source-provider-governance";

type ErrorResponse = {
  error?: string;
  upgrade?: unknown;
  code?: string;
  missingControls?: unknown;
};

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: string,
  message?: string,
  upgrade?: unknown,
  governance?: SourceProviderGovernanceContext | null,
) {
  const normalizedUpgrade = normalizeUpgradeRecommendation(upgrade);
  const withStatus = appendStatusParam(returnTo, "discoverStatus", status);
  const withUpgrade = normalizedUpgrade
    ? appendUpgradeSearchParams(withStatus, normalizedUpgrade)
    : withStatus;
  const target = governance
    ? appendSourceProviderGovernanceSearchParams(
        withUpgrade,
        "discover",
        governance,
      )
    : withUpgrade;
  const redirectUrl = new URL(target, request.url);

  if (message) {
    redirectUrl.searchParams.set("discoverMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const rawLimitSources = formData.get("limitSources");
    const parsed = discoverLeadsInputSchema.parse({
      limitSources: rawLimitSources ? Number(rawLimitSources) : undefined,
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/leads/discover`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const governance = normalizeSourceProviderGovernanceError(err);
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        governance?.message ??
          err.error ??
          "Multi-source discovery could not be started.",
        err.upgrade,
        governance,
      );
    }

    const result = discoverLeadsResponseSchema.parse(await response.json());
    const runCount = result.runs.length;
    return redirectWithStatus(
      request,
      returnTo,
      "created",
      `${runCount} source ${runCount === 1 ? "run" : "runs"} created for review.`,
    );
  } catch (error) {
    console.error("Lead discovery proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?discoverStatus=error", request.url), {
      status: 303,
    });
  }
}
