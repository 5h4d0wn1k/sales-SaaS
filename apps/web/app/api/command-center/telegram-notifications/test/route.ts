import { NextRequest, NextResponse } from "next/server";
import {
  sendTelegramNotificationInputSchema,
  telegramNotificationDeliveryResponseSchema,
  type TelegramNotificationDeliveryResponse,
} from "@sales/shared";
import { createServerApiHeaders, getServerApiBaseUrl } from "@/lib/server-api-auth";
import { rejectCrossOriginMutation } from "@/lib/same-origin";
import { appendStatusParam, resolveReturnTo } from "@/lib/return-to";

type ErrorResponse = {
  error?: string;
  detail?: string;
  mode?: string;
};

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function deliveryStatusForMode(mode: TelegramNotificationDeliveryResponse["mode"]) {
  if (mode === "preview") {
    return "previewed";
  }

  return mode;
}

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: string,
  message?: string,
) {
  const redirectUrl = new URL(
    appendStatusParam(returnTo, "telegramNotificationStatus", status),
    request.url,
  );

  if (message) {
    redirectUrl.searchParams.set("telegramNotificationMessage", message);
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

function redirectWithDelivery(
  request: NextRequest,
  returnTo: string,
  delivery: TelegramNotificationDeliveryResponse,
) {
  const redirectUrl = new URL(
    appendStatusParam(
      returnTo,
      "telegramNotificationStatus",
      deliveryStatusForMode(delivery.mode),
    ),
    request.url,
  );

  redirectUrl.searchParams.set("telegramNotificationMessage", delivery.detail);
  redirectUrl.searchParams.set("telegramNotificationMode", delivery.mode);
  redirectUrl.searchParams.set(
    "telegramNotificationType",
    delivery.notificationType,
  );

  if (delivery.chatIdMask) {
    redirectUrl.searchParams.set(
      "telegramNotificationChat",
      delivery.chatIdMask,
    );
  }

  if (delivery.auditEventId) {
    redirectUrl.searchParams.set(
      "telegramNotificationAudit",
      delivery.auditEventId,
    );
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  const crossOrigin = rejectCrossOriginMutation(request);
  if (crossOrigin) return crossOrigin;

  try {
    const formData = await request.formData();
    const returnTo = resolveReturnTo(formData.get("returnTo"), "/settings");
    const parsed = sendTelegramNotificationInputSchema.parse({
      notificationType: formData.get("notificationType"),
      dryRun: formData.get("dryRun") === "true",
    });
    const headers = await createServerApiHeaders();
    const response = await fetch(
      `${getServerApiBaseUrl()}/v1/command-center/telegram-notifications/test`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(parsed),
        cache: "no-store",
      },
    );

    const rawBody = await readJsonResponse(response);
    const delivery = telegramNotificationDeliveryResponseSchema.safeParse(rawBody);

    if (!response.ok) {
      if (delivery.success) {
        return redirectWithDelivery(request, returnTo, delivery.data);
      }

      const err = rawBody as ErrorResponse;
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        err.detail ?? err.error ?? "Telegram notification test could not be sent.",
      );
    }

    if (!delivery.success) {
      return redirectWithStatus(
        request,
        returnTo,
        "error",
        "Telegram notification test returned an invalid delivery response.",
      );
    }

    return redirectWithDelivery(request, returnTo, delivery.data);
  } catch (error) {
    console.error("Telegram notification test proxy error:", error);
    return NextResponse.redirect(
      new URL("/settings?telegramNotificationStatus=error", request.url),
      { status: 303 },
    );
  }
}
