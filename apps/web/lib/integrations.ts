export type PublicIntegrationStatus =
  | "configured_when_ready"
  | "guarded_beta"
  | "roadmap"
  | "prohibited";

export type PublicIntegrationCategory =
  | "lead_sources"
  | "outreach"
  | "voice_meetings"
  | "billing_webhooks"
  | "command_center"
  | "roadmap_ops"
  | "policy_boundaries";

export type PublicIntegration = {
  slug: string;
  name: string;
  category: PublicIntegrationCategory;
  status: PublicIntegrationStatus;
  channels: string[];
  summary: string;
  currentMode: string;
  requiredSetup: string[];
  guardrails: string[];
  roadmap: string;
  evidencePaths: string[];
  keywords: string[];
  guideHref?: string;
};

export type PublicIntegrationRolloutPath = {
  label: string;
  ctaLabel: string | null;
  contactIntent: string | null;
  description: string;
  claimBoundary: string;
};

export const integrationStatusMeta = {
  configured_when_ready: {
    label: "Configurable",
    shortLabel: "Configurable",
    description: "Can move to configured mode when deployment-side secrets and checks are present.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  guarded_beta: {
    label: "Guarded beta",
    shortLabel: "Guarded",
    description: "Available as a reviewable foundation, mock-backed flow, or limited beta surface.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  roadmap: {
    label: "Roadmap",
    shortLabel: "Roadmap",
    description: "Planned expansion that should not be sold as live product behavior yet.",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  prohibited: {
    label: "Not supported",
    shortLabel: "Boundary",
    description: "Explicitly excluded from the product stance and public sales claims.",
    className: "border-red-200 bg-red-50 text-red-700",
  },
} as const satisfies Record<
  PublicIntegrationStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    className: string;
  }
>;

export const integrationRolloutPathMeta = {
  configured_when_ready: {
    label: "Configure for rollout",
    ctaLabel: "Request rollout review",
    contactIntent: "rollout_review",
    description:
      "Validate deployment secrets, provider account ownership, budget, suppression, and approval gates before live use.",
    claimBoundary:
      "Configurable does not mean active in every workspace; production behavior depends on server-side setup.",
  },
  guarded_beta: {
    label: "Pilot with review gates",
    ctaLabel: "Request beta rollout",
    contactIntent: "beta_rollout",
    description:
      "Use a bounded pilot with operator review, mock/configured-mode clarity, and explicit launch blockers.",
    claimBoundary:
      "Guarded beta flows should not be described as autonomous provider execution or guaranteed conversion.",
  },
  roadmap: {
    label: "Validate roadmap fit",
    ctaLabel: "Discuss roadmap fit",
    contactIntent: "roadmap_fit",
    description:
      "Qualify buyer demand, revenue impact, support cost, compliance posture, and implementation sequence before committing.",
    claimBoundary:
      "Roadmap capabilities are not live product behavior and should not be sold as available today.",
  },
  prohibited: {
    label: "No rollout path",
    ctaLabel: null,
    contactIntent: null,
    description:
      "Use this row as a sales and product boundary; route buyers toward compliant review-only alternatives.",
    claimBoundary:
      "This capability is intentionally unsupported unless product, legal, security, and platform policy change.",
  },
} as const satisfies Record<PublicIntegrationStatus, PublicIntegrationRolloutPath>;

export function getIntegrationRolloutPath(
  integration: Pick<PublicIntegration, "status">,
): PublicIntegrationRolloutPath {
  return integrationRolloutPathMeta[integration.status];
}

export function getIntegrationRolloutPathCounts() {
  return publicIntegrations.reduce(
    (counts, integration) => ({
      ...counts,
      [getIntegrationRolloutPath(integration).label]:
        (counts[getIntegrationRolloutPath(integration).label] ?? 0) + 1,
    }),
    {} as Record<string, number>,
  );
}

