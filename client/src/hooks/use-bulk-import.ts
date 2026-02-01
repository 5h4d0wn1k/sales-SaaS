import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ImportResult {
  message: string;
  success: number;
  failed: number;
  errors: string[];
}

interface LeadImportData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  source?: string;
  status?: string;
  notes?: string;
  tags?: string[];
}

export function useBulkImportLeads() {
  return useMutation<ImportResult, Error, LeadImportData[]>({
    mutationFn: async (leads) => {
      const response = await apiRequest("POST", "/api/leads/bulk-import", { leads });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });
}

export function parseCSV(csvText: string): LeadImportData[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
  const leads: LeadImportData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/['"]/g, ""));
    const lead: any = {};

    headers.forEach((header, index) => {
      const value = values[index] || "";
      if (header === "name" || header === "full name" || header === "fullname") {
        lead.name = value;
      } else if (header === "email" || header === "email address") {
        lead.email = value;
      } else if (header === "phone" || header === "phone number" || header === "mobile") {
        lead.phone = value;
      } else if (header === "company" || header === "organization" || header === "org") {
        lead.company = value;
      } else if (header === "title" || header === "job title" || header === "position") {
        lead.title = value;
      } else if (header === "source") {
        lead.source = value;
      } else if (header === "status") {
        lead.status = value;
      } else if (header === "notes" || header === "note") {
        lead.notes = value;
      }
    });

    if (lead.name && lead.email) {
      leads.push(lead);
    }
  }

  return leads;
}
