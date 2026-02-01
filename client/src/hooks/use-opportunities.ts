import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertOpportunity, Opportunity } from "@shared/schema";

export function useOpportunities() {
  return useQuery({
    queryKey: [api.opportunities.list.path],
    queryFn: async () => {
      const res = await fetch(api.opportunities.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      return api.opportunities.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertOpportunity) => {
      // Coerce numeric types if needed, though Zod handles this if configured or forms submit numbers
      const validated = api.opportunities.create.input.parse(data);
      const res = await fetch(api.opportunities.create.path, {
        method: api.opportunities.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create opportunity");
      return api.opportunities.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.opportunities.list.path] }),
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertOpportunity>) => {
      const validated = api.opportunities.update.input.parse(data);
      const url = buildUrl(api.opportunities.update.path, { id });
      const res = await fetch(url, {
        method: api.opportunities.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update opportunity");
      return api.opportunities.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.opportunities.list.path] }),
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.opportunities.delete.path, { id });
      const res = await fetch(url, {
        method: api.opportunities.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete opportunity");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.opportunities.list.path] }),
  });
}
