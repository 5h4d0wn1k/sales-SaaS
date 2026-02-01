import OpenAI from "openai";
import type { Lead, Opportunity, BusinessProfile } from "@shared/schema";

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

export interface ConversationAnalysis {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  keyTopics: string[];
  customerObjections: { objection: string; response: string; resolved: boolean }[];
  buyingSignals: { signal: string; strength: "strong" | "moderate" | "weak" }[];
  competitorMentions: { competitor: string; context: string; sentiment: string }[];
  nextBestActions: { action: string; priority: "high" | "medium" | "low"; deadline?: string }[];
  coachingPoints: { area: string; feedback: string; improvement: string }[];
  winProbability: number;
  dealRisks: { risk: string; severity: "high" | "medium" | "low"; mitigation: string }[];
}

export interface MeetingPrep {
  agenda: string[];
  talkingPoints: string[];
  anticipatedObjections: { objection: string; suggestedResponse: string }[];
  competitivePositioning: string[];
  closingStrategies: string[];
  questionsToPrepare: string[];
  riskMitigation: string[];
}

export interface SalesCoachingInsight {
  overallPerformance: number;
  strengths: string[];
  areasForImprovement: string[];
  specificFeedback: { moment: string; feedback: string; suggestion: string }[];
  skillsToFocus: string[];
  nextSteps: string[];
}

