import { NextRequest, NextResponse } from "next/server";
import { meetingRecordSchema, updateMeetingInputSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

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

function dealValueCentsFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const [{ id }, formData] = await Promise.all([context.params, request.formData()]);
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard");
    const parsed = updateMeetingInputSchema.parse({
      status: formData.get("status"),
      notes: formData.get("notes"),
      dealValueCents: dealValueCentsFromForm(formData.get("dealValue")),
      dealCurrency: formData.get("dealCurrency") || "USD",
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/meetings/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(parsed),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        err.error ?? "Meeting outcome could not be updated.",
      );
    }

    const meeting = meetingRecordSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      "updated",
      `Meeting marked ${meeting.status}.`,
    );
  } catch (error) {
    console.error("Meeting update proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?meetingStatus=error", request.url), {
      status: 303,
    });
  }
}
