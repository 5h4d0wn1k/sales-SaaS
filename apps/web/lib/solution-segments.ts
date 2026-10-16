import type { PublicSiteRoute } from "./seo";
import type { ContactBudgetRange } from "./roi-contact-context";

type SegmentWorkflowStep = {
  label: string;
  description: string;
  status: "Ready" | "Review" | "Guarded" | "Expansion";
};

type SegmentCommercialPath = {
  label: string;
  description: string;
};

type SegmentContactDefaults = {
  budgetRange: ContactBudgetRange;
  channels: string[];
  goals: string[];
};

export type SolutionSegmentPage = {
  slug: string;
  segmentLabel: string;
  cardTitle: string;
  title: string;
  description: string;
  intent: string;
  current: string;
  expansion: string;
  priority: number;
  keywords: string[];
  fitSignals: string[];
  guardrails: string[];
  workflow: SegmentWorkflowStep[];
  commercialPath: SegmentCommercialPath[];
  contactDefaults: SegmentContactDefaults;
  contactHref: string;
  startHref: string;
  faq: Array<{
    question: string;
    answer: string;
  }>;
};

export type SolutionSegmentSearchParams = Record<string, string | string[] | undefined> & {
  utm_source?: string | string[];
  utm_campaign?: string | string[];
  solutionSegment?: string | string[];
  segment?: string | string[];
};

export type SolutionSegmentContactContext = {
  page: SolutionSegmentPage;
  slug: string;
  segmentLabel: string;
  campaign: string;
};

export const solutionSegmentUtmSource = "solution_segment";