export const publicIntegrationCategories = [
  {
    id: "lead_sources",
    label: "Lead-source discovery",
    description:
      "Source planning, evidence capture, and reviewable lead discovery before any outbound action.",
  },
  {
    id: "outreach",
    label: "Outreach delivery",
    description:
      "Email and social-style outreach surfaces with explicit approval, suppression, and provider checks.",
  },
  {
    id: "voice_meetings",
    label: "Voice and meetings",
    description:
      "Call dispatch and meeting conversion foundations that stay gated by review posture.",
  },
  {
    id: "billing_webhooks",
    label: "Billing and webhooks",
    description:
      "Subscription, provider-event, and lifecycle hooks that require deployment-side secrets.",
  },
  {
    id: "command_center",
    label: "Command center",
    description:
      "Telegram and AI-operator foundations for safe status checks and approval-gated proposals.",
  },
  {
    id: "roadmap_ops",
    label: "Operations roadmap",
    description:
      "Future CRM, calendar, SMS, and company-management integrations that need deeper controls.",
  },
  {
    id: "policy_boundaries",
    label: "Policy boundaries",
    description:
      "Capabilities salesxgrowth should not market or automate unless the product stance changes.",
  },
] as const satisfies readonly {
  id: PublicIntegrationCategory;
  label: string;
  description: string;
}[];

