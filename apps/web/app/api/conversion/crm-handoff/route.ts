import { NextResponse } from "next/server";
import { crmHandoffResponseSchema } from "@sales/shared";
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
    const response = await fetch(`${getServerApiBaseUrl()}/v1/conversion/crm-handoff`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return NextResponse.json(
        { error: err.error ?? "CRM handoff is temporarily unavailable." },
        { status: response.status },
      );
    }

    const handoff = crmHandoffResponseSchema.parse(await response.json());

    return new Response(handoff.csv.content, {
      status: 200,
      headers: {
        "content-type": handoff.csv.contentType,
        "content-disposition": `attachment; filename="${handoff.csv.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("CRM handoff proxy error:", error);
    return NextResponse.json(
      { error: "CRM handoff is temporarily unavailable." },
      { status: 500 },
    );
  }
}
