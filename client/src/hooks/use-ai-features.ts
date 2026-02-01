import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface LeadScoreResult {
  score: number;
  factors: { name: string; impact: number; description: string }[];
  recommendation: string;
  riskLevel: "low" | "medium" | "high";
}

interface PersonalizedContent {
  subject: string;
  emailBody: string;
  talkingPoints: string[];
  proposalSummary: string;
}

interface AgentExecutionResult {
  success: boolean;
  data: any;
  summary: string;
  nextActions: string[];
}

interface StaleLead {
  leadId: number;
  daysSinceActivity: number;
  riskLevel: string;
  recommendation: string;
}

async function scoreLead(leadId: number): Promise<LeadScoreResult> {
  const res = await fetch(`/api/leads/${leadId}/score`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to score lead");
  return res.json();
}

async function generateContent(leadId: number, contentType: string): Promise<PersonalizedContent> {
  const res = await fetch(`/api/leads/${leadId}/generate-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ contentType }),
  });
  if (!res.ok) throw new Error("Failed to generate content");
  return res.json();
}

async function executeAgent(taskId: number): Promise<AgentExecutionResult> {
  const res = await fetch(`/api/agentic-tasks/${taskId}/execute`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to execute agent");
  return res.json();
}

async function fetchStaleLeads(days: number = 14): Promise<StaleLead[]> {
  const res = await fetch(`/api/leads/stale?days=${days}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch stale leads");
  return res.json();
}

async function scoreAllLeads(): Promise<{ scored: number; results: LeadScoreResult[] }> {
  const res = await fetch("/api/leads/score-all", {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to score leads");
  return res.json();
}

async function analyzeConversation(notes: string, context: string) {
  const res = await fetch("/api/analyze-conversation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ notes, context }),
  });
  if (!res.ok) throw new Error("Failed to analyze");
  return res.json();
}

export function useScoreLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scoreLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}

export function useGenerateContent() {
  return useMutation({
    mutationFn: ({ leadId, contentType }: { leadId: number; contentType: string }) =>
      generateContent(leadId, contentType),
  });
}

export function useExecuteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: executeAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agentic-tasks"] });
    },
  });
}

export function useStaleLeads(days: number = 14) {
  return useQuery({
    queryKey: ["staleLeads", days],
    queryFn: () => fetchStaleLeads(days),
  });
}

export function useScoreAllLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scoreAllLeads,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}

export function useAnalyzeConversation() {
  return useMutation({
    mutationFn: ({ notes, context }: { notes: string; context: string }) =>
      analyzeConversation(notes, context),
  });
}
