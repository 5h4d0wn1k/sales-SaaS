import { NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { createAccountLifecycleApiHeaders } from "../../proxy-headers";

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  const formData = await request.formData();
  const email =
    typeof formData.get("email") === "string" ? String(formData.get("email")).trim() : "";

  if (!email) {
    return NextResponse.redirect(new URL("/forgot-password?error=missing", request.url), {
      status: 303,
    });
  }

  try {
    await fetch(`${getServerApiBaseUrl()}/v1/auth/password-reset/request`, {
      method: "POST",
      headers: createAccountLifecycleApiHeaders(request),
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const redirectUrl = new URL("/forgot-password", request.url);
    redirectUrl.searchParams.set("sent", "1");
    redirectUrl.searchParams.set("email", email);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Password reset request proxy error:", error);
    return NextResponse.redirect(new URL("/forgot-password?error=send_failed", request.url), {
      status: 303,
    });
  }
}