export const solutionSegmentPages: readonly SolutionSegmentPage[] = [
  {
    slug: "founders-validating-outbound",
    segmentLabel: "Founders",
    cardTitle: "Founders validating outbound",
    title: "AI sales workspace for founders validating outbound",
    description:
      "A reviewable sales workspace for founders who need to turn ICP, offer, lead-source ideas, outreach drafts, and meeting follow-through into a safer first outbound motion.",
    intent:
      "Turn a rough ICP, offer, and goal into a reviewable sales operating workflow before hiring more tools or contractors.",
    current:
      "Business context capture, Sales Blueprint readiness, source planning, draft campaigns, guarded dispatch, and meeting outcome tracking.",
    expansion:
      "Add configured providers, higher plan limits, and managed rollout support once the founder has proof that the motion is worth scaling.",
    priority: 0.81,
    keywords: [
      "AI sales software for founders",
      "founder outbound sales workspace",
      "startup lead generation software",
      "approval-gated outbound",
    ],
    fitSignals: [
      "You know the offer but need a structured ICP and source plan.",
      "You want to test outbound without handing an agent unchecked send access.",
      "You need meetings, outcomes, and actual contract value visible in one workspace.",
      "You want a path from free workspace to managed implementation without losing review control.",
    ],
    guardrails: [
      "Every-source scraping and browser automation are not claimed.",
      "Campaign creation, approval, and dispatch stay behind role, email, plan, suppression, and provider checks.",
      "Forecasts and ROI models are planning guidance, not closed-revenue promises.",
      "Telegram commands expose safe status, sequence, and forecast visibility without approving outreach.",
    ],
    workflow: [
      {
        label: "Context",
        description:
          "Capture offer, audience, regions, source channels, outreach channels, targets, and disqualifiers in the Sales Blueprint.",
        status: "Ready",
      },
      {
        label: "Lead plan",
        description:
          "Review source readiness, evidence expectations, dedupe posture, and missing business context before discovery.",
        status: "Review",
      },
      {
        label: "Outreach",
        description:
          "Draft campaigns, inspect sequence readiness, and require eligible approval before first live dispatch.",
        status: "Guarded",
      },
      {
        label: "Revenue",
        description:
          "Record meetings, outcomes, won/lost state, and actual contract value to decide whether to scale.",
        status: "Ready",
      },
    ],
    commercialPath: [
      {
        label: "Free workspace",
        description:
          "Use the guided setup, Sales Blueprint, ROI model, and guarded planning surfaces to validate the motion.",
      },
      {
        label: "Paid plan",
        description:
          "Upgrade when lead usage, provider budget, channel access, or operator workflow needs exceed the free tier.",
      },
      {
        label: "Managed rollout",
        description:
          "Request implementation support when you want help shaping the first repeatable sales operating rhythm.",
      },
    ],
    contactDefaults: {
      budgetRange: "500_1500",
      channels: ["email", "linkedin review", "website"],
      goals: [
        "Build a Sales Blueprint",
        "Generate qualified leads",
        "Launch approval-gated outreach",
      ],
    },
    contactHref:
      "/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=founders_validating_outbound&solutionSegment=founders-validating-outbound&segment=founder",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=founders_validating_outbound&solutionSegment=founders-validating-outbound&segment=founder",
    faq: [
      {
        question: "Can a founder use salesxgrowth before hiring a sales team?",
        answer:
          "Yes. The current fit is a founder who wants a structured workspace for ICP, source planning, draft outreach, approval gates, and meeting follow-through before scaling spend.",
      },
      {
        question: "Will salesxgrowth automatically scrape every source and book meetings?",
        answer:
          "No. The beta keeps lead planning, source evidence, outreach, and meetings reviewable. Broader provider automation remains gated by configuration, policy, and roadmap maturity.",
      },
      {
        question: "How does this lead to revenue?",
        answer:
          "The page routes founders toward a workspace or managed rollout with context attached; revenue comes from subscription upgrades and high-touch rollout support when the workflow proves useful.",
      },
    ],
  },
  {
    slug: "agencies-running-client-pipeline",
    segmentLabel: "Agencies",
    cardTitle: "Agencies running client pipeline",
    title: "AI sales workspace for agencies running client pipeline",
    description:
      "A governed outbound workspace for agencies that need client-ready source evidence, campaign approvals, usage visibility, and meeting conversion follow-through.",
    intent:
      "Keep client-facing lead work structured, auditable, and easier to explain across multiple pipeline motions.",
    current:
      "Workspace-level lead evidence, approval gates, campaign status, billing state, usage limits, and manual CRM or calendar handoff.",
    expansion:
      "Use plan upgrades, provider budgets, and managed-service packaging to separate software access from higher-touch execution.",
    priority: 0.8,
    keywords: [
      "AI sales software for agencies",
      "agency lead generation platform",
      "client pipeline management software",
      "approval workflow for outbound agency",
    ],
    fitSignals: [
      "You need to explain why leads were accepted, rejected, or blocked.",
      "You run outbound for clients and want approval history before risky sends.",
      "You need usage, plan, and provider readiness visible before client scope expands.",
      "You want managed-service delivery to stay aligned with product guardrails.",
    ],
    guardrails: [
      "Client workspaces still need tenant-safe setup and role-aware access.",
      "Provider readiness is shown as deployment-side requirements, not browser-entered secrets.",
      "Managed services do not bypass suppression, plan, provider, or approval gates.",
      "LinkedIn scraping, auto-connect, auto-DM, and unsupported browser automation are not sold as active capabilities.",
    ],
    workflow: [
      {
        label: "Client brief",
        description:
          "Capture offer, ICP, client constraints, source channels, and campaign boundaries in a reviewable workspace.",
        status: "Ready",
      },
      {
        label: "Evidence",
        description:
          "Inspect source-run quality, rejection reasons, compliance checks, and freshness before client reporting.",
        status: "Review",
      },
      {
        label: "Approval",
        description:
          "Route draft campaigns and risky actions through eligible approval before live provider work.",
        status: "Guarded",
      },
      {
        label: "Handoff",
        description:
          "Export manual CRM and calendar handoffs for client-reviewed next steps without mutating external systems.",
        status: "Ready",
      },
    ],
    commercialPath: [
      {
        label: "Workspace per motion",
        description:
          "Use tenant-aware workspaces to keep client pipeline, approvals, and evidence separated.",
      },
      {
        label: "Plan expansion",
        description:
          "Move clients up when lead usage, provider budget, or channel requirements justify the cost.",
      },
      {
        label: "Service margin",
        description:
          "Attach strategy, review cadence, reporting, and implementation support without promising unsupported autonomy.",
      },
    ],
    contactDefaults: {
      budgetRange: "1500_5000",
      channels: ["email", "linkedin review", "directory"],
      goals: [
        "Generate qualified leads",
        "Launch approval-gated outreach",
        "Add managed rollout support",
      ],
    },
    contactHref:
      "/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=agencies_running_client_pipeline&solutionSegment=agencies-running-client-pipeline&segment=agency",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=agencies_running_client_pipeline&solutionSegment=agencies-running-client-pipeline&segment=agency",
    faq: [
      {
        question: "Can an agency manage multiple clients in salesxgrowth?",
        answer:
          "The platform has workspace and membership foundations. Agency operators should still keep client setup, access, billing, and provider configuration separated and reviewed.",
      },
      {
        question: "Can managed service bypass approval gates?",
        answer:
          "No. High-impact outreach, provider work, and billing-sensitive steps remain governed by the product approval and entitlement model.",
      },
      {
        question: "What makes this useful for client reporting?",
        answer:
          "Source evidence, approval state, meeting outcomes, forecast posture, and usage boundaries are visible in the workflow instead of being hidden across disconnected tools.",
      },
    ],
  },
  {
    slug: "smb-sales-teams-modernizing-ops",
    segmentLabel: "SMB teams",
    cardTitle: "SMB sales teams modernizing ops",
    title: "AI sales workspace for SMB teams modernizing sales operations",
    description:
      "A practical sales operations workspace for SMB teams that want lead planning, outreach review, meeting visibility, forecast guidance, and governed AI command surfaces.",
    intent:
      "Move from scattered spreadsheets into a shared revenue workspace without losing control over outreach or provider behavior.",
    current:
      "Leads, campaigns, calls, meetings, suppression checks, plan usage, forecast guidance, and subscription visibility in one place.",
    expansion:
      "Layer in stronger integrations, AI-worker proposals, and Telegram observability as provider readiness and team ownership mature.",
    priority: 0.79,
    keywords: [
      "AI sales software for small business",
      "SMB sales operations platform",
      "sales workflow automation for SMB",
      "AI outbound workspace",
    ],
    fitSignals: [
      "Sales activity lives across spreadsheets, inboxes, call notes, and calendars.",
      "Managers need a reviewable pipeline without creating a heavy enterprise rollout.",
      "The team wants AI help but still needs owner or admin control for risky actions.",
      "Usage, channel access, provider cost, and forecast posture need to be visible before scaling.",
    ],
    guardrails: [
      "The current beta is not a replacement for legal, compliance, or revenue-recognition advice.",
      "Writable calendar, CRM, accounting, and SMS sync remain roadmap unless separately configured.",
      "AI worker execution is proposal-led and approval-gated, not live external tool execution.",
      "Sales forecasts are deterministic planning views, not autonomous close-rate optimization.",
    ],
    workflow: [
      {
        label: "Unify",
        description:
          "Bring context, leads, campaign state, meetings, and billing posture into a shared operator surface.",
        status: "Ready",
      },
      {
        label: "Review",
        description:
          "Use approvals, suppression checks, recent audit evidence, and source quality signals before action.",
        status: "Guarded",
      },
      {
        label: "Convert",
        description:
          "Track meeting outcomes, manual calendar handoff, manual CRM handoff, and actual contract value capture.",
        status: "Ready",
      },
      {
        label: "Expand",
        description:
          "Use plan growth readiness, provider posture, and AI-worker proposals to decide what to automate next.",
        status: "Expansion",
      },
    ],
    commercialPath: [
      {
        label: "Team adoption",
        description:
          "Start with one shared workspace, visible guardrails, and a narrow sales motion the team can inspect.",
      },
      {
        label: "Operational scale",
        description:
          "Expand plan, channels, and provider budgets only when usage and outcomes justify the spend.",
      },
      {
        label: "Command layer",
        description:
          "Use Telegram and AI-worker foundations for safer observability and proposals before broader automation.",
      },
    ],
    contactDefaults: {
      budgetRange: "500_1500",
      channels: ["email", "call", "telegram"],
      goals: [
        "Build a Sales Blueprint",
        "Connect Telegram command center",
        "Improve meetings and conversion",
      ],
    },
    contactHref:
      "/contact?intent=sales_assessment&utm_source=solution_segment&utm_medium=seo&utm_campaign=smb_sales_teams_modernizing_ops&solutionSegment=smb-sales-teams-modernizing-ops&segment=smb",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=smb_sales_teams_modernizing_ops&solutionSegment=smb-sales-teams-modernizing-ops&segment=smb",
    faq: [
      {
        question: "Is this a CRM replacement for SMB teams?",
        answer:
          "Not entirely. salesxgrowth is currently strongest as an outbound and revenue execution workspace around planning, approvals, meetings, usage, and handoff visibility.",
      },
      {
        question: "Can the team control salesxgrowth from Telegram?",
        answer:
          "Telegram currently supports guarded status, brief, sequence, forecast, approvals, provider, suppression, and pause-proposal flows. It does not approve outreach or mutate campaigns directly.",
      },
      {
        question: "How should an SMB team start?",
        answer:
          "Start by creating a Sales Blueprint, reviewing source and outreach readiness, and using plan growth guidance before increasing provider spend or automation scope.",
      },
    ],
  },
  {
    slug: "local-service-businesses-booking-jobs",
    segmentLabel: "Local services",
    cardTitle: "Local service businesses booking jobs",
    title: "AI sales workspace for local service businesses booking more jobs",
    description:
      "A review-first sales workspace for local service businesses that need cleaner inquiry capture, lead qualification, follow-up planning, appointment visibility, and owner-controlled outreach.",
    intent:
      "Turn local demand, referrals, directories, website inquiries, and repeat-customer follow-up into a governed sales workflow the owner can inspect.",
    current:
      "Business context capture, local source planning, lead review, guarded follow-up drafts, meeting or job appointment tracking, and conversion outcome visibility.",
    expansion:
      "Add configured provider channels, higher lead usage, call support, managed setup, and Telegram status checks once the local workflow is proven.",
    priority: 0.78,
    keywords: [
      "AI sales software for local service business",
      "local lead generation software",
      "home service sales automation",
      "appointment booking sales workflow",
    ],
    fitSignals: [
      "The business gets leads from referrals, website forms, directories, ads, or local search but follow-up is inconsistent.",
      "Owners need to see which inquiries are qualified before more spend goes into ads or providers.",
      "The team wants AI help drafting follow-up without auto-sending messages to every prospect.",
      "Appointments, estimates, no-shows, and won/lost outcomes need a clearer operating loop.",
    ],
    guardrails: [
      "No claim is made that salesxgrowth scrapes every local directory or bypasses provider rules.",
      "SMS, calling, and email execution still depend on configured providers, consent posture, and plan/channel eligibility.",
      "Local compliance, licensing, pricing, and service-area decisions remain customer-owned.",
      "Telegram can expose safe status and proposal flows; it does not mutate outreach or billing directly.",
    ],
    workflow: [
      {
        label: "Service area",
        description:
          "Capture business type, locations, ideal jobs, disqualifiers, pricing posture, and service-area boundaries.",
        status: "Ready",
      },
      {
        label: "Lead review",
        description:
          "Review website, directory, referral, and campaign lead evidence before assigning follow-up priority.",
        status: "Review",
      },
      {
        label: "Follow-up",
        description:
          "Draft email, call, or SMS follow-up plans behind provider readiness, approval, and suppression checks.",
        status: "Guarded",
      },
      {
        label: "Booked work",
        description:
          "Track appointment state, estimate outcome, won/lost value, and gaps before scaling local demand spend.",
        status: "Ready",
      },
    ],
    commercialPath: [
      {
        label: "Owner setup",
        description:
          "Start with a Sales Blueprint for service area, ideal job type, source mix, and follow-up rules.",
      },
      {
        label: "Channel expansion",
        description:
          "Upgrade when lead volume, calls, email, SMS, or provider budgets justify the extra operating cost.",
      },
      {
        label: "Managed launch",
        description:
          "Use managed setup when the owner wants help turning local demand into a repeatable review cadence.",
      },
    ],
    contactDefaults: {
      budgetRange: "500_1500",
      channels: ["email", "call", "website", "directory"],
      goals: [
        "Generate qualified leads",
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
      ],
    },
    contactHref:
      "/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=local_service_businesses_booking_jobs&solutionSegment=local-service-businesses-booking-jobs&segment=local_services",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=local_service_businesses_booking_jobs&solutionSegment=local-service-businesses-booking-jobs&segment=local_services",
    faq: [
      {
        question: "Can a local service business use salesxgrowth without a sales team?",
        answer:
          "Yes. The current fit is an owner or operator who wants a reviewable workflow for local inquiries, follow-up planning, appointment visibility, and conversion outcomes.",
      },
      {
        question: "Does salesxgrowth automatically message every local lead?",
        answer:
          "No. Follow-up is approval-gated and provider-aware. The product helps plan and review outreach before live sending is allowed.",
      },
      {
        question: "How does this help booked jobs?",
        answer:
          "It gives the business a clearer path from inquiry context to qualified lead, follow-up plan, appointment state, and won/lost value so spend can scale with evidence.",
      },
    ],
  },
  {
    slug: "b2b-saas-teams-scaling-pipeline",
    segmentLabel: "B2B SaaS",
    cardTitle: "B2B SaaS teams scaling pipeline",
    title: "AI sales workspace for B2B SaaS teams scaling pipeline",
    description:
      "A governed outbound workspace for B2B SaaS teams that need ICP clarity, account source planning, approval-gated sequences, meeting handoff, and revenue feedback loops.",
    intent:
      "Move from ad hoc prospecting into a repeatable pipeline operating rhythm with source evidence, outreach review, and conversion visibility.",
    current:
      "Sales Blueprint readiness, source-run evidence, sequence planning, approval-gated dispatch, meetings, manual CRM handoff, and revenue outcome capture.",
    expansion:
      "Scale with higher plan limits, configured email/call providers, managed rollout support, and AI-worker proposals once conversion evidence supports it.",
    priority: 0.8,
    keywords: [
      "AI sales software for B2B SaaS",
      "B2B SaaS outbound sales platform",
      "SaaS lead generation workflow",
      "approval gated sales sequences",
    ],
    fitSignals: [
      "The team needs tighter ICP, account criteria, and disqualification rules before scaling outbound.",
      "Sales leaders want source evidence and sequence readiness visible before approving campaigns.",
      "Meetings, won/lost state, and actual contract value need to feed back into planning.",
      "The team wants AI assistance but cannot allow unchecked sending, provider spend, or CRM mutations.",
    ],
    guardrails: [
      "salesxgrowth does not promise booked meetings, pipeline, or revenue from AI-generated activity.",
      "CRM, calendar, and provider mutations remain bounded by configured integrations and approval gates.",
      "Forecast and ROI views are planning aids, not autonomous revenue optimization.",
      "Unsupported browser automation and social-platform auto-DM workflows are not sold as active capabilities.",
    ],
    workflow: [
      {
        label: "ICP",
        description:
          "Capture segment, firmographic filters, pain points, ACV, source channels, and disqualifiers.",
        status: "Ready",
      },
      {
        label: "Accounts",
        description:
          "Review source evidence, duplicates, freshness, quality posture, and account fit before sequence work.",
        status: "Review",
      },
      {
        label: "Sequences",
        description:
          "Draft outreach plans with approval, suppression, provider, role, and plan checks before dispatch.",
        status: "Guarded",
      },
      {
        label: "Revenue loop",
        description:
          "Record meetings, handoff state, won/lost reasons, and contract value to guide expansion decisions.",
        status: "Ready",
      },
    ],
    commercialPath: [
      {
        label: "Free validation",
        description:
          "Use the Sales Blueprint, ROI model, and review surfaces to validate the outbound motion first.",
      },
      {
        label: "Paid scale",
        description:
          "Upgrade when lead volume, provider budget, seats, or calls exceed the free workflow.",
      },
      {
        label: "Managed RevOps",
        description:
          "Attach managed rollout support when the team needs help aligning source quality, approvals, and conversion review.",
      },
    ],
    contactDefaults: {
      budgetRange: "1500_5000",
      channels: ["email", "call", "linkedin review"],
      goals: [
        "Build a Sales Blueprint",
        "Generate qualified leads",
        "Launch approval-gated outreach",
      ],
    },
    contactHref:
      "/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=b2b_saas_teams_scaling_pipeline&solutionSegment=b2b-saas-teams-scaling-pipeline&segment=b2b_saas",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=b2b_saas_teams_scaling_pipeline&solutionSegment=b2b-saas-teams-scaling-pipeline&segment=b2b_saas",
    faq: [
      {
        question: "Can a B2B SaaS team use salesxgrowth before connecting every sales tool?",
        answer:
          "Yes. The current value is a reviewable workspace for ICP, account source planning, sequences, meetings, and outcomes before deeper integrations are configured.",
      },
      {
        question: "Does salesxgrowth replace a CRM for SaaS sales?",
        answer:
          "No. It is strongest as a sales execution and planning layer around outbound, approvals, meetings, and handoff visibility.",
      },
      {
        question: "How should a SaaS team prove the workflow?",
        answer:
          "Start with one ICP, a bounded lead target, explicit source criteria, approval-gated sequences, and meeting outcome tracking before increasing plan limits or provider spend.",
      },
    ],
  },
  {
    slug: "professional-services-selling-retainers",
    segmentLabel: "Professional services",
    cardTitle: "Professional services selling retainers",
    title: "AI sales workspace for professional services teams selling retainers",
    description:
      "A practical sales workspace for consultancies, studios, and service firms that need clearer prospect context, relationship-safe outreach, meeting follow-through, and proposal-ready sales notes.",
    intent:
      "Help expertise-led businesses turn referrals, content, directories, events, and target-account lists into a reviewable sales operating workflow.",
    current:
      "Offer and audience capture, source planning, prospect review, relationship-aware outreach drafts, meetings, conversion notes, and managed rollout paths.",
    expansion:
      "Grow into higher plan limits, configured channels, manual CRM/calendar handoff, Telegram observability, and managed review cadence when the firm scales outbound.",
    priority: 0.77,
    keywords: [
      "AI sales software for professional services",
      "consulting lead generation software",
      "retainer sales pipeline workflow",
      "service business outbound sales",
    ],
    fitSignals: [
      "The firm sells expertise, trust, or retainers where generic mass outreach would damage the brand.",
      "Partners need prospect context, fit, and relationship notes before approving follow-up.",
      "Meetings and proposal outcomes are tracked inconsistently across inboxes, notes, and calendars.",
      "The team wants AI help with structure and draft quality while keeping judgment human-owned.",
    ],
    guardrails: [
      "salesxgrowth does not send relationship-sensitive outreach without approval and provider readiness.",
      "Legal, financial, strategic, or regulated advice remains the responsibility of the professional firm.",
      "The product does not claim to infer buyer intent from private sources or bypass platform rules.",
      "Managed services support setup and review cadence; they do not replace partner-owned sales judgment.",
    ],
    workflow: [
      {
        label: "Offer",
        description:
          "Capture retainer shape, service lines, ideal accounts, disqualifiers, trust constraints, and target outcomes.",
        status: "Ready",
      },
      {
        label: "Prospects",
        description:
          "Review referral, content, directory, event, and target-account source evidence before outreach planning.",
        status: "Review",
      },
      {
        label: "Outreach",
        description:
          "Draft relationship-aware follow-up behind human approval, suppression checks, and channel eligibility.",
        status: "Guarded",
      },
      {
        label: "Proposal",
        description:
          "Track meetings, next steps, proposal status, won/lost reasons, and actual contract value.",
        status: "Ready",
      },
    ],
    commercialPath: [
      {
        label: "Partner-led setup",
        description:
          "Use a Sales Blueprint to align offer, audience, relationship constraints, and source strategy.",
      },
      {
        label: "Review cadence",
        description:
          "Upgrade or request managed help when partners need a weekly lead and outreach review rhythm.",
      },
      {
        label: "Expansion",
        description:
          "Scale channels and usage only when meetings, proposals, and contract value prove the workflow.",
      },
    ],
    contactDefaults: {
      budgetRange: "1500_5000",
      channels: ["email", "linkedin review", "website", "directory"],
      goals: [
        "Build a Sales Blueprint",
        "Launch approval-gated outreach",
        "Improve meetings and conversion",
      ],
    },
    contactHref:
      "/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=professional_services_selling_retainers&solutionSegment=professional-services-selling-retainers&segment=professional_services",
    startHref:
      "/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=professional_services_selling_retainers&solutionSegment=professional-services-selling-retainers&segment=professional_services",
    faq: [
      {
        question: "Is salesxgrowth safe for relationship-led professional services sales?",
        answer:
          "The product is designed around review, context, and approval. It is not positioned as a mass-send tool for relationship-sensitive sales.",
      },
      {
        question: "Can partners approve outreach before anything goes live?",
        answer:
          "Yes. The current posture is approval-gated: high-impact outreach requires eligible review before live provider action.",
      },
      {
        question: "How does this support retainer sales?",
        answer:
          "It keeps offer context, prospect fit, outreach drafts, meetings, proposal state, and contract value in one operating rhythm so the firm can learn which motions deserve more investment.",
      },
    ],
  },
] as const;