export const publicIntegrations = [
  {
    slug: "website-crawler",
    name: "Website and site-signal research",
    category: "lead_sources",
    status: "guarded_beta",
    channels: ["website", "lead source"],
    summary:
      "Turns a workspace website and Sales Blueprint context into reviewable source-run evidence.",
    currentMode:
      "Mock-backed source adapter records candidates, dedupe posture, quality score, evidence, rejection reasons, and next action for review.",
    requiredSetup: [
      "Business website and ICP context",
      "Workspace regions, buyer roles, and disqualifiers",
      "Production crawler provider before live-scale sourcing",
    ],
    guardrails: [
      "Lead quality scoring",
      "Rejected-lead tracking",
      "Suppression-aware dispatch before outreach",
    ],
    roadmap:
      "Add production crawler providers with rate limits, source terms checks, and freshness controls.",
    evidencePaths: ["apps/api/src/providers.ts", "packages/shared/src/domain.ts"],
    keywords: ["website lead generation", "AI lead source planning", "lead evidence review"],
  },
  {
    slug: "search-intelligence",
    name: "Search intelligence",
    category: "lead_sources",
    status: "guarded_beta",
    channels: ["search", "lead source"],
    summary:
      "Uses search-channel planning to retain evidence signals and expose discovery quality before outreach.",
    currentMode:
      "Mock-backed search intelligence is available for planned source workflows and dashboard review.",
    requiredSetup: [
      "Search keywords from the Sales Blueprint",
      "Target segments and regions",
      "Production search/data provider with terms-aware usage controls",
    ],
    guardrails: [
      "Evidence snippets retained for review",
      "Readiness gaps before weak plans scale",
      "No universal search scraping claim",
    ],
    roadmap:
      "Connect compliant search/data providers and source-specific quota controls after beta hardening.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/web/app/dashboard/page.tsx"],
    keywords: ["B2B search intelligence", "AI sales prospecting", "lead discovery workflow"],
  },
  {
    slug: "directory-harvester",
    name: "Directory research",
    category: "lead_sources",
    status: "guarded_beta",
    channels: ["directory", "lead source"],
    summary:
      "Prepares commercial directory source runs with rejection reasons and source-quality review.",
    currentMode:
      "Mock-backed directory adapter supports source planning and review without claiming live directory harvesting.",
    requiredSetup: [
      "Directory source selection",
      "Qualification rules and exclusion rules",
      "Approved provider terms for production directory data",
    ],
    guardrails: [
      "Rejected reason groups",
      "Quality score visibility",
      "Operator review before campaign creation",
    ],
    roadmap:
      "Add approved directory data sources with consent, retry, quota, and freshness protections.",
    evidencePaths: ["apps/api/src/providers.ts"],
    keywords: ["directory lead generation", "source run evidence", "sales prospecting software"],
  },
  {
    slug: "resend-email",
    name: "Resend email delivery",
    category: "outreach",
    status: "configured_when_ready",
    channels: ["email", "outreach"],
    summary:
      "Sends approved email outreach through Resend when deployment secrets and sender identity are configured.",
    currentMode:
      "Configured dispatch uses Resend API keys after campaign approval, suppression checks, and usage checks; otherwise it queues in guarded mode.",
    requiredSetup: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "Approved sending domain and sender reputation controls",
    ],
    guardrails: [
      "Owner/admin approval before dispatch",
      "Suppression check before provider delivery",
      "Idempotency key per campaign activity",
    ],
    roadmap:
      "Deepen bounce, complaint, and reply-state workflows as provider events mature.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/api/src/routes/providers.ts"],
    keywords: ["AI email outreach", "approval gated email automation", "Resend sales outreach"],
  },
  {
    slug: "smtp-primary",
    name: "SMTP-owned sender path",
    category: "outreach",
    status: "guarded_beta",
    channels: ["email", "outreach"],
    summary:
      "Tracks an app-owned SMTP readiness path without asking users to paste raw provider secrets into the browser.",
    currentMode:
      "Readiness depends on deployment-side SMTP configuration; public copy should not imply every SMTP relay is production-ready.",
    requiredSetup: [
      "SMTP_HOST deployment configuration",
      "Domain authentication and bounce handling plan",
      "Provider-specific production send implementation review",
    ],
    guardrails: [
      "Deployment-side setup only",
      "No browser-entered raw secrets",
      "Approval and suppression gates before live sending",
    ],
    roadmap:
      "Complete relay-specific delivery handling, event ingestion, and deliverability reporting.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/web/app/settings/page.tsx"],
    keywords: ["SMTP sales outreach", "email provider readiness", "sales email automation"],
  },
  {
    slug: "linkedin-review",
    name: "LinkedIn-style outreach review",
    category: "outreach",
    status: "guarded_beta",
    channels: ["linkedin", "social review"],
    summary:
      "Supports review-only social outreach drafting posture; it does not auto-connect or auto-DM leads.",
    currentMode:
      "Mock adapter returns review-required status for LinkedIn-style outreach and keeps sending out of automation.",
    requiredSetup: [
      "Human operator review",
      "Platform-policy review",
      "Approved manual workflow outside automated dispatch",
    ],
    guardrails: [
      "No automated social-platform sending",
      "Review-required delivery status",
      "Public claim boundary documented",
    ],
    roadmap:
      "Keep social workflows human-owned unless a compliant provider path and policy posture are approved.",
    evidencePaths: ["apps/api/src/providers.ts", "docs/product/public-claims-truth-matrix.md"],
    keywords: ["LinkedIn outreach workflow", "social selling review", "sales outreach governance"],
  },
  {
    slug: "twilio-voice",
    name: "Twilio voice calls",
    category: "voice_meetings",
    status: "configured_when_ready",
    channels: ["voice", "call"],
    summary:
      "Dispatches reviewed voice calls through Twilio when credentials, TwiML, and callback setup are complete.",
    currentMode:
      "Configured Twilio calls require owner/admin action, verified email, usage budget, suppression checks, and call review posture.",
    requiredSetup: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_FROM_NUMBER",
      "TWILIO_TWIML_URL",
    ],
    guardrails: [
      "Call review posture",
      "Suppression check before provider delivery",
      "Twilio signature verification for status callbacks",
    ],
    roadmap:
      "Improve transcript review, regional compliance controls, and meeting handoff automation.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/web/app/api/calls/dispatch/route.ts"],
    keywords: ["AI sales calls", "Twilio voice sales workflow", "approval gated voice outreach"],
  },
  {
    slug: "meeting-conversion",
    name: "Meeting conversion workflow",
    category: "voice_meetings",
    status: "guarded_beta",
    channels: ["meetings", "conversion"],
    summary:
      "Schedules and tracks meetings from qualified leads, then records outcomes back into the workspace.",
    currentMode:
      "Manual meeting creation and outcome tracking exist; calendar-provider automation is still roadmap.",
    requiredSetup: [
      "Qualified accepted lead",
      "Operator-owned meeting details",
      "Future calendar provider configuration",
    ],
    guardrails: [
      "Workspace-scoped meeting records",
      "Won/lost conversion state",
      "No claim of autonomous calendar booking today",
    ],
    roadmap:
      "Add calendar sync, availability management, reminders, and CRM handoff once provider controls mature.",
    evidencePaths: ["apps/api/src/routes/meetings.ts", "apps/web/app/dashboard/page.tsx"],
    keywords: ["sales meeting conversion", "lead to meeting workflow", "AI sales scheduling"],
  },
  {
    slug: "stripe-billing",
    name: "Stripe billing",
    category: "billing_webhooks",
    status: "configured_when_ready",
    channels: ["checkout", "portal", "billing webhook"],
    summary:
      "Supports checkout, portal, cancellation, and subscription lifecycle events when Stripe secrets are configured.",
    currentMode:
      "Billing routes enforce owner/admin access, verified email, and webhook idempotency around subscription changes.",
    requiredSetup: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "Configured price mappings"],
    guardrails: [
      "Owner/admin billing authorization",
      "Email verification required for billing mutations",
      "Webhook idempotency records",
    ],
    roadmap:
      "Expand billing analytics, revenue reports, and customer lifecycle automation.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/api/src/routes/billing.ts"],
    keywords: ["sales SaaS billing", "Stripe subscription SaaS", "usage aware billing"],
  },
  {
    slug: "razorpay-billing",
    name: "Razorpay billing",
    category: "billing_webhooks",
    status: "configured_when_ready",
    channels: ["checkout", "subscription", "billing webhook"],
    summary:
      "Provides an India-friendly subscription path when Razorpay credentials and webhooks are configured.",
    currentMode:
      "Checkout and subscription webhooks are deployment-configurable and require signature verification.",
    requiredSetup: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
    guardrails: [
      "Owner/admin billing authorization",
      "Email verification required for billing mutations",
      "HMAC webhook signature verification",
    ],
    roadmap:
      "Deepen invoice, tax, recovery, and customer-success workflows around subscription events.",
    evidencePaths: ["apps/api/src/providers.ts", "apps/api/src/routes/billing.ts"],
    keywords: ["Razorpay SaaS billing", "India subscription SaaS", "sales SaaS payments"],
  },
  {
    slug: "provider-webhooks",
    name: "Provider event webhooks",
    category: "billing_webhooks",
    status: "configured_when_ready",
    channels: ["email events", "billing events", "voice events"],
    summary:
      "Verifies provider callbacks for email, billing, and voice lifecycle updates before applying state.",
    currentMode:
      "Resend, Stripe, Razorpay, and Twilio callback readiness depends on deployment-side webhook secrets.",
    requiredSetup: [
      "RESEND_WEBHOOK_SECRET",
      "STRIPE_WEBHOOK_SECRET",
      "RAZORPAY_WEBHOOK_SECRET",
      "TWILIO_AUTH_TOKEN",
    ],
    guardrails: [
      "Signature verification",
      "Provider event audit record",
      "Idempotency or ambiguous-target protection",
    ],
    roadmap:
      "Unify provider event timelines into customer-visible delivery and revenue health reporting.",
    evidencePaths: ["apps/api/src/providers.ts"],
    keywords: ["provider webhook verification", "sales automation audit trail", "SaaS webhook security"],
  },
  {
    slug: "contact-intake-notification",
    name: "Contact intake notification",
    category: "billing_webhooks",
    status: "configured_when_ready",
    channels: ["inbound intake", "email alert"],
    summary:
      "Alerts the team after a public contact or managed-services request is durably captured.",
    currentMode:
      "Contact requests are stored first; Resend notification is best-effort and depends on deployment-side sender and recipient configuration.",
    requiredSetup: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "CONTACT_INTAKE_TO_EMAIL",
    ],
    guardrails: [
      "Durable capture before notification",
      "Notification failure does not drop the request",
      "Reply-to uses the buyer email for manual follow-up",
    ],
    roadmap:
      "Add internal intake inbox, assignment, SLA tracking, and CRM handoff once operator roles are defined.",
    evidencePaths: [
      "apps/api/src/contact-intake-notifications.ts",
      "apps/api/src/app.ts",
      "apps/web/app/contact/page.tsx",
    ],
    keywords: ["SaaS contact form", "inbound sales intake", "managed services lead routing"],
  },
  {
    slug: "account-lifecycle-email",
    name: "Account lifecycle email",
    category: "billing_webhooks",
    status: "configured_when_ready",
    channels: ["email verification", "password reset", "workspace invites"],
    summary:
      "Delivers verification, password reset, and workspace invitation email when transactional sender secrets are configured.",
    currentMode:
      "Production account email depends on deployment-side Resend sender configuration; missing configuration blocks invite creation instead of creating unusable invites.",
    requiredSetup: [
      "RESEND_API_KEY",
      "RESEND_FROM_EMAIL",
      "FRONTEND_URL",
      "Verified sending domain",
    ],
    guardrails: [
      "Short-lived hashed verification and reset tokens",
      "Invite acceptance constrained to the invited email address",
      "No browser-entered raw email-provider secrets",
    ],
    roadmap:
      "Add lifecycle delivery analytics, bounce handling, and admin-facing deliverability checks.",
    evidencePaths: [
      "apps/api/src/auth-lifecycle.ts",
      "apps/api/src/team-invitation-delivery.ts",
      "apps/api/src/providers.ts",
    ],
    keywords: ["SaaS email verification", "password reset email", "workspace invite email"],
  },
  {
    slug: "telegram-command-center",
    name: "Telegram command center",
    category: "command_center",
    status: "guarded_beta",
    channels: ["telegram", "command center"],
    summary:
      "Lets a workspace bind Telegram for safe status, operator brief, sequence readiness, revenue forecast, deterministic aliases, and guarded pause request flows.",
    currentMode:
      "Configured bot secrets enable read-only operator briefs, sequence-plan summaries, revenue forecast summaries, deterministic natural-language aliases, and approval-gated action proposals; Telegram does not approve campaigns, calls, billing, or provider changes.",
    requiredSetup: [
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_WEBHOOK_SECRET",
      "Workspace chat binding by an eligible admin",
    ],
    guardrails: [
      "Secret-header webhook verification",
      "Hashed chat binding",
      "Replay protection",
      "Emergency disable",
      "Command audit trail",
    ],
    roadmap:
      "Add richer command proposals while keeping high-impact mutations inside in-app approval gates.",
    evidencePaths: ["packages/shared/src/command-center.ts", "apps/web/app/settings/page.tsx"],
    keywords: ["Telegram sales command center", "AI sales bot", "sales automation control plane"],
    guideHref: "/resources/telegram-sales-command-center",
  },
  {
    slug: "ai-worker-ops",
    name: "AI worker operating plane",
    category: "command_center",
    status: "guarded_beta",
    channels: ["AI worker", "company operations"],
    summary:
      "Registers AI workers, allowed tools, blocked tools, budgets, and approval-gated task proposals.",
    currentMode:
      "The control plane shows worker posture and task proposals; autonomous external tool execution is not implemented.",
    requiredSetup: [
      "Workspace plan and budget posture",
      "Allowed/blocked tool policy",
      "Human review for high-impact task proposals",
    ],
    guardrails: [
      "Worker permission lists",
      "Budget blocking",
      "Approval-inbox linkage",
      "Execution ledger",
    ],
    roadmap:
      "Graduate low-risk internal tasks first, then add provider-specific execution after audit and rollback controls mature.",
    evidencePaths: ["packages/shared/src/platform.ts", "apps/web/app/dashboard/page.tsx"],
    keywords: ["AI sales employees", "AI worker control plane", "sales operations automation"],
  },
  {
    slug: "crm-calendar-sync",
    name: "CRM and calendar sync",
    category: "roadmap_ops",
    status: "roadmap",
    channels: ["CRM", "calendar", "meetings"],
    summary:
      "Planned two-way sync for accounts, contacts, meetings, and deal handoff after the core workflow is stable.",
    currentMode:
      "The product tracks leads, meetings, and outcomes internally today; external CRM and calendar sync should be treated as roadmap.",
    requiredSetup: [
      "Provider OAuth and scopes",
      "Field mapping and conflict strategy",
      "Tenant-specific audit and rollback plan",
    ],
    guardrails: [
      "Least-privilege OAuth scopes",
      "Sync conflict review",
      "Tenant-isolated mappings",
    ],
    roadmap:
      "Prioritize CRM and calendar systems based on customer demand, revenue impact, and support cost.",
    evidencePaths: ["docs/product/public-claims-truth-matrix.md"],
    keywords: ["AI sales CRM sync", "calendar sales automation", "meeting handoff automation"],
  },
  {
    slug: "sms-whatsapp",
    name: "SMS and messaging channels",
    category: "roadmap_ops",
    status: "roadmap",
    channels: ["SMS", "WhatsApp", "messaging"],
    summary:
      "Future outbound channels that require consent, regional compliance, opt-out handling, and provider-specific delivery controls.",
    currentMode:
      "The data model can describe SMS activity, but no mature SMS or WhatsApp product flow should be claimed today.",
    requiredSetup: [
      "Consent and opt-out model",
      "Provider approval and templates",
      "Regional compliance review",
    ],
    guardrails: [
      "Suppression and unsubscribe enforcement",
      "Channel-specific plan entitlement",
      "Human approval for first live use",
    ],
    roadmap:
      "Add messaging only where consent, compliance, provider setup, and customer value are clear.",
    evidencePaths: ["docs/product/public-claims-truth-matrix.md", "packages/shared/src/domain.ts"],
    keywords: ["SMS sales outreach", "WhatsApp sales automation", "multi channel sales platform"],
  },
  {
    slug: "company-management",
    name: "Company-management integrations",
    category: "roadmap_ops",
    status: "roadmap",
    channels: ["HR", "ERP", "finance", "operations"],
    summary:
      "Long-term company operating-system ambition for low-risk operational workflows, not legal, finance, or employment decision automation.",
    currentMode:
      "AI worker foundations exist, but HR, ERP, finance, and broad company-management integrations remain roadmap.",
    requiredSetup: [
      "Explicit ownership and approval policy",
      "Sensitive-data access controls",
      "Provider-specific rollback and audit design",
    ],
    guardrails: [
      "Human-owned legal, finance, and employment decisions",
      "Least-privilege access",
      "Action proposals before mutations",
    ],
    roadmap:
      "Sequence company-management integrations after sales workflow reliability and customer revenue traction.",
    evidencePaths: ["docs/product/public-claims-truth-matrix.md"],
    keywords: ["AI company management", "business operations automation", "AI operations platform"],
  },
  {
    slug: "linkedin-browser-automation",
    name: "LinkedIn scraping and auto-DM",
    category: "policy_boundaries",
    status: "prohibited",
    channels: ["LinkedIn", "browser automation"],
    summary:
      "salesxgrowth should not market browser scraping, auto-connect, or auto-DM behavior as supported product functionality.",
    currentMode:
      "Current LinkedIn-style behavior is review-only and mock-backed; platform automation claims are prohibited.",
    requiredSetup: ["No production setup path"],
    guardrails: [
      "Do not claim automated scraping",
      "Do not claim auto-connect or auto-DM",
      "Keep social outreach human-owned unless product policy changes",
    ],
    roadmap:
      "Only revisit through compliant provider partnerships and explicit legal, security, and product approval.",
    evidencePaths: ["docs/product/public-claims-truth-matrix.md", "apps/api/src/providers.ts"],
    keywords: ["LinkedIn outreach policy", "sales automation compliance", "outbound governance"],
  },
] as const satisfies readonly PublicIntegration[];

