import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";
import { createAccountLifecycleApiHeaders } from "../../proxy-headers";

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  const formData = await request.formData();
  const session = await auth();
  const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
  const email =
    session?.user?.email ??
    (typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "");

  if (!email) {
    return NextResponse.redirect(
      new URL(appendStatusParam(returnTo, "verifyEmail", "error"), request.url),
      { status: 303 },
    );
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/v1/auth/verify-email/request`, {
      method: "POST",
      headers: createAccountLifecycleApiHeaders(request),
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const redirectTarget = appendStatusParam(
      returnTo,
      "verifyEmail",
      response.ok ? "sent" : "error",
    );
    return NextResponse.redirect(new URL(redirectTarget, request.url), { status: 303 });
  } catch (error) {
    console.error("Verify email request proxy error:", error);
    return NextResponse.redirect(
      new URL(appendStatusParam(returnTo, "verifyEmail", "error"), request.url),
      { status: 303 },
    );
  }
}