export const solutionSegmentRoutes = solutionSegmentPages.map((page) => ({
  path: `/solutions/${page.slug}` as const,
  label: page.title,
  priority: page.priority,
  changeFrequency: "monthly" as const,
})) satisfies readonly PublicSiteRoute[];

export function getSolutionSegmentPage(slug: string) {
  return solutionSegmentPages.find((page) => page.slug === slug) ?? null;
}

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizeSegmentCandidate(value: string | undefined) {
  return value?.trim().toLowerCase().replaceAll("_", "-") || null;
}

function isSegmentCandidate(value: string | null): value is string {
  return Boolean(value);
}

const segmentAliases: Record<string, string> = {
  founder: "founders-validating-outbound",
  founders: "founders-validating-outbound",
  agency: "agencies-running-client-pipeline",
  agencies: "agencies-running-client-pipeline",
  smb: "smb-sales-teams-modernizing-ops",
  "smb-team": "smb-sales-teams-modernizing-ops",
  "smb-teams": "smb-sales-teams-modernizing-ops",
  "local-service": "local-service-businesses-booking-jobs",
  "local-services": "local-service-businesses-booking-jobs",
  "local-service-business": "local-service-businesses-booking-jobs",
  "b2b-saas": "b2b-saas-teams-scaling-pipeline",
  saas: "b2b-saas-teams-scaling-pipeline",
  "professional-services": "professional-services-selling-retainers",
  consulting: "professional-services-selling-retainers",
};

