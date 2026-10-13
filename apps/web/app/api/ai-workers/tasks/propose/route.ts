import { NextRequest, NextResponse } from "next/server";
import { createAiWorkerTaskInputSchema } from "@sales/shared";
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
          appendStatusParam(returnTo, "workerStatus", status),
          normalizedUpgrade,
        )
      : appendStatusParam(returnTo, "workerStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("workerMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = createAiWorkerTaskInputSchema.parse({
      workerId: formData.get("workerId"),
      title: formData.get("title"),
      detail: formData.get("detail"),
      proposedAction: formData.get("proposedAction"),
      riskLevel: formData.get("riskLevel"),
      expectedCostCents: formData.get("expectedCostCents"),
      requiredRole: formData.get("requiredRole"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/ai-workers/tasks`, {
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
        err.error ?? "AI worker task proposal could not be created.",
        err.upgrade,
      );
    }

    return redirectWithStatus(request, returnTo, "proposed");
  } catch (error) {
    console.error("AI worker task proposal proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?workerStatus=error", request.url), {
      status: 303,
    });
  }
}
