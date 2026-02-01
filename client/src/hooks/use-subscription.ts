import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useSubscription() {
  return useQuery({
    queryKey: [api.subscriptions.get.path],
    queryFn: async () => {
      const res = await fetch(api.subscriptions.get.path, { credentials: "include" });
      if (res.status === 404) return null; // No sub yet
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return api.subscriptions.get.responses[200].parse(await res.json());
    },
  });
}
