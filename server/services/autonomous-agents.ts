import OpenAI from "openai";
import type { Lead, BusinessProfile, AgenticTask, Opportunity, Client } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AgentContext {
  businessProfile?: BusinessProfile;
  leads: Lead[];
  opportunities: Opportunity[];
  clients: Client[];
  taskHistory?: any[];
}

export interface AgentAction {
  type: string;
  description: string;
  data: any;
  priority: "high" | "medium" | "low";
  autoExecute: boolean;
}

export interface AutonomousAgentResult {
  success: boolean;
  agentType: string;
  executionTime: number;
  actions: AgentAction[];
  insights: string[];
  metrics: Record<string, number>;
  nextScheduledRun?: Date;
  summary: string;
}

async function executeWithAI(prompt: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (error) {
    console.error("AI execution error:", error);
    return null;
  }
}

export async function runLeadScraperAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { businessProfile, leads } = context;

  const prompt = `You are an autonomous lead generation agent. Analyze the business context and generate high-quality lead opportunities.

Business Profile:
${businessProfile ? `
- Company: ${businessProfile.businessName}
- Industry: ${businessProfile.industry}
- Target Market: ${businessProfile.targetMarket}
- Ideal Customer: ${businessProfile.idealCustomer}
- Value Proposition: ${businessProfile.valueProposition}
- Competitors: ${businessProfile.competitors?.join(", ") || "Not specified"}
` : "No business profile configured"}

Current Lead Count: ${leads.length}
Recent Lead Sources: ${Array.from(new Set(leads.slice(0, 10).map(l => l.source))).join(", ") || "Various"}

Generate actionable lead generation recommendations:
{
  "newLeadOpportunities": [
    {"platform": "platform", "searchCriteria": "criteria", "estimatedLeads": number, "quality": "high/medium/low"}
  ],
  "suggestedLeads": [
    {"name": "Full Name", "company": "Company", "title": "Title", "email": "email@example.com", "source": "source", "reason": "why good fit"}
  ],
  "marketingChannels": [
    {"channel": "name", "strategy": "approach", "expectedROI": "high/medium/low"}
  ],
  "competitorLeads": [
    {"insight": "what competitors are doing", "opportunity": "how to capitalize"}
  ],
  "insights": ["insight1", "insight2"],
  "summary": "brief summary of findings"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.suggestedLeads) {
    for (const lead of result.suggestedLeads) {
      actions.push({
        type: "create_lead",
        description: `Add lead: ${lead.name} from ${lead.company}`,
        data: lead,
        priority: "medium",
        autoExecute: false,
      });
    }
  }

  if (result?.newLeadOpportunities) {
    for (const opp of result.newLeadOpportunities) {
      actions.push({
        type: "lead_opportunity",
        description: `Search ${opp.platform} with: ${opp.searchCriteria}`,
        data: opp,
        priority: opp.quality === "high" ? "high" : "medium",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "lead_scraper",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      suggestedLeads: result?.suggestedLeads?.length || 0,
      opportunities: result?.newLeadOpportunities?.length || 0,
      channels: result?.marketingChannels?.length || 0,
    },
    nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
    summary: result?.summary || "Lead scraping analysis complete",
  };
}

export async function runEmailOutreachAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { businessProfile, leads } = context;

  const activeLeads = leads.filter(l => l.status !== "closed" && l.status !== "lost");
  const coldLeads = activeLeads.filter(l => {
    if (!l.lastContactedAt) return true;
    const daysSince = (Date.now() - new Date(l.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7;
  });

  const prompt = `You are an autonomous email outreach agent. Analyze leads and create personalized outreach strategies.

Business Context:
${businessProfile ? `
- Company: ${businessProfile.businessName}
- Value Proposition: ${businessProfile.valueProposition}
- Target Market: ${businessProfile.targetMarket}
` : "No profile"}

Leads Needing Outreach (${coldLeads.length} total, showing first 10):
${coldLeads.slice(0, 10).map(l => `- ${l.name} (${l.company || "Unknown"}) - ${l.title || "Unknown"} - Status: ${l.status} - Score: ${l.score}`).join("\n")}

