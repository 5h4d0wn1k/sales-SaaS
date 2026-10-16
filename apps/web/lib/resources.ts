export type ResourceArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  funnelStage: "awareness" | "consideration" | "conversion";
  readingTime: string;
  publishedAt: string;
  updatedAt: string;
  priority: number;
  keywords: string[];
  summaryPoints: string[];
  sections: Array<{
    heading: string;
    body: string;
    bullets?: string[];
  }>;
  checklist: string[];
};

export type ResourceContactSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type ResourceContactContext = {
  slug: string;
  title: string;
  category: string;
  funnelStage: ResourceArticle["funnelStage"];
  intent: string;
  intentLabel: string;
  budgetRange: "500_1500" | "1500_5000";
  sourcePath: string;
  goals: string[];
  channels: string[];
};

export const resourceArticleAuthorName = "salesxgrowth Revenue Systems Team";

export const resourceArticles: readonly ResourceArticle[] = [
  {
    slug: "approval-gated-sales-automation",
    title: "Approval-gated sales automation: the safer path to AI-assisted outbound",
    description:
      "A practical guide to using AI in outbound sales while keeping risky actions behind human review, audit trails, suppression checks, and provider readiness.",
    category: "Sales automation governance",
    funnelStage: "consideration",
    readingTime: "7 min read",
    publishedAt: "2026-06-04",
    updatedAt: "2026-06-06",
    priority: 0.78,
    keywords: [
      "approval-gated sales automation",
      "AI sales software",
      "outbound sales workflow",
      "sales automation governance",
    ],
    summaryPoints: [
      "AI can draft, prioritize, and prepare work before humans approve sensitive actions.",
      "First-touch outreach, calls, provider changes, and billing changes need explicit review.",
      "A safer sales workflow separates planning from execution and records who approved what.",
    ],
    sections: [
      {
        heading: "What approval-gated means",
        body:
          "Approval-gated automation means the system can prepare sales work, but it does not silently cross high-impact boundaries. Lead research, campaign drafts, meeting notes, and next-step recommendations can move quickly while sends, calls, provider changes, and risky mutations wait for an eligible operator.",
      },
      {
        heading: "Where the gate belongs",
        body:
          "The most useful gates sit where customer trust, provider reputation, or account state can be affected. A sales team should see the proposed action, the expected effect, the rollback plan, and the supporting evidence before anything leaves the workspace.",
        bullets: [
          "First outbound touch from a new campaign",
          "Voice or call dispatch",
          "New source channels or provider modes",
          "Suppression-sensitive contacts",
          "Billing, team, or integration changes",
        ],
      },
      {
        heading: "How salesxgrowth approaches it",
        body:
          "salesxgrowth's current beta keeps high-risk work reviewable. The product can capture business context, prepare source runs, draft campaigns, expose approval proposals, and track meetings, while live execution remains bounded by role checks, verification, suppression posture, plan limits, and provider readiness.",
      },
    ],
    checklist: [
      "Define the business context before sourcing leads.",
      "Keep accepted and rejected lead evidence visible.",
      "Require owner or admin review before first live outreach.",
      "Record suppression, provider, and entitlement checks before dispatch.",
      "Show the operator what can be reversed and what cannot.",
    ],
  },
  {
    slug: "telegram-sales-command-center",
    title: "Telegram sales command center: operate AI sales without losing approval control",
    description:
      "Design a Telegram sales command center for AI-assisted pipeline updates, sequence checks, forecasts, provider readiness, suppression review, and approval-gated pause requests.",
    category: "Sales command center",
    funnelStage: "consideration",
    readingTime: "7 min read",
    publishedAt: "2026-06-04",
    updatedAt: "2026-06-06",
    priority: 0.74,
    keywords: [
      "Telegram sales command center",
      "AI sales bot",
      "sales automation control plane",
      "Telegram sales automation",
    ],
    summaryPoints: [
      "Telegram is most useful as an operator control surface for status, briefs, forecasts, and blockers.",
      "High-impact actions still need explicit in-app approval before outreach, billing, campaign, or provider state changes.",
      "Safe command centers use allowlists, replay protection, throttling, audit events, and clear mutation boundaries.",
    ],
    sections: [
      {
        heading: "Start with observability",
        body:
          "A practical Telegram sales command center should help operators understand the workspace before it changes anything. The safest first commands summarize pipeline state, pending approvals, provider blockers, meeting follow-up, forecast posture, sequence readiness, and suppression risks.",
      },
      {
        heading: "Separate read-only commands from risky requests",
        body:
          "A chat surface feels fast, but speed should not remove review. Read-only commands can return briefings and readiness checks immediately. Riskier requests should create reviewable proposals that an eligible owner or admin approves inside the product.",
        bullets: [
          "Safe now: status, operator brief, sequence readiness, forecast, provider readiness, and suppression checks",
          "Approval-gated: pause requests that create a pending proposal for in-app review",
          "Blocked today: approving campaigns, changing billing, configuring providers, or mutating outreach from Telegram",
          "Required evidence: command source, workspace binding, policy outcome, reviewer eligibility, and audit event",
        ],
      },
      {
        heading: "Use deterministic aliases before open-ended AI",
        body:
          "Natural-language commands are useful only when the system can map them to known, allowed intents. Before broader AI command parsing, use deterministic aliases that route through the same allowlist, replay protection, rate limits, and audit trail as slash commands.",
      },
      {
        heading: "How salesxgrowth approaches it",
        body:
          "salesxgrowth's current beta supports guarded Telegram command-center foundations: workspace chat binding, verified webhooks, replay protection, per-chat throttling, safe read-only commands such as brief, sequence, and forecast, deterministic aliases, command audit events, and a pause command that creates an Approval Inbox proposal instead of changing outreach state directly.",
      },
    ],
    checklist: [
      "Bind each chat to the right workspace before returning sales data.",
      "Keep read-only summaries separate from approval-gated requests.",
      "Throttle commands per chat and reject replayed webhook events.",
      "Record command intent, policy outcome, and proposal linkage in the audit trail.",
      "Require in-app owner or admin approval before changing outreach state.",
      "Show operators which Telegram commands are safe, approval-gated, or blocked.",
    ],
  },
  {
    slug: "sales-blueprint-for-lead-generation",
    title: "How to build a Sales Blueprint before lead generation",
    description:
      "Use offer, ICP, regions, goals, source channels, buyer pain, and compliance notes to turn lead generation from guesswork into a reviewable operating plan.",
    category: "Lead generation strategy",
    funnelStage: "awareness",
    readingTime: "8 min read",
    publishedAt: "2026-06-04",
    updatedAt: "2026-06-06",
    priority: 0.76,
    keywords: [
      "Sales Blueprint",
      "B2B lead generation strategy",
      "AI lead generation software",
      "ICP planning",
    ],
    summaryPoints: [
      "Lead generation works better when sourcing follows a documented ICP and goal.",
      "A blueprint should include qualification rules, disqualifiers, source channels, and outreach boundaries.",
      "Readiness gaps are useful because they stop weak context from becoming noisy outreach.",
    ],
    sections: [
      {
        heading: "Start with the offer and audience",
        body:
          "A useful lead engine needs more than a company name and an industry. It needs the offer, the pain it solves, the buyer roles, the regions, the disqualifiers, the average contract value, and the goal that makes a lead worth pursuing.",
      },
      {
        heading: "Turn context into qualification rules",
        body:
          "Qualification rules protect the team from chasing every sourced contact. They should describe what a good account must show and what should remove a candidate from the workflow before any campaign is drafted.",
        bullets: [
          "Target region and segment fit",
          "Public business signal or source evidence",
          "Buyer role match",
          "Relevant pain or timing signal",
          "No active suppression or do-not-contact rule",
        ],
      },
      {
        heading: "Use readiness gaps as a safety tool",
        body:
          "If the blueprint is incomplete, the system should say so. Missing website, empty regions, weak search keywords, absent buyer roles, or missing compliance notes are not small details; they shape the quality and risk of every downstream action.",
      },
    ],
    checklist: [
      "Write the ICP in plain language.",
      "List the buyer roles and disqualifiers.",
      "Choose source channels before running discovery.",
      "Document outreach channels and approval requirements.",
      "Review readiness gaps before scaling lead volume.",
    ],
  },
  {
    slug: "ai-lead-generation-channels-source-plan",
    title: "AI lead generation channels: build a source plan before outreach",
    description:
      "Plan website, search, directory, review, CRM, partner, and referral lead sources with evidence, dedupe, suppression, provider readiness, and approval gates before outreach.",
    category: "Lead source strategy",
    funnelStage: "awareness",
    readingTime: "8 min read",
    publishedAt: "2026-06-05",
    updatedAt: "2026-06-06",
    priority: 0.75,
    keywords: [
      "AI lead generation channels",
      "multi-channel lead generation",
      "lead source planning",
      "B2B lead generation software",
    ],
    summaryPoints: [
      "A source plan should rank channels by fit, evidence quality, cost, provider readiness, and outreach risk.",
      "Lead discovery needs accepted and rejected evidence so operators can inspect why a prospect entered the workflow.",
      "Multi-channel growth works better when sourcing, outreach, meetings, and budget controls stay connected.",
    ],
    sections: [
      {
        heading: "Start with source categories, not a giant scrape",
        body:
          "A serious lead engine does not begin by dumping broad contact lists into a campaign. It begins by choosing source categories that match the ICP, region, offer, and sales goal. Website signals, search results, directories, review sites, CRM imports, partner lists, events, and referrals can all be useful, but each source needs a reason to exist in the plan.",
      },
      {
        heading: "Make source evidence visible",
        body:
          "Operators need to know why a lead was accepted, rejected, or held for review. Evidence should include source type, freshness, matching signals, missing fields, dedupe posture, suppression checks, and a next action. Without that evidence, AI lead generation becomes a black box that is hard to improve.",
        bullets: [
          "Source channel and provider mode",
          "Business signal or page evidence",
          "Deduplication and rejection reason",
          "Suppression or do-not-contact posture",
          "Recommended next action for the operator",
        ],
      },
      {
        heading: "Connect channels to budget and approval gates",
        body:
          "Multi-channel lead generation is not just a sourcing problem. Each channel can create different provider costs, consent requirements, brand risk, and follow-up work. A strong source plan maps which channels are available now, which need provider configuration, which require manual review, and which should stay roadmap until policy and consent controls are mature.",
      },
      {
        heading: "How salesxgrowth approaches source planning",
        body:
          "salesxgrowth's current beta captures the Sales Blueprint, generates source-run evidence, tracks quality score and rejection reasons, exposes usage and provider-cost posture, and routes risky outreach through approval gates. The near-term path is deeper provider-specific sourcing and enrichment while preserving operator review before live outreach.",
      },
    ],
    checklist: [
      "Choose source categories from the ICP and offer, not from tool availability alone.",
      "Require evidence for every accepted and rejected lead.",
      "Deduplicate before campaign planning.",
      "Check suppression posture before outreach drafts become live work.",
      "Map each channel to provider readiness, plan limits, and approval requirements.",
      "Review source quality before increasing lead volume or budget.",
    ],
  },
  {
    slug: "ai-sales-crm-vs-outbound-workspace",
    title: "AI sales CRM vs outbound workspace: what teams actually need first",
    description:
      "Compare CRM storage, outbound workflow, approval gates, lead evidence, meeting conversion, and billing visibility for teams adopting AI-assisted sales operations.",
    category: "Revenue operations",
    funnelStage: "conversion",
    readingTime: "6 min read",
    publishedAt: "2026-06-04",
    updatedAt: "2026-06-06",
    priority: 0.72,
    keywords: [
      "AI sales CRM",
      "outbound sales workspace",
      "sales workflow automation",
      "revenue execution platform",
    ],
    summaryPoints: [
      "A CRM records sales state; an outbound workspace helps teams decide and act.",
      "Early teams often need context capture, lead evidence, approvals, meetings, and billing visibility before heavy CRM customization.",
      "The right sequence is to make the motion reviewable, then deepen integrations.",
    ],
    sections: [
      {
        heading: "The CRM is not the whole motion",
        body:
          "A CRM can store accounts, contacts, deals, and activities, but it may not explain why a lead was accepted, which outreach was approved, what provider mode was used, or why a campaign is blocked. Those decisions live in the operating workflow around the CRM.",
      },
      {
        heading: "What an outbound workspace adds",
        body:
          "An outbound workspace connects context, source evidence, campaign review, call posture, meeting outcomes, usage, and plan boundaries. It gives operators a place to inspect the system before increasing automation.",
        bullets: [
          "Business context and Sales Blueprint",
          "Source-run evidence and rejection reasons",
          "Approval inbox for risky actions",
          "Meeting and conversion follow-through",
          "Billing, usage, and provider-cost visibility",
        ],
      },
      {
        heading: "How to sequence the stack",
        body:
          "Start by making the sales motion explicit and reviewable. Once the team understands the source quality, approval patterns, channel economics, and meeting outcomes, deeper CRM sync and provider automation become easier to justify and govern.",
      },
    ],
    checklist: [
      "Capture the business workflow before buying more tools.",
      "Keep lead evidence attached to source decisions.",
      "Use approvals before live outbound actions.",
      "Track meeting outcomes and won/lost state.",
      "Expand CRM and provider integrations after the workflow is understood.",
    ],
  },
  {
    slug: "ai-sdr-software-evaluation-checklist",
    title: "AI SDR software evaluation checklist: what to inspect before scaling outreach",
    description:
      "Evaluate AI SDR software, AI sales agents, and outbound automation platforms with buyer questions around ICP context, lead evidence, approval gates, provider readiness, meetings, Telegram control, and auditability.",
    category: "AI SDR evaluation",
    funnelStage: "conversion",
    readingTime: "9 min read",
    publishedAt: "2026-06-05",
    updatedAt: "2026-06-06",
    priority: 0.77,
    keywords: [
      "AI SDR software",
      "AI sales agent",
      "AI outbound sales automation",
      "sales automation evaluation checklist",
      "AI sales platform",
    ],
    summaryPoints: [
      "The best AI SDR platform for a real team should prove how it uses business context before it creates pipeline work.",
      "Lead sourcing, outreach, calls, meetings, and Telegram control need visible evidence, policy outcomes, and approval boundaries.",
      "Buyers should evaluate auditability, provider readiness, plan limits, and rollback paths before increasing volume or budget.",
    ],
    sections: [
      {
        heading: "Start with the business-context proof",
        body:
          "An AI SDR tool should not begin with a vague prompt and a contact list. Ask how the system captures the offer, ICP, buyer roles, regions, disqualifiers, qualification rules, target meetings, average contract value, voice, and compliance notes before it recommends any lead source or outreach step.",
        bullets: [
          "Can the team inspect and edit the ICP before sourcing?",
          "Does the platform show readiness gaps before a campaign is drafted?",
          "Are source channels connected to goals, regions, and plan limits?",
          "Can owners govern changes to the business profile?",
        ],
      },
      {
        heading: "Demand lead evidence, not just lead volume",
        body:
          "High lead counts are not enough. A production-grade workflow should explain why each prospect was accepted, rejected, deduplicated, or held for review. Evidence should include provider mode, source signal, freshness, rejection reason, suppression posture, and the next safe operator action.",
        bullets: [
          "Accepted and rejected evidence is visible",
          "Deduplication happens before outreach planning",
          "Suppression checks are inspectable before dispatch",
          "Mock, guarded, and configured provider modes are clearly labeled",
        ],
      },
      {
        heading: "Separate planning from live execution",
        body:
          "AI can help draft sequences, rank next actions, summarize meetings, and prepare campaign proposals. Live sends, calls, provider work, billing changes, and broad source expansion should still pass through role checks, verified-email posture, entitlements, provider readiness, and approval review.",
      },
      {
        heading: "Check the command-center boundary",
        body:
          "A useful AI sales command center should make safe read-only answers fast while making risky changes slower and more inspectable. Telegram or chat control should return briefs, forecasts, sequence readiness, provider posture, and suppression checks without directly approving campaigns, changing billing, or mutating outreach state.",
        bullets: [
          "Read-only commands are clearly separate from approval-gated requests",
          "Unsupported scraping, browser automation, auto-connect, and auto-DM requests are blocked",
          "Pause or risk-reducing requests create reviewable proposals",
          "Command events are throttled, replay-protected, and audited",
        ],
      },
      {
        heading: "How salesxgrowth approaches AI SDR evaluation",
        body:
          "salesxgrowth's current beta is built as a governed sales workspace: Sales Blueprint context, source-run evidence, approval-aware outreach, meeting conversion tracking, plan and provider-cost controls, Telegram observability, AI-worker proposals, and audit evidence. Deeper provider integrations and broader live automation remain guarded maturity work, not a claim that every channel can run unattended today.",
      },
    ],
    checklist: [
      "Confirm the product captures business context before lead sourcing.",
      "Inspect source evidence, rejected leads, dedupe posture, and suppression checks.",
      "Verify approval gates before first-touch outreach, calls, provider changes, and billing changes.",
      "Check whether Telegram or chat commands are read-only, approval-gated, or blocked.",
      "Review plan limits, provider-cost budgets, and upgrade guidance before scaling volume.",
      "Ask for audit evidence, rollback paths, and owner/admin review controls.",
      "Avoid platforms that promise unsupported scraping, invisible sends, or certain revenue results.",
    ],
  },
] as const;

