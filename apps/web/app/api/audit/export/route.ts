import { NextResponse } from "next/server";
import { auditExportResponseSchema } from "@sales/shared";
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
    const response = await fetch(`${getServerApiBaseUrl()}/v1/audit/export`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return NextResponse.json(
        { error: err.error ?? "Audit export is temporarily unavailable." },
        { status: response.status },
      );
    }

    const auditExport = auditExportResponseSchema.parse(await response.json());

    return new Response(auditExport.file.content, {
      status: 200,
      headers: {
        "content-type": auditExport.file.contentType,
        "content-disposition": `attachment; filename="${auditExport.file.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Audit export proxy error:", error);
    return NextResponse.json(
      { error: "Audit export is temporarily unavailable." },
      { status: 500 },
    );
  }
}
