import { NextRequest, NextResponse } from "next/server";
import {
  contactIntakeResponseSchema,
  CONTACT_INTAKE_MAX_BODY_BYTES,
  ContactIntakeBodyTooLargeError,
  createContactIntakeInputSchema,
  isContactIntakeBodyTooLarge,
  isContactIntakeSpamTrapTriggered,
  readContactIntakeBodyText,
} from "@sales/shared";
import { rejectCrossOriginMutation } from "@/lib/same-origin";

type ErrorResponse = {
  error?: string;
};

function getServerApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

async function readErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {};
  }
}

function redirectToContact(
  request: NextRequest,
  status: "submitted" | "error",
  message?: string,
  priority?: string,
) {
  const url = new URL("/contact", request.url);
  url.searchParams.set("contactStatus", status);

  if (message) {
    url.searchParams.set("contactMessage", message);
  }

  if (priority) {
    url.searchParams.set("contactPriority", priority);
  }

  return NextResponse.redirect(url, { status: 303 });
}

function optionalUtmValue(value: FormDataEntryValue | null) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function optionalFormValue(value: FormDataEntryValue | null) {
  return value === null ? undefined : value;
}

function createContactIntakeApiHeaders(request: NextRequest) {
  const headers = new Headers({
    "content-type": "application/json",
  });

  for (const name of ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "user-agent"] as const) {
    const value = request.headers.get(name)?.trim();

    if (value) {
      headers.set(name, value.slice(0, 1000));
    }
  }

  return headers;
}

async function readUrlEncodedContactFormData(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-www-form-urlencoded")) {
    throw new Error("Contact intake form submissions must be URL encoded.");
  }

  const body = await readContactIntakeBodyText(request);
  const params = new URLSearchParams(body);
  const formData = new FormData();

  params.forEach((value, key) => {
    formData.append(key, value);
  });

  return formData;
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    if (isContactIntakeBodyTooLarge(request.headers.get("content-length"))) {
      return redirectToContact(
        request,
        "error",
        `Contact request is too large. Please keep the message under 2,400 characters and below ${CONTACT_INTAKE_MAX_BODY_BYTES.toLocaleString()} bytes.`,
      );
    }

    const formData = await readUrlEncodedContactFormData(request);
    const companyWebsiteUrl = optionalFormValue(formData.get("companyWebsiteUrl"));

    if (
      typeof companyWebsiteUrl === "string" &&
      isContactIntakeSpamTrapTriggered({ companyWebsiteUrl })
    ) {
      return redirectToContact(
        request,
        "submitted",
        "Your request was captured for review.",
      );
    }

    const parsed = createContactIntakeInputSchema.parse({
      intent: optionalFormValue(formData.get("intent")),
      name: formData.get("name"),
      email: formData.get("email"),
      companyName: formData.get("companyName"),
      website: optionalFormValue(formData.get("website")),
      companyWebsiteUrl,
      role: optionalFormValue(formData.get("role")),
      teamSize: optionalFormValue(formData.get("teamSize")),
      monthlyLeadGoal: optionalFormValue(formData.get("monthlyLeadGoal")),
      budgetRange: optionalFormValue(formData.get("budgetRange")),
      timeline: optionalFormValue(formData.get("timeline")),
      goals: formData.getAll("goals"),
      channels: formData.getAll("channels"),
      message: formData.get("message"),
      sourcePath: optionalFormValue(formData.get("sourcePath")),
      referrer: request.headers.get("referer") ?? "",
      utm: {
        source: optionalUtmValue(formData.get("utmSource")),
        medium: optionalUtmValue(formData.get("utmMedium")),
        campaign: optionalUtmValue(formData.get("utmCampaign")),
        pricingPlan: optionalUtmValue(formData.get("pricingPlan")),
        pricingIntent: optionalUtmValue(formData.get("pricingIntent")),
        managedPackage: optionalUtmValue(formData.get("managedPackage")),
        managedIntent: optionalUtmValue(formData.get("managedIntent")),
        solutionSegment: optionalUtmValue(formData.get("solutionSegment")),
        segment: optionalUtmValue(formData.get("segment")),
        integration: optionalUtmValue(formData.get("integration")),
        integrationIntent: optionalUtmValue(formData.get("integrationIntent")),
        integrationStatus: optionalUtmValue(formData.get("integrationStatus")),
        integrationCommercialPath: optionalUtmValue(
          formData.get("integrationCommercialPath"),
        ),
      },
    });
    const response = await fetch(`${getServerApiBaseUrl()}/v1/contact/intake`, {
      method: "POST",
      headers: createContactIntakeApiHeaders(request),
      body: JSON.stringify(parsed),
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await readErrorResponse(response);
      return redirectToContact(
        request,
        "error",
        err.error ?? "Your request could not be captured. Please email hello@winrate.ai.",
      );
    }

    const payload = contactIntakeResponseSchema.parse(await response.json());
    return redirectToContact(
      request,
      "submitted",
      payload.detail,
      payload.submission.priority,
    );
  } catch (error) {
    if (error instanceof ContactIntakeBodyTooLargeError) {
      return redirectToContact(
        request,
        "error",
        `Contact request is too large. Please keep the message under 2,400 characters and below ${error.maxBodyBytes.toLocaleString()} bytes.`,
      );
    }

    console.error("Contact intake proxy error:", error);
    return redirectToContact(
      request,
      "error",
      "Your request could not be captured. Please email hello@winrate.ai.",
    );
  }
}
