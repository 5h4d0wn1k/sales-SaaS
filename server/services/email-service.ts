import type { Lead, Campaign, EmailTracking } from "@shared/schema";
import { randomUUID } from "crypto";

export interface EmailConfig {
  provider: "sendgrid" | "resend" | "simulation";
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  trackingId?: string;
  metadata?: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  emailId: string;
  provider: string;
  timestamp: Date;
  error?: string;
}

class EmailService {
  private config: EmailConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      provider: "simulation",
      fromEmail: process.env.EMAIL_FROM || "sales@yourcompany.com",
      fromName: process.env.EMAIL_FROM_NAME || "Sales Team",
    };
    this.baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : "http://localhost:5000";
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    const emailId = params.trackingId || randomUUID();
    const timestamp = new Date();

    try {
      if (this.config.provider === "simulation") {
        return this.simulateSend(params, emailId, timestamp);
      }

      return {
        success: true,
        emailId,
        provider: this.config.provider,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        emailId,
        provider: this.config.provider,
        timestamp,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async simulateSend(params: SendEmailParams, emailId: string, timestamp: Date): Promise<EmailResult> {
    console.log(`[EMAIL SIMULATION] Sending to: ${params.to}`);
    console.log(`[EMAIL SIMULATION] Subject: ${params.subject}`);
    console.log(`[EMAIL SIMULATION] Email ID: ${emailId}`);
    
    return {
      success: true,
      emailId,
      provider: "simulation",
      timestamp,
    };
  }

  async sendBulkEmails(emails: SendEmailParams[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
  }

  generateTrackingPixel(emailId: string): string {
    return `<img src="${this.baseUrl}/api/email-tracking/open/${emailId}" width="1" height="1" style="display:none" alt="" />`;
  }

  generateTrackedLink(url: string, emailId: string): string {
    const encodedUrl = encodeURIComponent(url);
    return `${this.baseUrl}/api/email-tracking/click/${emailId}?url=${encodedUrl}`;
  }

  wrapEmailWithTracking(html: string, emailId: string): string {
    let trackedHtml = html.replace(
      /<a\s+href="([^"]+)"/g,
      (match, url) => {
        if (url.includes("email-tracking")) return match;
        return `<a href="${this.generateTrackedLink(url, emailId)}"`;
      }
    );
    
    trackedHtml += this.generateTrackingPixel(emailId);
    return trackedHtml;
  }

  async sendCampaignEmail(lead: Lead, campaign: Campaign, personalizedContent: string): Promise<EmailResult> {
    const emailId = randomUUID();
    const trackedContent = this.wrapEmailWithTracking(personalizedContent, emailId);

    return this.sendEmail({
      to: lead.email,
      subject: campaign.subject || "Message from our team",
      html: trackedContent,
      trackingId: emailId,
      metadata: {
        leadId: lead.id,
        campaignId: campaign.id,
        leadName: lead.name,
        company: lead.company,
      },
    });
  }
}

export const emailService = new EmailService();
