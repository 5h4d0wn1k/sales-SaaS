import { NextRequest, NextResponse } from "next/server";
import { acceptWorkspaceInvitationInputSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

type ErrorResponse = {
  error?: string;
  code?: string;
};

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = acceptWorkspaceInvitationInputSchema.parse({
      token: formData.get("token"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/account/team/invitations/accept`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(appendStatusParam(returnTo, "inviteStatus", "error"), request.url);
      if (err.error) {
        redirectUrl.searchParams.set("inviteMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.redirect(new URL("/dashboard?inviteStatus=accepted", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Accept invite proxy error:", error);
    return NextResponse.redirect(new URL("/get-started?inviteStatus=error", request.url), {
      status: 303,
    });
  }
}
