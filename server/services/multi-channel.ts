import OpenAI from "openai";
import type { Lead, BusinessProfile, ScheduledOutreach } from "@shared/schema";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured. Please set up the AI integration.");
    }
    openai = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openai;
}

export type Channel = "email" | "linkedin" | "phone" | "sms" | "meeting";

export interface ChannelRecommendation {
  channel: Channel;
  confidence: number;
  reasoning: string;
  bestTime: string;
  messageTemplate?: string;
}

export interface OutreachSequence {
  id: string;
  name: string;
  steps: OutreachStep[];
  totalDuration: number;
  expectedResponseRate: number;
}

export interface OutreachStep {
  day: number;
  channel: Channel;
  type: string;
  subject?: string;
  content: string;
  waitCondition?: string;
}

export interface OptimalTiming {
  bestHour: number;
  bestDay: string;
  timezone: string;
  confidence: number;
  factors: string[];
}

export async function determineOptimalChannel(
  lead: Lead,
  businessProfile: BusinessProfile | undefined,
  previousInteractions?: { channel: string; response: boolean; date: Date }[]
): Promise<ChannelRecommendation[]> {
  const interactionHistory = previousInteractions?.map(i => 
    `${i.channel}: ${i.response ? "Response" : "No response"}`
  ).join(", ") || "No previous interactions";

  const prompt = `You are an expert at multi-channel sales outreach optimization. Determine the best channels to reach this prospect.

Prospect:
- Name: ${lead.name}
- Title: ${lead.title || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Source: ${lead.source || "Unknown"}
- Previous Interactions: ${interactionHistory}

Business Context:
- Industry: ${businessProfile?.industry || "Unknown"}
- Target Market: ${businessProfile?.targetMarket || "Unknown"}

Recommend channels in order of preference. Respond in JSON:
{
  "recommendations": [
    {
      "channel": "email/linkedin/phone/sms/meeting",
      "confidence": number (0-100),
      "reasoning": "why this channel",
      "bestTime": "optimal time to reach",
      "messageTemplate": "brief message template if applicable"
    }
  ],
  "sequenceSuggestion": "multi-touch sequence recommendation"
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.recommendations || [];
  } catch (error) {
    console.error("Channel optimization error:", error);
    return [
      { channel: "email", confidence: 70, reasoning: "Default channel", bestTime: "9:00 AM" }
    ];
  }
}

export async function generateOutreachSequence(
  lead: Lead,
  businessProfile: BusinessProfile | undefined,
  goal: "cold_outreach" | "follow_up" | "re_engagement" | "nurture"
): Promise<OutreachSequence> {
  const prompt = `Create a multi-channel outreach sequence for this prospect.

Prospect:
- Name: ${lead.name}
- Title: ${lead.title || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Current Status: ${lead.status}
- Score: ${lead.score || 0}

Goal: ${goal}

Business:
- Company: ${businessProfile?.businessName || "Unknown"}
- Value Proposition: ${businessProfile?.valueProposition || "Unknown"}

Generate a comprehensive sequence in JSON:
{
  "name": "sequence name",
  "steps": [
    {
      "day": number (day in sequence, starting from 0),
      "channel": "email/linkedin/phone/sms",
      "type": "initial/follow_up/value_add/break_up",
      "subject": "email subject if email",
      "content": "message content",
      "waitCondition": "condition before next step"
    }
  ],
  "totalDuration": number (days),
  "expectedResponseRate": number (0-100)
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      id: `seq_${Date.now()}`,
      name: result.name || `${goal} Sequence`,
      steps: result.steps || [],
      totalDuration: result.totalDuration || 14,
      expectedResponseRate: result.expectedResponseRate || 20,
    };
  } catch (error) {
    console.error("Sequence generation error:", error);
    return {
      id: `seq_${Date.now()}`,
      name: "Default Sequence",
      steps: [
        { day: 0, channel: "email", type: "initial", subject: "Introduction", content: "Initial outreach" },
        { day: 3, channel: "linkedin", type: "follow_up", content: "LinkedIn connection" },
        { day: 7, channel: "email", type: "value_add", subject: "Following up", content: "Follow up email" },
      ],
      totalDuration: 14,
      expectedResponseRate: 15,
    };
  }
}

export async function calculateOptimalTiming(
  lead: Lead,
  channel: Channel,
  historicalData?: { hour: number; day: string; responseRate: number }[]
): Promise<OptimalTiming> {
  const prompt = `Determine the optimal time to reach this prospect via ${channel}.

Prospect:
- Name: ${lead.name}
- Title: ${lead.title || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Industry: Based on company

Historical Response Data:
${historicalData?.map(h => `${h.day} ${h.hour}:00 - ${h.responseRate}% response rate`).join("\n") || "No historical data"}

Respond in JSON:
{
  "bestHour": number (0-23),
  "bestDay": "Monday/Tuesday/Wednesday/Thursday/Friday",
  "timezone": "estimated timezone",
  "confidence": number (0-100),
  "factors": ["factor that influenced recommendation"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Timing optimization error:", error);
    return {
      bestHour: 10,
      bestDay: "Tuesday",
      timezone: "America/New_York",
      confidence: 60,
      factors: ["Default business hours"],
    };
  }
}

export async function generateChannelContent(
  lead: Lead,
  channel: Channel,
  messageType: string,
  businessProfile: BusinessProfile | undefined
): Promise<{ subject?: string; content: string; callToAction: string }> {
  const characterLimits: Record<Channel, number> = {
    email: 2000,
    linkedin: 300,
    phone: 500,
    sms: 160,
    meeting: 1000,
  };

  const prompt = `Generate ${channel} content for sales outreach.

Prospect:
- Name: ${lead.name}
- Title: ${lead.title || "Unknown"}
- Company: ${lead.company || "Unknown"}

Our Business:
- Company: ${businessProfile?.businessName || "Unknown"}
- Value Proposition: ${businessProfile?.valueProposition || "Unknown"}

Message Type: ${messageType}
Character Limit: ${characterLimits[channel]}

Generate in JSON:
{
  "subject": "subject line if email",
  "content": "main message content",
  "callToAction": "specific call to action"
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Content generation error:", error);
    return {
      subject: channel === "email" ? "Quick question" : undefined,
      content: `Hi ${lead.name}, I wanted to reach out about how we can help ${lead.company || "your team"}.`,
      callToAction: "Would you be open to a brief call?",
    };
  }
}

export function scheduleOutreach(
  lead: Lead,
  sequence: OutreachSequence,
  startDate: Date = new Date()
): ScheduledOutreach[] {
  const scheduled: any[] = [];
  
  for (const step of sequence.steps) {
    const scheduledDate = new Date(startDate);
    scheduledDate.setDate(scheduledDate.getDate() + step.day);
    scheduledDate.setHours(10, 0, 0, 0);

    scheduled.push({
      leadId: lead.id,
      channel: step.channel,
      type: step.type,
      subject: step.subject,
      content: step.content,
      scheduledAt: scheduledDate,
      status: "scheduled",
    });
  }

  return scheduled;
}