export function parseSolutionSegmentContactContext(
  params: SolutionSegmentSearchParams | undefined,
): SolutionSegmentContactContext | null {
  if (firstParam(params?.utm_source) !== solutionSegmentUtmSource) {
    return null;
  }

  const candidates = [
    normalizeSegmentCandidate(firstParam(params?.solutionSegment)),
    normalizeSegmentCandidate(firstParam(params?.segment)),
    normalizeSegmentCandidate(firstParam(params?.utm_campaign)),
  ].filter(isSegmentCandidate);

  for (const candidate of candidates) {
    const slug = segmentAliases[candidate] ?? candidate;
    const page = getSolutionSegmentPage(slug);

    if (page) {
      return {
        page,
        slug: page.slug,
        segmentLabel: page.segmentLabel,
        campaign: firstParam(params?.utm_campaign)?.trim() || page.slug.replaceAll("-", "_"),
      };
    }
  }

  return null;
}

export function getSolutionSegmentContactDefaults(context: SolutionSegmentContactContext) {
  return {
    budgetRange: context.page.contactDefaults.budgetRange,
    channels: [...context.page.contactDefaults.channels],
    goals: [...context.page.contactDefaults.goals],
  };
}

export function formatSolutionSegmentContactMessage(context: SolutionSegmentContactContext) {
  const primaryGuardrails = context.page.guardrails.slice(0, 2).join(" ");

  return [
    "Solution segment context attached for review:",
    `- Segment: ${context.page.segmentLabel}`,
    `- Page: ${context.page.title}`,
    `- Intent: ${context.page.intent}`,
    `- Current beta fit: ${context.page.current}`,
    `- Growth path: ${context.page.expansion}`,
    `- Guardrails: ${primaryGuardrails}`,
    "",
    "Please review fit, provider readiness, rollout scope, and the safest next step before any lead sourcing or outreach starts.",
  ].join("\n");
}
