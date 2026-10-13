import { NextRequest, NextResponse } from "next/server";
import { createCampaignInputSchema, createCampaignResponseSchema } from "@sales/shared";
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

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = createCampaignInputSchema.parse({
      name: formData.get("name"),
      channel: formData.get("channel"),
      highRiskChannel:
        formData.get("highRiskChannel") === "true" ||
        formData.get("highRiskChannel") === "on",
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/campaigns`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        err.error ?? "Campaign draft could not be created.",
        err.upgrade,
      );
    }

    const result = createCampaignResponseSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      "created",
      `${result.campaign.name} drafted with ${result.campaign.leadsEnrolled} leads enrolled for approval.`,
    );
  } catch (error) {
    console.error("Campaign create proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?campaignStatus=error", request.url), {
      status: 303,
    });
  }
}
