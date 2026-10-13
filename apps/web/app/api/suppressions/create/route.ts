import { NextRequest, NextResponse } from "next/server";
import { createSuppressionInputSchema } from "@sales/shared";
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

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const parsed = createSuppressionInputSchema.parse({
      channel: formData.get("channel"),
      contactValue: formData.get("contactValue"),
      reason: formData.get("reason"),
      source: "settings-form",
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/suppressions`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(
        appendStatusParam(returnTo, "suppressionStatus", "error"),
        request.url,
      );
      redirectUrl.searchParams.set("suppressionContact", parsed.contactValue);
      if (err.error) {
        redirectUrl.searchParams.set("suppressionMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const redirectUrl = new URL(
      appendStatusParam(returnTo, "suppressionStatus", "created"),
      request.url,
    );
    redirectUrl.searchParams.set("suppressionContact", parsed.contactValue);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Create suppression proxy error:", error);
    return NextResponse.redirect(new URL("/settings?suppressionStatus=error", request.url), {
      status: 303,
    });
  }
}
