import { NextRequest, NextResponse } from "next/server";
import { updateWorkspaceTeamMemberRoleInputSchema } from "@sales/shared";
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const memberEmail = String(formData.get("memberEmail") ?? "").trim().toLowerCase();
    const parsed = updateWorkspaceTeamMemberRoleInputSchema.parse({
      role: formData.get("role"),
    });
    const { id } = await context.params;
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/account/team/members/${id}/role`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(appendStatusParam(returnTo, "memberStatus", "error"), request.url);
      if (memberEmail) {
        redirectUrl.searchParams.set("memberEmail", memberEmail);
      }
      if (err.error) {
        redirectUrl.searchParams.set("memberMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const redirectUrl = new URL(appendStatusParam(returnTo, "memberStatus", "updated"), request.url);
    if (memberEmail) {
      redirectUrl.searchParams.set("memberEmail", memberEmail);
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Update member role proxy error:", error);
    return NextResponse.redirect(new URL("/settings?memberStatus=error", request.url), {
      status: 303,
    });
  }
}