Generate personalized outreach plan:
{
  "emailCampaigns": [
    {
      "leadId": number,
      "leadName": "name",
      "subject": "personalized subject",
      "emailPreview": "first 100 chars",
      "sendTime": "optimal time",
      "followUpDays": number,
      "personalizationNotes": "why this approach"
    }
  ],
  "sequences": [
    {"name": "sequence name", "steps": number, "targetAudience": "who", "expectedOpenRate": number}
  ],
  "abTests": [
    {"hypothesis": "what to test", "variants": ["a", "b"], "metric": "what to measure"}
  ],
  "insights": ["insight1"],
  "summary": "outreach strategy summary"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.emailCampaigns) {
    for (const campaign of result.emailCampaigns) {
      actions.push({
        type: "send_email",
        description: `Send email to ${campaign.leadName}: ${campaign.subject}`,
        data: campaign,
        priority: "high",
        autoExecute: false,
      });
    }
  }

  if (result?.sequences) {
    for (const seq of result.sequences) {
      actions.push({
        type: "create_sequence",
        description: `Create sequence: ${seq.name} (${seq.steps} steps)`,
        data: seq,
        priority: "medium",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "email_outreach",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      emailsReady: result?.emailCampaigns?.length || 0,
      sequencesPlanned: result?.sequences?.length || 0,
      leadsToContact: coldLeads.length,
    },
    nextScheduledRun: new Date(Date.now() + 4 * 60 * 60 * 1000),
    summary: result?.summary || "Email outreach analysis complete",
  };
}

export async function runMarketAnalysisAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { businessProfile, opportunities, clients } = context;

  const totalPipeline = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
  const avgDealSize = opportunities.length > 0 ? totalPipeline / opportunities.length : 0;

  const prompt = `You are a market analysis agent. Provide strategic market intelligence.

Business Context:
${businessProfile ? `
- Industry: ${businessProfile.industry}
- Company: ${businessProfile.businessName}
- Target Market: ${businessProfile.targetMarket}
- Competitors: ${businessProfile.competitors?.join(", ") || "Not specified"}
` : "No profile"}

Current Metrics:
- Total Pipeline: $${totalPipeline.toLocaleString()}
- Average Deal: $${Math.round(avgDealSize).toLocaleString()}
- Active Opportunities: ${opportunities.length}
- Total Clients: ${clients.length}

Generate market intelligence:
{
  "marketTrends": [
    {"trend": "name", "impact": "description", "opportunity": "how to capitalize", "urgency": "high/medium/low"}
  ],
  "competitorInsights": [
    {"competitor": "name", "activity": "what they're doing", "threat": "high/medium/low", "response": "suggested action"}
  ],
  "pricingIntelligence": {
    "marketPosition": "premium/competitive/value",
    "recommendedAdjustments": ["adjustment1"],
    "competitorPricing": ["insight1"]
  },
  "growthOpportunities": [
    {"opportunity": "name", "description": "details", "potentialRevenue": "estimate", "effort": "high/medium/low"}
  ],
  "riskFactors": [
    {"risk": "description", "probability": "high/medium/low", "mitigation": "strategy"}
  ],
  "insights": ["insight1"],
  "summary": "market analysis summary"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.growthOpportunities) {
    for (const opp of result.growthOpportunities) {
      actions.push({
        type: "growth_opportunity",
        description: opp.opportunity,
        data: opp,
        priority: opp.effort === "low" ? "high" : "medium",
        autoExecute: false,
      });
    }
  }

  if (result?.competitorInsights) {
    for (const insight of result.competitorInsights.filter((i: any) => i.threat === "high")) {
      actions.push({
        type: "competitor_alert",
        description: `High threat: ${insight.competitor} - ${insight.activity}`,
        data: insight,
        priority: "high",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "market_analysis",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      trendsIdentified: result?.marketTrends?.length || 0,
      competitorMoves: result?.competitorInsights?.length || 0,
      opportunities: result?.growthOpportunities?.length || 0,
      risks: result?.riskFactors?.length || 0,
    },
    nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
    summary: result?.summary || "Market analysis complete",
  };
}

export async function runSalesOptimizerAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { leads, opportunities, clients } = context;

  const stageDistribution: Record<string, number> = {};
  opportunities.forEach(o => {
    stageDistribution[o.stage || "unknown"] = (stageDistribution[o.stage || "unknown"] || 0) + 1;
  });

  const conversionRate = opportunities.length > 0 
    ? (opportunities.filter(o => o.stage === "closed-won").length / opportunities.length) * 100 
    : 0;

  const prompt = `You are a sales optimization agent. Analyze the sales pipeline and provide optimization recommendations.

Pipeline Analysis:
- Total Leads: ${leads.length}
- Total Opportunities: ${opportunities.length}
- Total Clients: ${clients.length}
- Conversion Rate: ${conversionRate.toFixed(1)}%
- Stage Distribution: ${JSON.stringify(stageDistribution)}

Lead Quality:
- High Score (70+): ${leads.filter(l => (l.score || 0) >= 70).length}
- Medium Score (40-69): ${leads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 70).length}
- Low Score (<40): ${leads.filter(l => (l.score || 0) < 40).length}

