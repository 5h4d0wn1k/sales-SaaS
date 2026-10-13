import { NextRequest, NextResponse } from "next/server";
import { createLeadInputSchema, leadRecordSchema } from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";
import {
  appendUpgradeSearchParams,
  normalizeUpgradeRecommendation,
} from "@/lib/upgrade-recommendation";

type ErrorResponse = {
  error?: string;
  upgrade?: unknown;
};

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

function optionalText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: string,
  message?: string,
  upgrade?: unknown,
) {
  const normalizedUpgrade = normalizeUpgradeRecommendation(upgrade);
  const target = normalizedUpgrade
    ? appendUpgradeSearchParams(
        appendStatusParam(returnTo, "leadStatus", status),
        normalizedUpgrade,
      )
    : appendStatusParam(returnTo, "leadStatus", status);
  const redirectUrl = new URL(target, request.url);

  if (message) {
    redirectUrl.searchParams.set("leadMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/dashboard#leads");
    const rawScore = formData.get("score");
    const parsed = createLeadInputSchema.parse({
      fullName: formData.get("fullName"),
      email: optionalText(formData.get("email")),
      phone: optionalText(formData.get("phone")),
      company: optionalText(formData.get("company")),
      source: formData.get("source"),
      score: rawScore ? Number(rawScore) : undefined,
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/leads`, {
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
        err.error ?? "Manual lead could not be imported.",
        err.upgrade,
      );
    }

    const lead = leadRecordSchema.parse(await response.json());
    return redirectWithStatus(
      request,
      returnTo,
      "created",
      `${lead.fullName} imported from ${lead.source} for review.`,
    );
  } catch (error) {
    console.error("Manual lead import proxy error:", error);
    return NextResponse.redirect(new URL("/dashboard?leadStatus=error#leads", request.url), {
      status: 303,
    });
  }
}
