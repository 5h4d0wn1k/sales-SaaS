import { NextRequest, NextResponse } from "next/server";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/account/team/invitations/${id}/revoke`,
      {
        method: "POST",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(appendStatusParam(returnTo, "inviteStatus", "error"), request.url);
      if (err.error) {
        redirectUrl.searchParams.set("inviteMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.redirect(
      new URL(appendStatusParam(returnTo, "inviteStatus", "revoked"), request.url),
      { status: 303 },
    );
  } catch (error) {
    console.error("Revoke invite proxy error:", error);
    return NextResponse.redirect(new URL("/settings?inviteStatus=error", request.url), { status: 303 });
  }
}
