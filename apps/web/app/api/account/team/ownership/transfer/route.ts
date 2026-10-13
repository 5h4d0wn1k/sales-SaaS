import { NextRequest, NextResponse } from "next/server";
import { transferWorkspaceOwnershipInputSchema } from "@sales/shared";
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
    const targetEmail = String(formData.get("targetEmail") ?? "").trim().toLowerCase();
    const parsed = transferWorkspaceOwnershipInputSchema.parse({
      targetUserId: formData.get("targetUserId"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/account/team/ownership/transfer`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(
        appendStatusParam(returnTo, "ownershipStatus", "error"),
        request.url,
      );
      if (targetEmail) {
        redirectUrl.searchParams.set("ownershipEmail", targetEmail);
      }
      if (err.error) {
        redirectUrl.searchParams.set("ownershipMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const redirectUrl = new URL(
      appendStatusParam(returnTo, "ownershipStatus", "transferred"),
      request.url,
    );
    if (targetEmail) {
      redirectUrl.searchParams.set("ownershipEmail", targetEmail);
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Transfer ownership proxy error:", error);
    return NextResponse.redirect(new URL("/settings?ownershipStatus=error", request.url), {
      status: 303,
    });
  }
}
