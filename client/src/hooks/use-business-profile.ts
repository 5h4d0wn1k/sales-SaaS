import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BusinessProfile, InsertBusinessProfile } from "@shared/schema";

async function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  const res = await fetch("/api/business-profile", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch business profile");
  return res.json();
}

async function saveBusinessProfile(profile: InsertBusinessProfile): Promise<BusinessProfile> {
  const res = await fetch("/api/business-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save business profile");
  return res.json();
}

export function useBusinessProfile() {
  return useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });
}

export function useSaveBusinessProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBusinessProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessProfile"] });
    },
  });
}
