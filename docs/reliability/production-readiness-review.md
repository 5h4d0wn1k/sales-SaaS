# Production Readiness Review

## Change summary

The current launch baseline is a reviewable revenue execution platform with:

- public marketing and pricing
- get-started onboarding
- authenticated workspace access
- billing and subscription visibility
- dashboard visibility
- lead, campaign, meeting, and call foundations
- approval-aware dispatch posture

## Customer impact

### Workflows that must stay trustworthy

- visitor activation
- workspace creation and scope selection
- billing and payment visibility
- dashboard accuracy
- approval-aware outbound operations
- lifecycle recovery such as verify-email and password reset

### Worst credible failure

The user can sign in but cannot trust the workspace, billing, or dispatch state.

## Verification standard

### Required release checks for behavior-sensitive work

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run repo:audit`

### Required browser checks for public activation or navigation work

- `npm run test:e2e`

### Required targeted checks for auth, billing, or tenancy work

- lifecycle route tests
- billing route tests
- workspace route tests
- dashboard and billing page smoke coverage

### Manual workflow checks before promotion

- get-started flow
- workspace selection
- billing page
- dashboard page
- web `/health` and API `/health` for liveness
- web `/ready` and API `/ready` for production readiness

## Latest local evidence

Captured on 2026-06-05:

- `npm run typecheck` passed across workspaces
- `npm run test` passed root, API, web, database, and shared suites
- `npm run build` passed, including 68 generated web routes
- `npm run repo:audit` passed at 100%
- `npm run test:e2e` passed 49 Chromium smoke tests against the built web app
- API `/ready` now blocks production memory-storage fallback while keeping `/health` as liveness
- Web `/ready` checks API readiness and blocks production when `NEXT_PUBLIC_API_URL` is missing, localhost, non-HTTPS, credential-bearing, or a reserved example-style host
- web/API `/ready` block production when `AUTH_SECRET` is missing, too short, or still the example placeholder
- API `/ready` blocks production when `FRONTEND_URL` is missing, localhost, non-HTTPS, credential-bearing, path/query/fragment-bearing, or a reserved example-style host
- Web `/ready` exposes top-level warning details for local web checks and downstream API readiness warnings, while preserving nested API warning counts for older monitors
- API `/ready` now blocks production readiness when global/auth/contact intake rate limits are only process-local; set `DURABLE_RATE_LIMITS_ENABLED=true` or `RATE_LIMIT_BACKEND=edge|durable` only after external enforcement is deployed
- API `/ready` now reports whether production forwarded client-IP headers are trusted; the process fallback does not trust spoofable proxy headers unless `RATE_LIMIT_TRUST_PROXY_HEADERS=true`
- API responses now include request IDs plus response-time headers for low-friction latency monitoring
- web/API `/health` and `/ready` now include non-secret release metadata so smoke checks can identify the live version and optional commit/deployment IDs
- `.github/workflows/readiness-monitor.yml` now runs scheduled production smoke/readiness probes every 30 minutes
- the readiness monitor can route failures to an optional Slack, Discord, or generic alert webhook
- configured email and voice provider dispatch failures now move work into review-required state, avoid raw provider-error leakage, and do not meter provider cost or advance leads without provider acceptance
- production smoke checks now fail readiness warnings by default; `READINESS_ALLOW_WARNINGS=true` is reserved for explicitly accepted rollout exceptions
- API uncaught errors now return sanitized request-id-bearing responses, while validation failures return sanitized 400s without stack traces
- billing portal, checkout, and cancellation failures now return stable public errors instead of raw database or provider exception messages
- global, auth lifecycle, and public contact-intake 429 responses now expose standard and legacy rate-limit headers for monitoring and client backoff
- Web `/.well-known/security.txt` now exposes responsible-disclosure contact metadata with canonical URL, expiry, trust-policy link, and no bug-bounty or safe-harbor overclaim, and `/trust` links that public contact path for human readers
- production smoke checks now verify public `sitemap.xml`, `robots.txt`, Open Graph/Twitter image PNG responses, and responsible-disclosure metadata so acquisition and trust assets cannot silently disappear after deployment
- public comparison acquisition now has a sitemap-registered route and tested contact/get-started context handoff for high-intent buyers comparing CRMs, outreach tools, lead-list vendors, agencies, and generic AI agents
- public pricing now includes a catalog-driven plan-fit advisor with tested pricing-intent handoff into onboarding and managed-review paths
- public AI sales automation platform, AI lead-generation, outbound-automation, meeting-conversion, and Telegram command-center acquisition routes now have sitemap-registered pages plus tested contact/get-started context handoff for full-workflow review, source planning, sequence review, manual meeting handoff, and guarded Telegram command-center buyers
- commercial public pages now avoid `FAQPage`, `Question`, and `Answer` rich-result JSON-LD while keeping visible buyer-question sections represented as neutral `ItemList` metadata, reducing unsupported structured-data risk on SaaS sales pages
- Settings integration readiness now includes an incident-response readiness plan for production probe variables, optional alert webhook routing, first-response triage evidence, and owner-operated escalation gaps without claiming pager-backed operations or SIEM maturity
- Settings now includes audit compliance readiness for manual hash-chain export, retention-limited operator evidence/export, declared retention days, deployment-owned SIEM stream presence, immutable archive presence, and legal-discovery ownership without exposing destination values or claiming automated compliance workflows
- Dashboard outreach operations now include outbound channel readiness for email/call live-dispatch gates, review-only social posture, SMS roadmap blockers, and missing SMS/social provider-policy controls without enabling live SMS or social-network mutation
- Settings now includes Telegram command readiness for deployment secrets, chat binding, webhook verification, command allowlist, approval proposal bridge, direct-mutation boundaries, rate-limit durability, and command audit evidence without enabling Telegram-controlled outreach mutation
- Settings now includes Telegram notification readiness, owner/admin test delivery, and scheduler-secret dispatch for notification enablement, deployment-owned target-chat binding, verified Telegram activity, notification policy, concrete quiet-hours windows, escalation owner, customer-safe payload-review gating, delivery-ledger-backed rate-cap enforcement, delivery audit, and notification type coverage; the delivery paths are summary-only and do not approve, dispatch outreach, bill, configure providers, expose sensitive payloads, run AI-worker tools, or enable chat-driven mutations
- Dashboard action center now includes managed-service readiness backed by `/v1/growth/managed-service-readiness`, making scope policy, SOW template, pricing policy, delivery owner, customer handoff, provider-cost boundary, support capacity, subscription state, approval load, conversion workload, and AI-worker pressure visible before high-touch support is sold or delivered

Additional local evidence captured on 2026-06-06:

- public Sales Blueprint contact handoff now preserves recommended SaaS plan, managed-service fit, managed intent, source path, and public acquisition attribution into the contact page and API contact-intake notification path without starting checkout, provider work, outreach, billing changes, AI-worker execution, or Telegram-controlled mutation
- contact-intake notification emails now include `sourcePath` and `referrer` next to acquisition, pricing, managed-package, and integration context so operators can trace Blueprint-generated commercial-fit submissions back to the public workflow that produced them
- the public sitemap now uses a stable `SITE_CONTENT_UPDATED_AT` / `NEXT_PUBLIC_SITE_CONTENT_UPDATED_AT` freshness source instead of marking every public URL as modified at request time
- pricing, contact, Sales Blueprint, and ROI calculator pages now emit page-specific Twitter card metadata through shared social-preview helpers while keeping claim-safe copy
- resource articles now expose visible published/updated dates, a stable author identity, article `dateModified`, article section/tags, page-specific Twitter cards, freshness metadata on the resource hub, per-article sitemap `lastmod` freshness, and reviewed rollout contact CTAs with resource-context handoff while preserving claim-safe copy
- get-started now uses the Stitch-aligned operational activation shell, Sales Blueprint checkpoint, compact plan-capacity comparison, single auth action set, dashboard activation context handoff, Settings blueprint prefill handoff for blank review fields, deferred Razorpay checkout script loading, and a narrow web CSP allowance for the configured Razorpay checkout script origin without implying provider work, outreach, billing mutation, or Telegram mutation from signup
- verification evidence across this 2026-06-06 activation tranche includes focused API contact-intake tests, full API tests, focused SEO/resource tests, targeted get-started/resource Playwright smoke tests, and Playwright CLI screenshot checks for the activation and blueprint-checkpoint UI; the Settings prefill handoff specifically passed focused acquisition/get-started helper tests, full web tests, web typecheck, web production build with 71 generated routes, diff checks, and `npm run repo:audit`

## Operational readiness

### Current posture

- better than prototype
- public activation, SEO/navigation, and core guarded-workflow checks have automated coverage
- liveness and readiness are separate so demo storage cannot look production-ready
- production readiness blocks placeholder or short auth session secrets before serving authenticated traffic as launch-ready
- rate-limit responses expose limit, remaining, reset, and retry-after headers for abuse-control observability
- production rate-limit buckets ignore spoofable forwarded IP headers by default unless proxy trust is explicitly configured
- API responses expose `x-response-time-ms` and `Server-Timing` for smoke checks and future monitors
- scheduled GitHub readiness monitoring now gives the owner a recurring production failure signal with optional webhook routing
- deployment smoke checks now verify readiness payloads include release version metadata for rollback evidence
- deployment smoke checks now verify revenue-critical public SEO/trust assets after web readiness passes
- public SEO metadata is claim-safe by default: SaaS sales pages do not emit FAQ rich-result markup unless future eligibility and page purpose are explicitly re-reviewed
- public sitemap freshness is release-controlled by configuration, and high-intent conversion pages have page-specific Open Graph/Twitter sharing metadata instead of only root-level fallbacks
- public contact handoff into operator notification is traceable by source path and referrer, helping review teams understand which buyer workflow produced a submission before any managed service or automation work is considered
- web readiness responses include operator-readable downstream API warning and blocker details for first-step incident triage
- configured provider dispatch failures fail closed into operator review instead of implying completed outreach, completed calls, or spent provider budget
- production smoke checks treat warning-level readiness blockers as failed monitor runs unless an explicit temporary exception is configured
- API error responses preserve request IDs and timing headers for incident triage without exposing raw exception details to clients
- billing failure paths log provider details server-side while keeping client responses stable and non-secret-bearing
- responsible-disclosure metadata and the Trust-page contact panel give security researchers and operators a stable public contact path, while the project still needs a mature vulnerability-response SLA before stronger claims
- public abuse throttles expose `RateLimit-*`, `X-RateLimit-*`, and `Retry-After` metadata on limited responses; `/ready` now requires durable or edge enforcement before horizontal production scale
- Settings now gives operators a deployment-owned incident-readiness checklist for probes, alert routing, triage evidence, and escalation ownership, but this remains owner-operated until external alerting and escalation are configured
- Telegram notification delivery now supports owner/admin tests plus scheduler-secret summary dispatch with quiet-hours skip behavior, payload-review gating before live transport, and delivery-ledger-backed rate-cap enforcement; production rollout still needs the scheduled workflow enabled per environment, external incident routing, and customer-specific notification template signoff
- audit compliance readiness now distinguishes manual sanitized export evidence and retention-limited operator evidence from deployment-owned SIEM, archive, and discovery controls, but it does not delete old audit records or write to external compliance systems
- not yet full mature ops

### Needed to call the product truly production-hardened

- stronger observability
- pager-backed escalation and alert ownership beyond basic scheduled checks
- more formal incident handling
- destructive retention deletion jobs, SIEM event streaming, immutable archive writes, and legal discovery workflows beyond retention-limited operator evidence and readiness visibility
- deployed external edge/WAF or durable rate limiting, then set the matching readiness env flag per environment

## Security and trust review

- auth and session correctness
- production auth-session secret length and placeholder checks
- production frontend-origin readiness for CORS, checkout redirects, and lifecycle links
- tenant-safe workspace scope
- billing and webhook correctness
- approval path integrity
- proxy-header trust is explicit for production client identity
- public-claim honesty

## Rollout safety

- roll out high-risk changes deliberately
- prefer forward-only schema posture with rollback-aware behavior changes
- never widen public claims ahead of runtime truth

## Open risks

- some org/team admin workflows are still maturing
- live AI-worker external execution billing and live execution cost curves, SMS/social per-channel quotas, live source-provider activation/invoice workflows, live CRM/calendar/accounting sync enforcement, and SMS cost curves still need deeper commercial controls; current outreach and voice quotas, AI dry-run execution budgets, dry-run cost curves, runtime source-provider governance gates, conversion integration readiness, outbound channel readiness, Settings, and dashboard readiness make those missing controls visible before scale
- automated provider credential vault writes, rotation execution, and per-workspace provider activation still need implementation; Settings now exposes activation readiness so operators can see missing secret inventory, vault, rotation, activation-policy, rollback, and webhook controls before launch
- managed-service readiness is visible, but signed SOWs, service invoices, staff scheduling, SLA ownership, and delivery-capacity enforcement still remain outside the product and must stay operator-owned
- Telegram command and notification readiness expose customer-chat launch blockers, but broader AI-assisted parsing, dedicated customer bot-token storage/rotation, actual outbound notification dispatch, and Telegram-approved mutation execution remain future work
- some channel surfaces remain guarded or mock-backed by design
