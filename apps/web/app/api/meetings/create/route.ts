import { NextRequest, NextResponse } from "next/server";
import { createMeetingInputSchema, meetingRecordSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

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

function normalizedScheduledFor(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: string,
  message?: string,
) {
  const redirectUrl = new URL(
    appendStatusParam(returnTo, "meetingStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("meetingMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = createMeetingInputSchema.parse({
      leadId: formData.get("leadId"),
      scheduledFor: normalizedScheduledFor(formData.get("scheduledFor")),
      owner: formData.get("owner"),
      notes: formData.get("notes"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/meetings`, {
      method: "POST",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        err.error ?? "Meeting could not be scheduled.",
      );
    }

    const meeting = meetingRecordSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      "created",
      `Meeting scheduled for ${meeting.owner}.`,
    );
  } catch (error) {
    console.error("Meeting create proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?meetingStatus=error", request.url), {
      status: 303,
    });
  }
}
