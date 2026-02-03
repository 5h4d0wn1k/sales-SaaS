import { storage } from "../storage";
import crypto from "crypto";

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  signature?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

const registeredWebhooks: Map<string, WebhookConfig[]> = new Map();

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function triggerWebhook(userId: string, event: string, data: any): Promise<void> {
  const webhooks = registeredWebhooks.get(userId) || [];
  const activeWebhooks = webhooks.filter(w => w.isActive && w.events.includes(event));

  for (const webhook of activeWebhooks) {
    try {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const payloadString = JSON.stringify(payload);
      const signature = signPayload(payloadString, webhook.secret);

      await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body: payloadString,
      });

      console.log(`[Webhook] Triggered ${event} to ${webhook.url}`);
    } catch (error) {
      console.error(`[Webhook] Failed to trigger ${event} to ${webhook.url}:`, error);
    }
  }
}

export function registerWebhook(userId: string, config: Omit<WebhookConfig, "id" | "secret">): WebhookConfig {
  const webhook: WebhookConfig = {
    ...config,
    id: crypto.randomUUID(),
    secret: generateWebhookSecret(),
  };

  const userWebhooks = registeredWebhooks.get(userId) || [];
  userWebhooks.push(webhook);
  registeredWebhooks.set(userId, userWebhooks);

  return webhook;
}

export function getWebhooks(userId: string): WebhookConfig[] {
  return registeredWebhooks.get(userId) || [];
}

export function deleteWebhook(userId: string, webhookId: string): boolean {
  const webhooks = registeredWebhooks.get(userId) || [];
  const index = webhooks.findIndex(w => w.id === webhookId);
  if (index === -1) return false;
  
  webhooks.splice(index, 1);
  registeredWebhooks.set(userId, webhooks);
  return true;
}

export const WebhookEvents = {
  LEAD_CREATED: "lead.created",
  LEAD_UPDATED: "lead.updated",
  LEAD_SCORED: "lead.scored",
  LEAD_CONVERTED: "lead.converted",
  OPPORTUNITY_CREATED: "opportunity.created",
  OPPORTUNITY_STAGE_CHANGED: "opportunity.stage_changed",
  OPPORTUNITY_WON: "opportunity.won",
  OPPORTUNITY_LOST: "opportunity.lost",
  CLIENT_CREATED: "client.created",
  CAMPAIGN_SENT: "campaign.sent",
  EMAIL_OPENED: "email.opened",
  EMAIL_CLICKED: "email.clicked",
  EMAIL_REPLIED: "email.replied",
  MEETING_SCHEDULED: "meeting.scheduled",
  AGENT_COMPLETED: "agent.completed",
  AUTOMATION_TRIGGERED: "automation.triggered",
} as const;

export type WebhookEvent = typeof WebhookEvents[keyof typeof WebhookEvents];

export async function processIncomingWebhook(
  source: string,
  event: string,
  payload: any,
  signature?: string,
  secret?: string
): Promise<{ success: boolean; message: string }> {
  if (secret && signature) {
    const isValid = verifySignature(JSON.stringify(payload), signature, secret);
    if (!isValid) {
      return { success: false, message: "Invalid webhook signature" };
    }
  }

  try {
    switch (source) {
      case "stripe":
        return await processStripeWebhook(event, payload);
      case "email":
        return await processEmailWebhook(event, payload);
      case "calendar":
        return await processCalendarWebhook(event, payload);
      default:
        return await processGenericWebhook(source, event, payload);
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${source} webhook:`, error);
    return { success: false, message: "Webhook processing failed" };
  }
}

async function processStripeWebhook(event: string, payload: any): Promise<{ success: boolean; message: string }> {
  switch (event) {
    case "checkout.session.completed":
      console.log("[Stripe] Checkout completed:", payload.id);
      return { success: true, message: "Checkout processed" };
    
    case "customer.subscription.updated":
      console.log("[Stripe] Subscription updated:", payload.id);
      return { success: true, message: "Subscription updated" };
    
    case "customer.subscription.deleted":
      console.log("[Stripe] Subscription cancelled:", payload.id);
      return { success: true, message: "Subscription cancelled" };
    
    case "invoice.paid":
      console.log("[Stripe] Invoice paid:", payload.id);
      return { success: true, message: "Invoice processed" };
    
    default:
      return { success: true, message: `Unhandled Stripe event: ${event}` };
  }
}

async function processEmailWebhook(event: string, payload: any): Promise<{ success: boolean; message: string }> {
  switch (event) {
    case "email.delivered":
      console.log("[Email] Email delivered:", payload.emailId);
      return { success: true, message: "Delivery recorded" };
    
    case "email.opened":
      if (payload.emailId) {
        await storage.updateEmailTrackingOpen(payload.emailId);
      }
      return { success: true, message: "Open recorded" };
    
    case "email.clicked":
      if (payload.emailId) {
        await storage.updateEmailTrackingClick(payload.emailId);
      }
      return { success: true, message: "Click recorded" };
    
    case "email.bounced":
      console.log("[Email] Email bounced:", payload.emailId);
      return { success: true, message: "Bounce recorded" };
    
    default:
      return { success: true, message: `Unhandled email event: ${event}` };
  }
}

async function processCalendarWebhook(event: string, payload: any): Promise<{ success: boolean; message: string }> {
  switch (event) {
    case "meeting.scheduled":
      console.log("[Calendar] Meeting scheduled:", payload.meetingId);
      return { success: true, message: "Meeting recorded" };
    
    case "meeting.cancelled":
      console.log("[Calendar] Meeting cancelled:", payload.meetingId);
      return { success: true, message: "Cancellation recorded" };
    
    case "meeting.rescheduled":
      console.log("[Calendar] Meeting rescheduled:", payload.meetingId);
      return { success: true, message: "Reschedule recorded" };
    
    default:
      return { success: true, message: `Unhandled calendar event: ${event}` };
  }
}

async function processGenericWebhook(source: string, event: string, payload: any): Promise<{ success: boolean; message: string }> {
  console.log(`[Webhook] Generic webhook from ${source}: ${event}`, payload);
  return { success: true, message: `Processed ${source} event: ${event}` };
}
