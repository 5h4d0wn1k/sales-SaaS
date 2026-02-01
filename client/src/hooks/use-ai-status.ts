import { useQuery } from "@tanstack/react-query";

interface AIStatus {
  configured: boolean;
  features: {
    leadScoring: boolean;
    contentGeneration: boolean;
    conversationIntelligence: boolean;
    autonomousAgents: boolean;
    multiChannelOrchestration: boolean;
  };
  message: string;
}

export function useAIStatus() {
  return useQuery<AIStatus>({
    queryKey: ["/api/ai-status"],
    staleTime: 1000 * 60 * 5,
  });
}
