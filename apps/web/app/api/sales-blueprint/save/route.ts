import { NextRequest, NextResponse } from "next/server";
import { upsertSalesBlueprintInputSchema } from "@sales/shared";
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

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const parsed = upsertSalesBlueprintInputSchema.parse({
      businessName: formData.get("businessName"),
      website: formData.get("website"),
      industry: formData.get("industry"),
      offerSummary: formData.get("offerSummary"),
      targetAudience: formData.get("targetAudience"),
      regions: formData.get("regions"),
      goals: formData.get("goals"),
      channels: formData.get("channels"),
      constraints: formData.get("constraints"),
      voice: formData.get("voice"),
      summary: formData.get("summary"),
      icpSummary: formData.get("icpSummary"),
      buyerRoles: formData.get("buyerRoles"),
      painPoints: formData.get("painPoints"),
      disqualifiers: formData.get("disqualifiers"),
      qualificationRules: formData.get("qualificationRules"),
      sourceChannels: formData.get("sourceChannels"),
      outreachChannels: formData.get("outreachChannels"),
      searchKeywords: formData.get("searchKeywords"),
      monthlyLeadTarget: formData.get("monthlyLeadTarget"),
      meetingTarget: formData.get("meetingTarget"),
      averageContractValue: formData.get("averageContractValue"),
      automationMode: formData.get("automationMode"),
      approvalRequiredFor: formData.get("approvalRequiredFor"),
      complianceNotes: formData.get("complianceNotes"),
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(`${getServerApiBaseUrl()}/v1/sales-blueprint`, {
      method: "PUT",
      headers,
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      const redirectUrl = new URL(
        appendStatusParam(returnTo, "blueprintStatus", "error"),
        request.url,
      );
      if (err.error) {
        redirectUrl.searchParams.set("blueprintMessage", err.error);
      }
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.redirect(
      new URL(appendStatusParam(returnTo, "blueprintStatus", "saved"), request.url),
      { status: 303 },
    );
  } catch (error) {
    console.error("Save sales blueprint proxy error:", error);
    return NextResponse.redirect(new URL("/settings?blueprintStatus=error", request.url), {
      status: 303,
    });
  }
}
