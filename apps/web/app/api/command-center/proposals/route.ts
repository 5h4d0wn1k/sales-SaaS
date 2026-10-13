import { NextRequest, NextResponse } from "next/server";
import { commandCenterCommandProposalInputSchema } from "@sales/shared";
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
    appendStatusParam(returnTo, "commandStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("commandMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard#ai-command-preview");
    const parsed = commandCenterCommandProposalInputSchema.parse({
      commandText: formData.get("commandText"),
      channel: formData.get("channel"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/command-center/proposals`, {
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
        err.error ?? "Command could not create an approval proposal.",
      );
    }

    return redirectWithStatus(request, returnTo, "proposed");
  } catch (error) {
    console.error("Command proposal proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?commandStatus=error", request.url), {
      status: 303,
    });
  }
}
