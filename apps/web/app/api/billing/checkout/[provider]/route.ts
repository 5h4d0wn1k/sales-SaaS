import { NextResponse } from "next/server";
import {
  createServerApiHeaders,
  getServerApiBaseUrl,
  isServerApiUnauthorizedError,
} from "@/lib/server-api-auth";

const ALLOWED_PROVIDERS = new Set(["stripe", "razorpay"]);

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { provider } = await context.params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  try {
    const baseUrl = getServerApiBaseUrl();
    const headers = await createServerApiHeaders({}, {
      contentType: request.headers.get("content-type") ?? "application/json",
    });
    const response = await fetch(`${baseUrl}/v1/billing/checkout/${provider}`, {
      method: "POST",
      headers,
      body: await request.text(),
      cache: "no-store",
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    if (isServerApiUnauthorizedError(error)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Billing checkout proxy error:", error);
    return NextResponse.json({ error: "Failed to initialize checkout" }, { status: 500 });
  }
}
