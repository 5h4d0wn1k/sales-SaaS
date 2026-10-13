import { NextRequest, NextResponse } from "next/server";
import { dispatchCampaignInputSchema, dispatchCampaignResponseSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";
import {
  appendUpgradeSearchParams,
  normalizeUpgradeRecommendation,
} from "@/lib/upgrade-recommendation";

type ErrorResponse = {
  error?: string;
  upgrade?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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
) {
  const normalizedUpgrade = normalizeUpgradeRecommendation(upgrade);
  const redirectUrl = new URL(
    normalizedUpgrade
      ? appendUpgradeSearchParams(
          appendStatusParam(returnTo, "campaignStatus", status),
          normalizedUpgrade,
        )
      : appendStatusParam(returnTo, "campaignStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("campaignMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const [{ id }, formData] = await Promise.all([context.params, request.formData()]);
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = dispatchCampaignInputSchema.parse({});
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/campaigns/${encodeURIComponent(id)}/dispatch`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(parsed),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        err.error ?? "Campaign dispatch could not be started.",
        err.upgrade,
      );
    }

    const result = dispatchCampaignResponseSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      result.deliveryStatus === "review_required" ? "review_required" : "dispatched",
      result.detail,
    );
  } catch (error) {
    console.error("Campaign dispatch proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?campaignStatus=error", request.url), {
      status: 303,
    });
  }
}
