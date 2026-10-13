import { NextRequest, NextResponse } from "next/server";
import { sourceRunInputSchema } from "@sales/shared";
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
  const withStatus = appendStatusParam(returnTo, "sourceStatus", status);
  const withUpgrade = normalizedUpgrade
    ? appendUpgradeSearchParams(withStatus, normalizedUpgrade)
    : withStatus;
  const target = governance
    ? appendSourceProviderGovernanceSearchParams(
        withUpgrade,
        "source",
        governance,
      )
    : withUpgrade;
  const redirectUrl = new URL(target, request.url);

  if (message) {
    redirectUrl.searchParams.set("sourceMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = sourceRunInputSchema.parse({
      source: formData.get("source"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/leads/source-run`, {
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
	          "Lead source run could not be started.",
        err.upgrade,
        governance,
      );
    }

    return redirectWithStatus(request, returnTo, "created");
  } catch (error) {
    console.error("Lead source run proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?sourceStatus=error", request.url), {
      status: 303,
    });
  }
}
