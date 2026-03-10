export type PlatformModule = {
  slug: string;
  title: string;
  summary: string;
  phase: string;
  capabilities: string[];
};

export const platformModules: PlatformModule[] = [
  {
    slug: "lead-acquisition",
    title: "Lead Acquisition",
    summary: "Collect and normalize leads from scraping, imports, and future provider adapters.",
    phase: "Phase 1",
    capabilities: ["Lead imports", "Source adapters", "Deduplication", "Quality gating"],
  },
  {
    slug: "lead-workspace",
    title: "Lead Workspace",
    summary: "Run the owned CRM dashboard with lead state, activities, and conversion visibility.",
    phase: "Phase 1",
    capabilities: ["Pipelines", "Activity timeline", "Owner routing", "Conversion state"],
  },
  {
    slug: "outreach",
    title: "AI Outreach",
    summary: "Generate personalized sequences with campaign approvals and policy checks.",
    phase: "Phase 2",
    capabilities: ["Sequence drafts", "Approval-gated sends", "Retry safety", "Audit logs"],
  },
  {
    slug: "voice",
    title: "AI Calling",
    summary: "Support outbound call flows, dispositions, and meeting creation with control guardrails.",
    phase: "Phase 3",
    capabilities: ["Call plans", "Summaries", "Disposition capture", "Human takeover"],
  },
  {
    slug: "revenue",
    title: "Billing and Plans",
    summary: "Enforce subscriptions, quotas, feature flags, and expansion paths from the backend.",
    phase: "Phase 4",
    capabilities: ["Stripe plans", "Usage metering", "Policy gates", "Upgrade prompts"],
  },
];

export const dashboardSnapshot = {
  metrics: [
    { label: "Core product modules defined", value: "5" },
    { label: "High-risk actions covered by policy", value: "100%" },
    { label: "Schema domains bootstrapped", value: "9" },
  ],
  pillars: [
    "Approval-gated autonomy",
    "Postgres portability",
    "Tenant-safe billing",
    "Audit-first workflows",
  ],
};

export const readinessChecklist = [
  {
    label: "Monorepo foundation",
    detail: "Next.js, Hono, shared contracts, and Drizzle package are wired for local development.",
    status: "ready",
  },
  {
    label: "Autonomy policy",
    detail: "First outbound action stays approval-gated before fully autonomous execution continues.",
    status: "ready",
  },
  {
    label: "External providers",
    detail: "Email, telephony, payments, and calendar adapters remain to be integrated.",
    status: "next",
  },
] as const;

