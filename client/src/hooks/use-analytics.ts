import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

interface DashboardAnalytics {
  totalLeads: number;
  totalClients: number;
  pipelineValue: number;
  activeCampaigns: number;
  activeAgents: number;
  healthyClients: number;
  conversionRate: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: [api.analytics.dashboard.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.dashboard.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json() as Promise<DashboardAnalytics>;
    },
  });
}
