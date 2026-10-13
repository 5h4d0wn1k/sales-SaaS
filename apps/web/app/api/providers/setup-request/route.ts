import { NextRequest, NextResponse } from "next/server";
import { providerSetupRequestInputSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

type ErrorResponse = {
  error?: string;
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
    appendStatusParam(returnTo, "providerSetupStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("providerSetupMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const parsed = providerSetupRequestInputSchema.parse({
      provider: formData.get("provider"),
      kind: formData.get("kind"),
      mode: formData.get("mode"),
      readiness: formData.get("readiness"),
      channels: formData.getAll("channels"),
      missingSecrets: formData.getAll("missingSecrets"),
      productionBlockers: formData.getAll("productionBlockers"),
      rolloutGoal: formData.get("rolloutGoal"),
      businessReason: formData.get("businessReason"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/providers/setup-requests`, {
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
        err.error ?? "Provider setup review could not be requested.",
      );
    }

    return redirectWithStatus(
      request,
      returnTo,
      "proposed",
      "Provider setup review was added to the approval inbox. No secrets or provider work were submitted.",
    );
  } catch (error) {
    console.error("Provider setup request proxy error:", error);
    return NextResponse.redirect(new URL("/settings?providerSetupStatus=error", request.url), {
      status: 303,
    });
  }
}
