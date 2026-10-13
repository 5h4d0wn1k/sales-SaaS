import { NextRequest, NextResponse } from "next/server";
import { approveCampaignInputSchema, campaignRecordSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

type ErrorResponse = {
  error?: string;
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
) {
  const redirectUrl = new URL(
    appendStatusParam(returnTo, "campaignStatus", status),
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
    const parsed = approveCampaignInputSchema.parse({});
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/campaigns/${encodeURIComponent(id)}/approve`,
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
        err.error ?? "Campaign approval could not be saved.",
      );
    }

    const campaign = campaignRecordSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      "approved",
      `${campaign.name} approved for guarded dispatch.`,
    );
  } catch (error) {
    console.error("Campaign approval proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?campaignStatus=error", request.url), {
      status: 303,
    });
  }
}
