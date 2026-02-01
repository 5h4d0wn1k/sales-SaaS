import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertCampaign, Campaign } from "@shared/schema";

export function useCampaigns() {
  return useQuery({
    queryKey: [api.campaigns.list.path],
    queryFn: async () => {
      const res = await fetch(api.campaigns.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json() as Promise<Campaign[]>;
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const res = await fetch(api.campaigns.create.path, {
        method: api.campaigns.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      return res.json() as Promise<Campaign>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.campaigns.list.path] }),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertCampaign>) => {
      const url = buildUrl(api.campaigns.update.path, { id });
      const res = await fetch(url, {
        method: api.campaigns.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      return res.json() as Promise<Campaign>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.campaigns.list.path] }),
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.campaigns.delete.path, { id });
      const res = await fetch(url, {
        method: api.campaigns.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete campaign");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.campaigns.list.path] }),
  });
}
