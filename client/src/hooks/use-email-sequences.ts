import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EmailSequence, InsertEmailSequence } from "@shared/schema";

async function fetchEmailSequences(): Promise<EmailSequence[]> {
  const res = await fetch("/api/email-sequences", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch sequences");
  return res.json();
}

async function createEmailSequence(sequence: InsertEmailSequence): Promise<EmailSequence> {
  const res = await fetch("/api/email-sequences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(sequence),
  });
  if (!res.ok) throw new Error("Failed to create sequence");
  return res.json();
}

async function updateEmailSequence(id: number, updates: Partial<InsertEmailSequence>): Promise<EmailSequence> {
  const res = await fetch(`/api/email-sequences/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update sequence");
  return res.json();
}

async function deleteEmailSequence(id: number): Promise<void> {
  const res = await fetch(`/api/email-sequences/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete sequence");
}

async function enrollLeadInSequence(sequenceId: number, leadId: number): Promise<void> {
  const res = await fetch(`/api/email-sequences/${sequenceId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ leadId }),
  });
  if (!res.ok) throw new Error("Failed to enroll lead");
}

export function useEmailSequences() {
  return useQuery({
    queryKey: ["emailSequences"],
    queryFn: fetchEmailSequences,
  });
}

export function useCreateEmailSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmailSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences"] });
    },
  });
}

export function useUpdateEmailSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<InsertEmailSequence> }) =>
      updateEmailSequence(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences"] });
    },
  });
}

export function useDeleteEmailSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmailSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences"] });
    },
  });
}

export function useEnrollLeadInSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sequenceId, leadId }: { sequenceId: number; leadId: number }) =>
      enrollLeadInSequence(sequenceId, leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences"] });
    },
  });
}
