import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { LeadActivity, InsertLeadActivity } from "@shared/schema";

async function fetchLeadActivities(leadId: number): Promise<LeadActivity[]> {
  const res = await fetch(`/api/leads/${leadId}/activities`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch activities");
  return res.json();
}

async function createLeadActivity(leadId: number, activity: Omit<InsertLeadActivity, "leadId" | "userId">): Promise<LeadActivity> {
  const res = await fetch(`/api/leads/${leadId}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(activity),
  });
  if (!res.ok) throw new Error("Failed to create activity");
  return res.json();
}

export function useLeadActivities(leadId: number | undefined) {
  return useQuery({
    queryKey: ["leadActivities", leadId],
    queryFn: () => fetchLeadActivities(leadId!),
    enabled: !!leadId,
  });
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, activity }: { leadId: number; activity: Omit<InsertLeadActivity, "leadId" | "userId"> }) =>
      createLeadActivity(leadId, activity),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leadActivities", variables.leadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}
