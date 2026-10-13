import { NextRequest, NextResponse } from "next/server";
import { dispatchCallInputSchema, dispatchCallResponseSchema } from "@sales/shared";
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
          appendStatusParam(returnTo, "callStatus", status),
          normalizedUpgrade,
        )
      : appendStatusParam(returnTo, "callStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("callMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = dispatchCallInputSchema.parse({
      leadId: formData.get("leadId"),
      provider: formData.get("provider") || undefined,
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/calls/dispatch`, {
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
        err.error ?? "Call dispatch could not be started.",
        err.upgrade,
      );
    }

    const result = dispatchCallResponseSchema.parse(await response.json());
    const needsReview = result.call.reviewRequired || result.provider === "suppression-policy";
    return redirectWithStatus(
      request,
      returnTo,
      needsReview ? "review_required" : "dispatched",
      result.detail,
    );
  } catch (error) {
    console.error("Call dispatch proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?callStatus=error", request.url), {
      status: 303,
    });
  }
}
