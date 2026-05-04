import { NextRequest, NextResponse } from "next/server";
import { selectWorkspaceInputSchema } from "@sales/shared";
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
    const parsed = selectWorkspaceInputSchema.parse({
      workspaceId: formData.get("workspaceId"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/account/workspaces/select`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const url = new URL(
        appendStatusParam(
          returnTo,
          "workspace",
          err.code === "workspace_access_denied" ? "denied" : "error",
        ),
        request.url,
      );
      return NextResponse.redirect(url, { status: 303 });
    }

    const url = new URL(appendStatusParam(returnTo, "workspace", "switched"), request.url);
    return NextResponse.redirect(url, { status: 303 });
  } catch {
    return NextResponse.redirect(new URL("/get-started", request.url), { status: 303 });
  }
}
