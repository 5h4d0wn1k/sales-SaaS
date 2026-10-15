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
  const token =
    typeof formData.get("token") === "string" ? String(formData.get("token")).trim() : "";
  const password =
    typeof formData.get("password") === "string" ? String(formData.get("password")) : "";

  if (!email || !token || !password) {
    const redirectUrl = new URL("/reset-password", request.url);
    if (email) {
      redirectUrl.searchParams.set("email", email);
    }
    if (token) {
      redirectUrl.searchParams.set("token", token);
    }
    redirectUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/v1/auth/password-reset/confirm`, {
      method: "POST",
      headers: createAccountLifecycleApiHeaders(request),
      body: JSON.stringify({ email, token, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      const redirectUrl = new URL("/reset-password", request.url);
      redirectUrl.searchParams.set("email", email);
      redirectUrl.searchParams.set("token", token);
      redirectUrl.searchParams.set("error", "invalid");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.redirect(new URL("/get-started?reset=success", request.url), {
      status: 303,
    });
  } catch (error) {
    console.error("Password reset confirm proxy error:", error);
    const redirectUrl = new URL("/reset-password", request.url);
    redirectUrl.searchParams.set("email", email);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("error", "server");
    return NextResponse.redirect(redirectUrl, { status: 303 });
  }
}
