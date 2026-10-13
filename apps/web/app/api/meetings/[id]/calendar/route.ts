import { NextRequest, NextResponse } from "next/server";
import { meetingCalendarHandoffResponseSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";

type ErrorResponse = {
  error?: string;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/meetings/${encodeURIComponent(id)}/calendar`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return NextResponse.json(
        { error: err.error ?? "Calendar handoff is temporarily unavailable." },
        { status: response.status },
      );
    }

    const handoff = meetingCalendarHandoffResponseSchema.parse(await response.json());
    if (!handoff.ready || !handoff.ics) {
      return NextResponse.json(
        {
          error:
            handoff.blockers[0] ??
            "Calendar handoff is not available for this meeting yet.",
        },
        { status: 409 },
      );
    }

    return new Response(handoff.ics.content, {
      status: 200,
      headers: {
        "content-type": handoff.ics.contentType,
        "content-disposition": `attachment; filename="${handoff.ics.filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Meeting calendar proxy error:", error);
    return NextResponse.json(
      { error: "Calendar handoff is temporarily unavailable." },
      { status: 500 },
    );
  }
}
