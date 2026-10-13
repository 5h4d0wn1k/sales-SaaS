import { NextResponse } from "next/server";
import { revenueReconciliationResponseSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";

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

export async function GET() {
  try {
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/revenue/reconciliation`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return NextResponse.json(
        { error: err.error ?? "Revenue reconciliation is temporarily unavailable." },
        { status: response.status },
      );
    }

    const reconciliation = revenueReconciliationResponseSchema.parse(await response.json());

    return new Response(reconciliation.csv.content, {
      status: 200,
      headers: {
        "content-type": reconciliation.csv.contentType,
        "content-disposition": `attachment; filename="${reconciliation.csv.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Revenue reconciliation proxy error:", error);
    return NextResponse.json(
      { error: "Revenue reconciliation is temporarily unavailable." },
      { status: 500 },
    );
  }
}
