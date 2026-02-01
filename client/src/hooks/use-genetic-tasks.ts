import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { InsertAgenticTask, AgenticTask } from "@shared/schema";

export function useGeneticTasks() {
  return useQuery({
    queryKey: [api.agenticTasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.agenticTasks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json() as Promise<AgenticTask[]>;
    },
    refetchInterval: 5000,
  });
}

export function useCreateGeneticTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertAgenticTask) => {
      const res = await fetch(api.agenticTasks.create.path, {
        method: api.agenticTasks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json() as Promise<AgenticTask>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.agenticTasks.list.path] }),
  });
}
