import { dashboardResponseSchema, type DashboardResponse } from "@sales/shared";

const fallbackDashboard: DashboardResponse = {
  workspace: {
    organizationName: "Local workspace",
    workspaceName: "Offline mode",
    region: "local",
    primaryChannel: "email",
  },
  metrics: [
    {
      label: "API status",
      value: "offline",
      detail: "Start the API at NEXT_PUBLIC_API_URL to load live dashboard data.",
    },
  ],
  leads: [],
  campaigns: [],
  subscription: {
    planKey: "local",
    status: "trialing",
    seats: 1,
    usageLimit: 0,
    monthlyUsage: 0,
  },
  actionItems: [
    {
      id: "offline",
      title: "Start the API",
      detail: "Run npm run dev:api to replace fallback data with the live demo workspace.",
      urgency: "medium",
    },
  ],
  onboarding: {
    id: "offline",
    status: "draft",
    currentStep: "start",
    transcript: [],
    extractedProfile: null,
    scraperBrief: null,
    outreachBrief: null,
  },
  sourcePlan: null,
  sourceRuns: [],
  activities: [],
  calls: [],
  meetings: [],
};

export async function getDashboardData(): Promise<DashboardResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${baseUrl}/v1/dashboard`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackDashboard;
    }

    return dashboardResponseSchema.parse(await response.json());
  } catch {
    return fallbackDashboard;
  }
}
