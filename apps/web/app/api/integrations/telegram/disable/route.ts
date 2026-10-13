import { NextRequest, NextResponse } from "next/server";
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
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/integrations/telegram/disable`, {
      method: "POST",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(
        appendStatusParam(returnTo, "telegramStatus", "error"),
        request.url,
      );
      if (err.error) {
        redirectUrl.searchParams.set("telegramMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.redirect(
      new URL(appendStatusParam(returnTo, "telegramStatus", "disabled"), request.url),
      { status: 303 },
    );
  } catch (error) {
    console.error("Disable Telegram proxy error:", error);
    return NextResponse.redirect(new URL("/settings?telegramStatus=error", request.url), {
      status: 303,
    });
  }
}