export function getIntegrationsByCategory() {
  return publicIntegrationCategories.map((category) => ({
    ...category,
    integrations: publicIntegrations.filter((integration) => integration.category === category.id),
  }));
}

export function getIntegrationStatusCounts() {
  return publicIntegrations.reduce(
    (counts, integration) => ({
      ...counts,
      [integration.status]: counts[integration.status] + 1,
    }),
    {
      configured_when_ready: 0,
      guarded_beta: 0,
      roadmap: 0,
      prohibited: 0,
    } satisfies Record<PublicIntegrationStatus, number>,
  );
}

export type IntegrationContactSearchParams = Record<string, string | string[] | undefined> & {
  utm_source?: string | string[];
  utm_campaign?: string | string[];
  integration?: string | string[];
  integrationIntent?: string | string[];
};

export type IntegrationContactContext = {
  integration: PublicIntegration;
  slug: string;
  name: string;
  statusLabel: string;
  commercialPathLabel: string;
  requestedIntent: string | null;
  claimBoundary: string;
  channels: string[];
};

export const integrationCatalogUtmSource = "integration_catalog";

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function getPublicIntegration(slug: string) {
  return publicIntegrations.find((integration) => integration.slug === slug) ?? null;
}

export function buildIntegrationContactUrl(integrationSlug: string, intent = "rollout_review") {
  const params = new URLSearchParams({
    intent: "managed_services",
    utm_source: integrationCatalogUtmSource,
    utm_medium: "public_catalog",
    utm_campaign: integrationSlug,
    integration: integrationSlug,
    integrationIntent: intent,
  });

  return `/contact?${params.toString()}`;
}