export const resourceArticleRoutes = resourceArticles.map((article) => ({
  path: `/resources/${article.slug}` as const,
  label: article.title,
  priority: article.priority,
  changeFrequency: "monthly" as const,
  lastModified: `${article.updatedAt || article.publishedAt}T00:00:00.000Z`,
}));

export function getResourceArticle(slug: string) {
  return resourceArticles.find((article) => article.slug === slug) ?? null;
}

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getResourceArticleUpdatedAt(article: ResourceArticle) {
  return article.updatedAt || article.publishedAt;
}

export function formatResourceArticleDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildResourceGetStartedUrl(articleSlug: string, intent = "article_cta") {
  const params = new URLSearchParams({
    utm_source: "resources",
    utm_medium: "seo_article",
    utm_campaign: articleSlug,
    resource: articleSlug,
    resourceIntent: intent,
  });

  return `/get-started?${params.toString()}`;
}

export function buildResourceContactUrl(articleSlug: string, intent = "rollout_review") {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: "resources",
    utm_medium: "seo_article",
    utm_campaign: articleSlug,
    resource: articleSlug,
    resourceIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

function resourceIntentLabel(intent: string) {
  if (intent === "article_sidebar") {
    return "Article sidebar review";
  }

  if (intent === "source_plan_review") {
    return "Source plan review";
  }

  if (intent === "telegram_rollout_review") {
    return "Telegram rollout review";
  }

  return "Reviewed rollout";
}

function resourceContactGoals(article: ResourceArticle) {
  if (article.slug === "telegram-sales-command-center") {
    return ["Connect Telegram command center", "Launch approval-gated outreach"];
  }

  if (
    article.slug === "ai-lead-generation-channels-source-plan" ||
    article.slug === "sales-blueprint-for-lead-generation"
  ) {
    return ["Build a Sales Blueprint", "Generate qualified leads"];
  }

  if (article.slug === "ai-sales-crm-vs-outbound-workspace") {
    return ["Improve meetings and conversion", "Launch approval-gated outreach"];
  }

  return ["Build a Sales Blueprint", "Launch approval-gated outreach"];
}

function resourceContactChannels(article: ResourceArticle) {
  if (article.slug === "telegram-sales-command-center") {
    return ["telegram", "email"];
  }

  if (
    article.slug === "ai-lead-generation-channels-source-plan" ||
    article.slug === "sales-blueprint-for-lead-generation"
  ) {
    return ["website", "directory", "email"];
  }

  return ["email", "call"];
}

export function parseResourceContactContext(
  params: ResourceContactSearchParams | undefined,
): ResourceContactContext | null {
  if (firstSearchParam(params?.utm_source)?.trim() !== "resources") {
    return null;
  }

  const slug =
    firstSearchParam(params?.resource)?.trim() ||
    firstSearchParam(params?.utm_campaign)?.trim();
  const article = slug ? getResourceArticle(slug) : null;

  if (!article) {
    return null;
  }

  const intent = firstSearchParam(params?.resourceIntent)?.trim() || "rollout_review";

  return {
    slug: article.slug,
    title: article.title,
    category: article.category,
    funnelStage: article.funnelStage,
    intent,
    intentLabel: resourceIntentLabel(intent),
    budgetRange:
      article.funnelStage === "awareness" ? "500_1500" : "1500_5000",
    sourcePath: `/resources/${article.slug}`,
    goals: resourceContactGoals(article),
    channels: resourceContactChannels(article),
  };
}

export function formatResourceContactMessage(context: ResourceContactContext) {
  return [
    `Resource guide context attached for review: ${context.title}.`,
    `Guide category: ${context.category}.`,
    `Requested intent: ${context.intent}.`,
    "Buyer is asking how to turn this guide into a reviewed Sales Blueprint, source plan, approval workflow, meeting/conversion flow, or Telegram command posture.",
    "No lead sourcing, outreach, provider work, billing change, AI-worker execution, service obligation, or Telegram-controlled mutation starts from this request.",
  ].join("\n\n");
}
