import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { InsertAgenticTask, AgenticTask } from "@shared/schema";

export function useAgenticTasks() {
  return useQuery({
    queryKey: [api.agenticTasks.list.path],
    queryFn: async () => {
      const res = await fetch(api.agenticTasks.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agentic tasks");
      return res.json() as Promise<AgenticTask[]>;
    },
  });
}

export function useCreateAgenticTask() {
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

export function useToggleAgenticTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.agenticTasks.toggle.path, { id });
      const res = await fetch(url, {
        method: 'POST',
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle task");
      return res.json() as Promise<AgenticTask>;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.agenticTasks.list.path] }),
  });
}