export function parseIntegrationContactContext(
  params: IntegrationContactSearchParams | undefined,
): IntegrationContactContext | null {
  if (firstParam(params?.utm_source)?.trim() !== integrationCatalogUtmSource) {
    return null;
  }

  const requestedSlug =
    firstParam(params?.integration)?.trim() || firstParam(params?.utm_campaign)?.trim();
  const integration = requestedSlug ? getPublicIntegration(requestedSlug) : null;

  if (!integration) {
    return null;
  }

  const rolloutPath = getIntegrationRolloutPath(integration);
  const requestedIntent = firstParam(params?.integrationIntent)?.trim();
  const safeRequestedIntent =
    requestedIntent && requestedIntent === rolloutPath.contactIntent
      ? requestedIntent
      : rolloutPath.contactIntent;

  return {
    integration,
    slug: integration.slug,
    name: integration.name,
    statusLabel: integrationStatusMeta[integration.status].label,
    commercialPathLabel: rolloutPath.label,
    requestedIntent: safeRequestedIntent,
    claimBoundary: rolloutPath.claimBoundary,
    channels: [...integration.channels],
  };
}

export function formatIntegrationContactMessage(context: IntegrationContactContext) {
  const { integration } = context;

  return [
    `Integration rollout context attached for review: ${integration.name}.`,
    `Current status: ${integrationStatusMeta[integration.status].label}.`,
    `Commercial path: ${context.commercialPathLabel}.`,
    `Requested intent: ${context.requestedIntent ?? "No rollout path"}.`,
    `Current mode: ${integration.currentMode}`,
    `Required setup: ${integration.requiredSetup.join(", ")}.`,
    `Guardrails: ${integration.guardrails.join(", ")}.`,
    `Claim boundary: ${context.claimBoundary}`,
    "Please review fit, setup blockers, provider readiness, budget posture, and the safest rollout path before any live provider work starts.",
  ].join("\n");
}