Generate optimization recommendations:
{
  "pipelineHealth": {
    "overallScore": number,
    "bottlenecks": [{"stage": "name", "issue": "problem", "solution": "fix", "impact": "expected improvement"}],
    "velocity": "fast/normal/slow"
  },
  "prioritizedActions": [
    {"action": "what to do", "impact": "high/medium/low", "effort": "high/medium/low", "timeline": "immediate/this week/this month"}
  ],
  "leadRecommendations": [
    {"leadId": number, "recommendation": "what to do", "reason": "why", "priority": "high/medium/low"}
  ],
  "dealAcceleration": [
    {"opportunity": "name", "currentStage": "stage", "blocker": "issue", "accelerator": "action"}
  ],
  "forecastAdjustments": {
    "confidence": number,
    "adjustedForecast": number,
    "factors": ["factor1"]
  },
  "insights": ["insight1"],
  "summary": "optimization summary"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.prioritizedActions) {
    for (const action of result.prioritizedActions) {
      actions.push({
        type: "optimization_action",
        description: action.action,
        data: action,
        priority: action.impact === "high" ? "high" : "medium",
        autoExecute: false,
      });
    }
  }

  if (result?.pipelineHealth?.bottlenecks) {
    for (const bottleneck of result.pipelineHealth.bottlenecks) {
      actions.push({
        type: "fix_bottleneck",
        description: `Fix ${bottleneck.stage}: ${bottleneck.solution}`,
        data: bottleneck,
        priority: "high",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "sales_optimizer",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      pipelineScore: result?.pipelineHealth?.overallScore || 0,
      bottlenecks: result?.pipelineHealth?.bottlenecks?.length || 0,
      prioritizedActions: result?.prioritizedActions?.length || 0,
      forecastConfidence: result?.forecastAdjustments?.confidence || 0,
    },
    nextScheduledRun: new Date(Date.now() + 12 * 60 * 60 * 1000),
    summary: result?.summary || "Sales optimization complete",
  };
}

export async function runCustomerInsightsAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { clients, opportunities } = context;

  const clientHealthDistribution = {
    healthy: clients.filter(c => (c.healthScore || 0) >= 70).length,
    atRisk: clients.filter(c => (c.healthScore || 0) >= 40 && (c.healthScore || 0) < 70).length,
    critical: clients.filter(c => (c.healthScore || 0) < 40).length,
  };

  const totalLTV = clients.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0);

  const prompt = `You are a customer insights agent. Analyze customer data and provide actionable insights.

Customer Portfolio:
- Total Clients: ${clients.length}
- Healthy (70+): ${clientHealthDistribution.healthy}
- At Risk (40-69): ${clientHealthDistribution.atRisk}
- Critical (<40): ${clientHealthDistribution.critical}
- Total LTV: $${totalLTV.toLocaleString()}

Top Clients by LTV:
${clients.sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0)).slice(0, 5).map(c => 
  `- ${c.name} (${c.company}): $${(c.lifetimeValue || 0).toLocaleString()} - Health: ${c.healthScore || 0}%`
).join("\n")}

Generate customer intelligence:
{
  "churnPredictions": [
    {"clientName": "name", "riskScore": number, "indicators": ["indicator1"], "preventionStrategy": "action"}
  ],
  "upsellOpportunities": [
    {"clientName": "name", "opportunity": "what", "estimatedValue": number, "approach": "how"}
  ],
  "customerSegments": [
    {"segment": "name", "count": number, "characteristics": "traits", "strategy": "engagement approach"}
  ],
  "satisfactionDrivers": [
    {"driver": "what matters", "importance": "high/medium/low", "currentScore": number, "improvement": "action"}
  ],
  "retentionActions": [
    {"action": "what to do", "targetClients": number, "expectedImpact": "description"}
  ],
  "insights": ["insight1"],
  "summary": "customer insights summary"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.churnPredictions) {
    for (const prediction of result.churnPredictions.filter((p: any) => p.riskScore > 70)) {
      actions.push({
        type: "churn_prevention",
        description: `Prevent churn: ${prediction.clientName}`,
        data: prediction,
        priority: "high",
        autoExecute: false,
      });
    }
  }

  if (result?.upsellOpportunities) {
    for (const upsell of result.upsellOpportunities) {
      actions.push({
        type: "upsell_opportunity",
        description: `Upsell to ${upsell.clientName}: ${upsell.opportunity}`,
        data: upsell,
        priority: upsell.estimatedValue > 10000 ? "high" : "medium",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "customer_insights",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      churnRisks: result?.churnPredictions?.length || 0,
      upsellOpportunities: result?.upsellOpportunities?.length || 0,
      segments: result?.customerSegments?.length || 0,
    },
    nextScheduledRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
    summary: result?.summary || "Customer insights analysis complete",
  };
}

export async function runCompetitorMonitorAgent(context: AgentContext): Promise<AutonomousAgentResult> {
  const startTime = Date.now();
  const { businessProfile } = context;

  const prompt = `You are a competitive intelligence agent. Monitor and analyze competitor activities.

