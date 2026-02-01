import OpenAI from "openai";
import type { Lead, BusinessProfile, AgenticTask } from "@shared/schema";

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

export interface LeadScoreResult {
  score: number;
  factors: { name: string; impact: number; description: string }[];
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
}

export interface PersonalizedContent {
  subject: string;
  emailBody: string;
  talkingPoints: string[];
  proposalSummary: string;
}

export interface AgentExecutionResult {
  success: boolean;
  data: any;
  summary: string;
  nextActions: string[];
}

export async function calculateLeadScore(
  lead: Lead,
  activities: { type: string; createdAt: Date | null }[],
  businessProfile?: BusinessProfile
): Promise<LeadScoreResult> {
  const daysSinceCreated = lead.createdAt 
    ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const daysSinceContact = lead.lastContactedAt
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const activityCount = activities.length;

  const prompt = `Analyze this sales lead and provide a score from 0-100 with detailed reasoning.

Lead Information:
- Name: ${lead.name}
- Company: ${lead.company || "Unknown"}
- Title: ${lead.title || "Unknown"}
- Source: ${lead.source || "Unknown"}
- Status: ${lead.status}
- Days since created: ${daysSinceCreated}
- Days since last contact: ${daysSinceContact ?? "Never contacted"}
- Total activities/interactions: ${activityCount}
- Current score: ${lead.score || 0}
- Notes: ${lead.notes || "None"}

${businessProfile ? `Business Context:
- Our Industry: ${businessProfile.industry}
- Target Market: ${businessProfile.targetMarket}
- Ideal Customer: ${businessProfile.idealCustomer}` : ""}

Respond in JSON format:
{
  "score": number (0-100),
  "factors": [{"name": "factor name", "impact": number (-20 to +20), "description": "why"}],
  "recommendation": "specific next action",
  "riskLevel": "low" | "medium" | "high"
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      score: Math.max(0, Math.min(100, result.score || 50)),
      factors: result.factors || [],
      recommendation: result.recommendation || "Follow up with lead",
      riskLevel: result.riskLevel || "medium",
    };
  } catch (error) {
    console.error("Lead scoring error:", error);
    let baseScore = 50;
    if (lead.company) baseScore += 10;
    if (lead.title) baseScore += 5;
    if (activityCount > 3) baseScore += 15;
    if (daysSinceContact && daysSinceContact > 14) baseScore -= 20;
    
    return {
      score: Math.max(0, Math.min(100, baseScore)),
      factors: [{ name: "Basic Analysis", impact: 0, description: "Used fallback scoring" }],
      recommendation: "Review lead details",
      riskLevel: daysSinceContact && daysSinceContact > 14 ? "high" : "medium",
    };
  }
}

export async function generatePersonalizedContent(
  lead: Lead,
  businessProfile: BusinessProfile,
  contentType: "cold_email" | "follow_up" | "proposal" | "meeting_prep"
): Promise<PersonalizedContent> {
  const prompt = `Generate personalized sales content for this prospect.

Prospect:
- Name: ${lead.name}
- Company: ${lead.company || "Unknown"}
- Title: ${lead.title || "Unknown"}
- Industry: Based on company
- Notes: ${lead.notes || "None"}

Our Business:
- Company: ${businessProfile.businessName}
- Industry: ${businessProfile.industry}
- Value Proposition: ${businessProfile.valueProposition || "Quality solutions"}
- Target Market: ${businessProfile.targetMarket}

Content Type: ${contentType}

Generate in JSON format:
{
  "subject": "email subject line",
  "emailBody": "full email body with personalization",
  "talkingPoints": ["point1", "point2", "point3"],
  "proposalSummary": "brief proposal tailored to their needs"
}

Make it professional, personalized, and action-oriented. Avoid generic phrases.`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Content generation error:", error);
    return {
      subject: `Following up - ${businessProfile.businessName}`,
      emailBody: `Hi ${lead.name},\n\nI wanted to reach out regarding how we can help ${lead.company || "your team"}.\n\nBest regards`,
      talkingPoints: ["Introduce value proposition", "Ask about current challenges", "Propose next steps"],
      proposalSummary: "Custom solution tailored to your needs",
    };
  }
}

export async function executeAgentTask(
  task: AgenticTask,
  businessProfile?: BusinessProfile,
  leads?: Lead[]
): Promise<AgentExecutionResult> {
  const taskPrompts: Record<string, string> = {
    "lead-scraper": `You are a lead generation agent. Simulate finding new leads based on these criteria:
${businessProfile ? `Target Market: ${businessProfile.targetMarket}
Industry: ${businessProfile.industry}
Ideal Customer: ${businessProfile.idealCustomer}` : "General B2B companies"}

Generate 5 realistic lead profiles in JSON format:
{
  "leads": [{"name": "Full Name", "company": "Company", "title": "Title", "email": "email@example.com", "source": "linkedin"}],
  "summary": "description of search",
  "nextActions": ["action1", "action2"]
}`,

    "email-outreach": `You are an email outreach agent. Based on ${leads?.length || 0} leads in the system, create a personalized outreach strategy.

Generate in JSON format:
{
  "emailsToSend": [{"leadName": "name", "subject": "subject", "preview": "first line"}],
  "summary": "outreach strategy summary",
  "nextActions": ["send emails", "track opens"]
}`,

    "market-analysis": `You are a market analysis agent for ${businessProfile?.industry || "technology"} industry.

Generate market insights in JSON format:
{
  "trends": [{"trend": "name", "impact": "description", "opportunity": "how to capitalize"}],
  "competitorMoves": ["observation1", "observation2"],
  "recommendations": ["rec1", "rec2"],
  "summary": "market overview",
  "nextActions": ["action1", "action2"]
}`,

    "competitor-monitor": `You are a competitive intelligence agent monitoring competitors for ${businessProfile?.businessName || "our company"}.

Competitors: ${businessProfile?.competitors?.join(", ") || "Unknown"}

Generate intelligence in JSON format:
{
  "updates": [{"competitor": "name", "update": "what happened", "threat": "low/medium/high"}],
  "summary": "competitive landscape",
  "nextActions": ["monitor pricing", "track product launches"]
}`,

    "customer-insights": `You are a customer insights agent analyzing ${leads?.length || 0} leads and their behaviors.

Generate insights in JSON format:
{
  "segments": [{"name": "segment", "size": number, "characteristics": "desc"}],
  "churnRisk": [{"pattern": "pattern", "affectedLeads": number}],
  "upsellOpportunities": ["opportunity1"],
  "summary": "customer analysis",
  "nextActions": ["action1", "action2"]
}`,

    "sales-optimizer": `You are a sales optimization agent. Analyze the sales process and suggest improvements.

Current metrics: ${leads?.length || 0} leads in pipeline

Generate in JSON format:
{
  "bottlenecks": [{"stage": "stage", "issue": "problem", "solution": "fix"}],
  "quickWins": ["win1", "win2"],
  "processImprovements": ["improvement1"],
  "summary": "optimization recommendations",
  "nextActions": ["action1", "action2"]
}`
  };

  const prompt = taskPrompts[task.type] || taskPrompts["market-analysis"];

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const data = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      success: true,
      data,
      summary: data.summary || "Task completed successfully",
      nextActions: data.nextActions || [],
    };
  } catch (error) {
    console.error("Agent execution error:", error);
    return {
      success: false,
      data: null,
      summary: "Task execution failed",
      nextActions: ["Retry task", "Check configuration"],
    };
  }
}

export async function analyzeConversation(
  notes: string,
  context: string
): Promise<{ insights: string[]; coaching: string[]; sentiment: string; nextSteps: string[] }> {
  const prompt = `Analyze this sales conversation/notes and provide coaching insights.

Notes: ${notes}
Context: ${context}

Respond in JSON:
{
  "insights": ["key insight 1", "insight 2"],
  "coaching": ["improvement suggestion 1", "suggestion 2"],
  "sentiment": "positive/neutral/negative",
  "nextSteps": ["recommended action 1", "action 2"]
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
    return {
      insights: ["Unable to analyze at this time"],
      coaching: ["Review conversation manually"],
      sentiment: "neutral",
      nextSteps: ["Follow up with prospect"],
    };
  }
}

export async function identifyStaleLeads(
  leads: Lead[],
  staleDays: number = 14
): Promise<{ leadId: number; daysSinceActivity: number; riskLevel: string; recommendation: string }[]> {
  const now = Date.now();
  const staleLeads: { leadId: number; daysSinceActivity: number; riskLevel: string; recommendation: string }[] = [];

  for (const lead of leads) {
    const lastActivity = lead.lastContactedAt ? new Date(lead.lastContactedAt).getTime() : 
                         lead.createdAt ? new Date(lead.createdAt).getTime() : now;
    const daysSince = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

    if (daysSince >= staleDays) {
      let riskLevel = "medium";
      let recommendation = "Schedule follow-up call";

      if (daysSince >= 30) {
        riskLevel = "high";
        recommendation = "Urgent: Re-engage or mark as cold";
      } else if (daysSince >= 21) {
        riskLevel = "high";
        recommendation = "Send personalized re-engagement email";
      }

      staleLeads.push({
        leadId: lead.id,
        daysSinceActivity: daysSince,
        riskLevel,
        recommendation,
      });
    }
  }

  return staleLeads.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
}
