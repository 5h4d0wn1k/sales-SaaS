import { NextRequest, NextResponse } from "next/server";
import { reviewActionProposalInputSchema } from "@sales/shared";
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
    appendStatusParam(returnTo, "approvalStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("approvalMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const [{ id }, formData] = await Promise.all([context.params, request.formData()]);
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = reviewActionProposalInputSchema.parse({
      decision: formData.get("decision"),
      note: formData.get("note"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/action-proposals/${encodeURIComponent(id)}/review`,
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
        err.error ?? "Approval review could not be saved.",
      );
    }

    return redirectWithStatus(
      request,
      returnTo,
      parsed.decision === "approve" ? "approved" : "rejected",
    );
  } catch (error) {
    console.error("Review action proposal proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?approvalStatus=error", request.url), {
      status: 303,
    });
  }
}
