import { NextRequest, NextResponse } from "next/server";
import { createWorkspaceInvitationInputSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

type InviteResponse = {
  delivery?: {
    mode?: "email" | "preview" | "unavailable";
    previewUrl?: string;
  };
  error?: string;
  code?: string;
};

async function readInviteResponse(response: Response): Promise<InviteResponse> {
  try {
    return (await response.json()) as InviteResponse;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const parsed = createWorkspaceInvitationInputSchema.parse({
      email: formData.get("email"),
      role: formData.get("role"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/account/team/invitations`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });
    const body = await readInviteResponse(response);

    if (!response.ok) {
      const redirectUrl = new URL(appendStatusParam(returnTo, "inviteStatus", "error"), request.url);
      if (parsed.email) {
        redirectUrl.searchParams.set("inviteEmail", parsed.email);
      }
      if (body.error) {
        redirectUrl.searchParams.set("inviteMessage", body.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    const redirectUrl = new URL(
      appendStatusParam(
        returnTo,
        "inviteStatus",
        body.delivery?.mode === "preview" ? "preview" : "created",
      ),
      request.url,
    );
    redirectUrl.searchParams.set("inviteEmail", parsed.email);
    if (body.delivery?.previewUrl) {
      redirectUrl.searchParams.set("invitePreview", body.delivery.previewUrl);
    }
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Create invite proxy error:", error);
    return NextResponse.redirect(new URL("/settings?inviteStatus=error", request.url), { status: 303 });
  }
}
