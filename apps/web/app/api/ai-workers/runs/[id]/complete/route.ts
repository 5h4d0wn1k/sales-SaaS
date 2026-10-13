import { NextRequest, NextResponse } from "next/server";
import { completeAiWorkerRunInputSchema } from "@sales/shared";
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
    appendStatusParam(returnTo, "workerStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("workerMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function costCentsFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const [{ id }, formData] = await Promise.all([context.params, request.formData()]);
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = completeAiWorkerRunInputSchema.parse({
      resultSummary: formData.get("resultSummary"),
      actualCostCents: costCentsFromForm(formData.get("actualCost")),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/ai-workers/runs/${encodeURIComponent(id)}/result`,
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
        err.error ?? "AI worker dry-run result could not be recorded.",
      );
    }

    return redirectWithStatus(
      request,
      returnTo,
      "completed",
      "AI worker dry-run result recorded. No external worker tools ran automatically.",
    );
  } catch (error) {
    console.error("AI worker run completion proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?workerStatus=error", request.url), {
      status: 303,
    });
  }
}