export async function analyzeConversation(
  transcript: string,
  context: {
    lead?: Lead;
    opportunity?: Opportunity;
    businessProfile?: BusinessProfile;
    meetingType?: string;
  }
): Promise<ConversationAnalysis> {
  const prompt = `You are an expert sales conversation analyst. Analyze this sales conversation and provide detailed insights.

Conversation Transcript:
${transcript}

Context:
- Lead: ${context.lead?.name || "Unknown"} from ${context.lead?.company || "Unknown"}
- Opportunity Value: $${context.opportunity?.value?.toLocaleString() || "Unknown"}
- Stage: ${context.opportunity?.stage || "Unknown"}
- Our Company: ${context.businessProfile?.businessName || "Unknown"}
- Meeting Type: ${context.meetingType || "sales call"}

Analyze the conversation and respond in JSON:
{
  "summary": "brief summary of the conversation",
  "sentiment": "positive/neutral/negative",
  "sentimentScore": number (0-100),
  "keyTopics": ["topic1", "topic2"],
  "customerObjections": [
    {"objection": "what they said", "response": "how you responded", "resolved": true/false}
  ],
  "buyingSignals": [
    {"signal": "what indicated interest", "strength": "strong/moderate/weak"}
  ],
  "competitorMentions": [
    {"competitor": "name", "context": "how mentioned", "sentiment": "positive/neutral/negative"}
  ],
  "nextBestActions": [
    {"action": "what to do", "priority": "high/medium/low", "deadline": "when"}
  ],
  "coachingPoints": [
    {"area": "skill area", "feedback": "what happened", "improvement": "how to improve"}
  ],
  "winProbability": number (0-100),
  "dealRisks": [
    {"risk": "what could go wrong", "severity": "high/medium/low", "mitigation": "how to address"}
  ]
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
      summary: result.summary || "Unable to analyze",
      sentiment: result.sentiment || "neutral",
      sentimentScore: result.sentimentScore || 50,
      keyTopics: result.keyTopics || [],
      customerObjections: result.customerObjections || [],
      buyingSignals: result.buyingSignals || [],
      competitorMentions: result.competitorMentions || [],
      nextBestActions: result.nextBestActions || [],
      coachingPoints: result.coachingPoints || [],
      winProbability: result.winProbability || 50,
      dealRisks: result.dealRisks || [],
    };
  } catch (error) {
    console.error("Conversation analysis error:", error);
    return {
      summary: "Analysis failed",
      sentiment: "neutral",
      sentimentScore: 50,
      keyTopics: [],
      customerObjections: [],
      buyingSignals: [],
      competitorMentions: [],
      nextBestActions: [{ action: "Review conversation manually", priority: "high" }],
      coachingPoints: [],
      winProbability: 50,
      dealRisks: [],
    };
  }
}

export async function generateMeetingPrep(
  lead: Lead,
  opportunity: Opportunity | undefined,
  businessProfile: BusinessProfile | undefined,
  meetingType: string,
  previousNotes?: string
): Promise<MeetingPrep> {
  const prompt = `You are a sales preparation assistant. Generate comprehensive meeting preparation for an upcoming sales meeting.

Meeting Context:
- Prospect: ${lead.name} (${lead.title || "Unknown title"})
- Company: ${lead.company || "Unknown"}
- Meeting Type: ${meetingType}
- Opportunity Value: $${opportunity?.value?.toLocaleString() || "Unknown"}
- Stage: ${opportunity?.stage || "Initial"}
- Previous Notes: ${previousNotes || "No previous notes"}

Our Company:
- Name: ${businessProfile?.businessName || "Unknown"}
- Value Proposition: ${businessProfile?.valueProposition || "Not specified"}
- Target Market: ${businessProfile?.targetMarket || "Not specified"}
- Competitors: ${businessProfile?.competitors?.join(", ") || "Not specified"}

Generate meeting preparation in JSON:
{
  "agenda": ["agenda item 1", "agenda item 2"],
  "talkingPoints": ["point 1", "point 2"],
  "anticipatedObjections": [
    {"objection": "potential objection", "suggestedResponse": "how to respond"}
  ],
  "competitivePositioning": ["positioning statement 1"],
  "closingStrategies": ["strategy 1"],
  "questionsToPrepare": ["question to ask 1"],
  "riskMitigation": ["risk mitigation strategy 1"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Meeting prep error:", error);
    return {
      agenda: ["Introduction", "Discovery", "Solution presentation", "Next steps"],
      talkingPoints: ["Review their needs", "Present our solution"],
      anticipatedObjections: [],
      competitivePositioning: [],
      closingStrategies: [],
      questionsToPrepare: ["What are your main challenges?"],
      riskMitigation: [],
    };
  }
}

export async function provideSalesCoaching(
  conversations: string[],
  performanceMetrics?: {
    closedDeals: number;
    lostDeals: number;
    avgDealCycle: number;
    responseTime: number;
  }
): Promise<SalesCoachingInsight> {
  const prompt = `You are a world-class sales coach. Analyze these sales interactions and provide coaching.

Recent Conversations:
${conversations.slice(0, 5).map((c, i) => `Conversation ${i + 1}:\n${c.slice(0, 500)}...`).join("\n\n")}

Performance Metrics:
${performanceMetrics ? `
- Closed Deals: ${performanceMetrics.closedDeals}
- Lost Deals: ${performanceMetrics.lostDeals}
- Win Rate: ${Math.round((performanceMetrics.closedDeals / (performanceMetrics.closedDeals + performanceMetrics.lostDeals)) * 100)}%
- Avg Deal Cycle: ${performanceMetrics.avgDealCycle} days
- Avg Response Time: ${performanceMetrics.responseTime} hours
` : "No metrics available"}

Provide coaching insights in JSON:
{
  "overallPerformance": number (0-100),
  "strengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"],
  "specificFeedback": [
    {"moment": "specific moment", "feedback": "what happened", "suggestion": "how to improve"}
  ],
  "skillsToFocus": ["skill 1", "skill 2"],
  "nextSteps": ["recommended action 1"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Sales coaching error:", error);
    return {
      overallPerformance: 70,
      strengths: ["Unable to analyze at this time"],
      areasForImprovement: [],
      specificFeedback: [],
      skillsToFocus: [],
      nextSteps: ["Review conversations manually"],
    };
  }
}

export async function analyzeCallRecording(
  transcript: string,
  duration: number,
  participants: string[]
): Promise<{
  talkRatio: { sales: number; customer: number };
  silencePeriods: number;
  questionsAsked: number;
  questionsAnswered: number;
  emotionalMoments: { timestamp: string; emotion: string; context: string }[];
  keyDecisions: string[];
  followUpItems: string[];
}> {
  const prompt = `Analyze this sales call transcript for metrics and insights.

Transcript:
${transcript}

Call Duration: ${duration} minutes
Participants: ${participants.join(", ")}

Provide analysis in JSON:
{
  "talkRatio": {"sales": number (0-100), "customer": number (0-100)},
  "silencePeriods": number,
  "questionsAsked": number,
  "questionsAnswered": number,
  "emotionalMoments": [
    {"timestamp": "approximate time", "emotion": "emotion detected", "context": "what triggered"}
  ],
  "keyDecisions": ["decision 1"],
  "followUpItems": ["item 1"]
}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("Call analysis error:", error);
    return {
      talkRatio: { sales: 50, customer: 50 },
      silencePeriods: 0,
      questionsAsked: 0,
      questionsAnswered: 0,
      emotionalMoments: [],
      keyDecisions: [],
      followUpItems: [],
    };
  }
}
