import { Resend } from "resend";
import twilio from "twilio";

export type VerifiedWebhook = {
  verified: boolean;
  eventType: string;
  payload: unknown;
  detail: string;
};

export async function verifyResendWebhook(rawBody: string, headers: Headers): Promise<VerifiedWebhook> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return {
      verified: false,
      eventType: "resend.unconfigured",
      payload: rawBody,
      detail: "RESEND_WEBHOOK_SECRET is not configured.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder");
  const payload = resend.webhooks.verify({
    payload: rawBody,
    headers: {
      id: headers.get("svix-id") ?? "",
      signature: headers.get("svix-signature") ?? "",
      timestamp: headers.get("svix-timestamp") ?? "",
    },
    webhookSecret,
  });

  return {
    verified: true,
    eventType: String(payload.type ?? "resend.event"),
    payload,
    detail: "Resend webhook signature verified.",
  };
}

export async function verifyTwilioVoiceWebhook(
  requestUrl: string,
  formData: URLSearchParams,
  signature: string | null,
): Promise<VerifiedWebhook> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken || !signature) {
    return {
      verified: false,
      eventType: "twilio.unconfigured",
      payload: Object.fromEntries(formData.entries()),
      detail: "TWILIO_AUTH_TOKEN or X-Twilio-Signature is missing.",
    };
  }

  const candidateUrl = process.env.TWILIO_STATUS_CALLBACK_URL ?? requestUrl;
  const params = Object.fromEntries(formData.entries());
  const verified = twilio.validateRequest(authToken, signature, candidateUrl, params);

  return {
    verified,
    eventType: String(params.CallStatus ?? "twilio.voice.status"),
    payload: params,
    detail: verified ? "Twilio signature verified." : "Twilio signature verification failed.",
  };
}