Our Business:
${businessProfile ? `
- Company: ${businessProfile.businessName}
- Industry: ${businessProfile.industry}
- Competitors: ${businessProfile.competitors?.join(", ") || "Not specified"}
` : "No profile"}

Generate competitive intelligence:
{
  "competitorUpdates": [
    {"competitor": "name", "category": "pricing/product/marketing/hiring", "update": "what happened", "date": "when", "impact": "how it affects us", "threatLevel": "high/medium/low"}
  ],
  "marketPositioning": [
    {"competitor": "name", "positioning": "how they position", "ourAdvantage": "how we're different", "ourWeakness": "where they're better"}
  ],
  "pricingChanges": [
    {"competitor": "name", "change": "what changed", "ourResponse": "recommended action"}
  ],
  "newFeatures": [
    {"competitor": "name", "feature": "what they launched", "impact": "on our customers", "recommendation": "what we should do"}
  ],
  "strategicAlerts": [
    {"alert": "what to watch", "urgency": "high/medium/low", "action": "recommended response"}
  ],
  "insights": ["insight1"],
  "summary": "competitive landscape summary"
}`;

  const result = await executeWithAI(prompt);
  
  const actions: AgentAction[] = [];
  
  if (result?.strategicAlerts) {
    for (const alert of result.strategicAlerts.filter((a: any) => a.urgency === "high")) {
      actions.push({
        type: "strategic_alert",
        description: alert.alert,
        data: alert,
        priority: "high",
        autoExecute: false,
      });
    }
  }

  if (result?.pricingChanges) {
    for (const change of result.pricingChanges) {
      actions.push({
        type: "pricing_response",
        description: `Respond to ${change.competitor} pricing: ${change.ourResponse}`,
        data: change,
        priority: "medium",
        autoExecute: false,
      });
    }
  }

  return {
    success: true,
    agentType: "competitor_monitor",
    executionTime: Date.now() - startTime,
    actions,
    insights: result?.insights || [],
    metrics: {
      updates: result?.competitorUpdates?.length || 0,
      pricingChanges: result?.pricingChanges?.length || 0,
      newFeatures: result?.newFeatures?.length || 0,
      alerts: result?.strategicAlerts?.length || 0,
    },
    nextScheduledRun: new Date(Date.now() + 12 * 60 * 60 * 1000),
    summary: result?.summary || "Competitor monitoring complete",
  };
}

export async function executeAutonomousAgent(
  task: AgenticTask,
  context: AgentContext
): Promise<AutonomousAgentResult> {
  const agentMap: Record<string, (ctx: AgentContext) => Promise<AutonomousAgentResult>> = {
    "lead_scraper": runLeadScraperAgent,
    "lead-scraper": runLeadScraperAgent,
    "email_outreach": runEmailOutreachAgent,
    "email-outreach": runEmailOutreachAgent,
    "market_analysis": runMarketAnalysisAgent,
    "market-analysis": runMarketAnalysisAgent,
    "sales_optimizer": runSalesOptimizerAgent,
    "sales-optimizer": runSalesOptimizerAgent,
    "customer_insights": runCustomerInsightsAgent,
    "customer-insights": runCustomerInsightsAgent,
    "competitor_monitor": runCompetitorMonitorAgent,
    "competitor-monitor": runCompetitorMonitorAgent,
  };

  const agentFn = agentMap[task.type];
  if (!agentFn) {
    return {
      success: false,
      agentType: task.type,
      executionTime: 0,
      actions: [],
      insights: ["Unknown agent type"],
      metrics: {},
      summary: `Agent type "${task.type}" not found`,
    };
  }

  return agentFn(context);
}
