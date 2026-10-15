# Open Design Project Brief

## Product

Winrate AI is a production-grade sales SaaS workspace for business onboarding, lead planning,
approval-gated outreach, meeting conversion, billing, team administration, and future governed AI
command-center workflows.

## Audience

Founders, sales operators, agencies, and SMB teams that need qualified pipeline without trusting
blind autonomous outreach. The interface should feel operational, clear, and control-oriented.

## Primary Workflows

- Visitor evaluates the public site, pricing, and trust posture.
- Visitor submits a contact or managed-rollout intake request with useful sales context.
- User completes guided business onboarding.
- Operator reviews lead sources, campaigns, approvals, suppression state, calls, meetings, and billing.
- Admin controls team access, workspace ownership, transactional account-email readiness, providers, command-center readiness, and compliance posture.

## Screens To Design

- Landing page first viewport and pricing route, including a dense plan-fit advisor that maps
  validation, founder-led launch, active campaign teams, and governed scale to the shared plan
  catalog without implying automatic billing, provider work, lead sourcing, or outreach.
- Public Resources hub and article pages for claim-safe education around approval-gated sales
  automation, Sales Blueprint planning, and outbound workspace decisions.
- Public segment solution pages for founders validating outbound, agencies running client pipeline,
  and SMB sales teams modernizing operations, each with fit signals, current workflow, guardrails,
  commercial path, and attributed CTAs into contact or get-started.
- Public sales-tool comparison page for high-intent buyers comparing CRMs, outreach sequencers,
  lead-list vendors, agencies, and generic AI agents against a governed workspace, with current
  truth boundaries and attributed CTAs into contact or get-started.
- Public AI sales automation platform page for high-intent buyers evaluating the full governed
  workflow across Sales Blueprint context, source evidence, approval-gated outreach, meeting
  conversion, revenue visibility, Telegram command posture, provider readiness, billing controls,
  audit evidence, and attributed CTAs into contact or get-started.
- Public AI lead generation software page for high-intent buyers evaluating source-channel
  planning, source evidence, dedupe/rejection review, approval-gated outreach handoff, meetings,
  plan/provider posture, and attributed CTAs into contact or get-started.
- Public AI outbound sales automation page for high-intent buyers evaluating sequence planning,
  channel-fit review, suppression checks, approval proposals, provider readiness, email/call
  handoff, Telegram observability, and attributed CTAs into contact or get-started.
- Public AI sales meeting scheduler page for high-intent buyers evaluating conversion queues,
  manual calendar handoff, meeting outcome capture, actual value capture, CRM/revenue export
  readiness, forecast review, Telegram observability, and attributed CTAs into contact or
  get-started.
- Public Telegram sales command center page for high-intent buyers evaluating safe status commands,
  operator briefs, sequence readiness, revenue forecast checks, provider/suppression visibility,
  policy previews, approval-gated pause proposals, audit evidence, and attributed CTAs into contact
  or get-started.
- Public AI sales ROI calculator for claim-safe revenue scenario modeling, software/support budget
  comparison, and conversion into contact, pricing, or workspace-start flows.
- Public AI Sales Blueprint Builder for claim-safe ICP/source/outreach readiness scoring,
  approval-gate planning, and conversion into contact or workspace-start flows.
- Public Integrations catalog for buyer-facing channel readiness across source discovery, email,
  voice, billing, webhooks, Telegram, AI workers, roadmap CRM/calendar/SMS, and prohibited claims.
- Public Contact / revenue-intake page with server-owned form submission, attribution fields,
  response status, email fallback, best-effort team notification, and explicit
  approval/provider-readiness boundaries.
- Authenticated dashboard with AI command center, action center, lead/campaign/call/meeting sections.
- Settings page with team administration, provider readiness, provider activation readiness, provider setup-review proposal controls, Telegram command and notification readiness/test controls, audit compliance readiness, and suppression/compliance controls.
- Sales Blueprint console for workspace business context, ICP, source channels, outreach channels,
  goals, targets, readiness gaps, and automation guardrails.
- Approval Inbox for proposed AI, Telegram, provider, campaign, and call actions with risk level,
  guardrails, expected effect, rollback plan, and approve/reject controls.
- Source Acquisition Readiness panel for planned lanes, source-run evidence, quality posture,
  provider mode/readiness, compliance handoff, source-provider governance gates, and production
  expansion blockers.
- Lead Source Evidence console for source-run quality score, provider mode, deduplication, evidence
  snippets, rejection reasons, compliance checks, freshness, and next action.
- Content Demand Engine for Sales Blueprint-informed SEO opportunities, keywords, source signals,
  lead-capture offers, publishing blockers, and claim guardrails.
- AI Worker Control Plane for worker registry, permissions, allowed/blocked tools, budget posture,
  plan-level proposal quota, plan-level AI dry-run execution budget, dry-run cost curves, budget-readiness advisory, execution-readiness dry-run harness, margin-readiness controls,
  execution ledger, approved dry-run result capture, and approval-gated task proposals.
- Future Telegram command-control setup screen with explicit security and approval gates.
- Integration Readiness admin console for deployment-side secrets, missing provider requirements,
  launch blockers, and safe next steps.

## Constraints

- Do not use real secrets, bearer tokens, vault keys, private media, or precise private metadata.
- Use sanitized screenshots, synthetic data, and explicit acceptance criteria.

## Acceptance Criteria

- Public pages must avoid unsupported full-autonomy claims.
- Public segment solution pages must use Stitch-aligned dense panels, visible status badges,
  workflow rows, guardrail rows, and commercial-path rows; they must avoid generic card walls,
  unsupported scraping/autonomy claims, and CTAs that lose segment attribution.
- Contact and get-started should show a compact "Solution segment context attached" panel when a
  buyer arrives from a segment page, preserving the segment without implying that live sourcing,
  outreach, provider work, or Telegram mutation has started.
- Public calculator pages must make assumptions visible, avoid guaranteed outcomes, and route
  buyers into reviewed workspace or managed-rollout next steps.
- Public blueprint builder pages must make ICP, targets, source channels, outreach channels,
  roadmap channels, and approval gates visible without implying that live lead scraping or outreach
  has started.
- Get-started must preserve attached pricing-fit, public calculator, comparison, segment,
  resource, AI sales automation platform, AI SDR, AI lead generation, AI outbound automation,
  AI sales meeting scheduler, Telegram sales command center, or blueprint context with a compact,
  claim-safe panel while still requiring normal account, plan, provider, and approval gates.
- Resource/article pages must read like practical operator education, not generic AI-generated
  marketing copy; each article should include clear takeaways, operational sections, and a CTA into
  the workspace.
- Public integration pages must distinguish configurable, guarded beta, roadmap, and prohibited
  capabilities with dense rows, status badges, setup requirements, and guardrails.
- Public contact/intake forms must capture enough context for routing without looking like a
  generic support form: intent, company, lead goal, timeline, budget posture, channels, goals, and
  rollout blockers. Anonymous intake must keep spam controls active through shared validation,
  hidden honeypot handling, and route-specific rate limits before notifying operators.
- Dashboard must show what is available, beta, roadmap, or blocked.
- Dashboard first viewport should behave like an operator cockpit: compact workspace metrics,
  tested readiness signals, real section anchors, and flat Stitch-aligned panels instead of a
  marketing-style hero.
- Dashboard AI command center should include a deterministic operator brief: posture, five compact
  metrics, evidence-linked next actions, and guardrails without implying that AI has executed work.
- Dashboard AI command center should include policy explanations for read-only, allowed,
  approval-gated, and blocked command intents, including role, email-verification, provider,
  Telegram, AI-worker, and evidence signals before any future command can mutate state.
- Dashboard AI command center should include compact command dry runs that show command text,
  inferred intent, execution mode, requested-mutation posture, guardrails, and safe next step
  without implying that previewing a command changes workspace state.
- Dashboard command dry runs may expose a compact "Create proposal" control only for
  approval-gated previews; read-only and blocked previews should not look executable.
- Dashboard outreach workflow should include a compact sequence-plan panel before campaign
  creation, showing channel order, candidate leads, sample operator copy, channel-fit blockers,
  guardrails, and next actions without any send/call/social/SMS execution affordance.
- Dashboard conversion workflow should include a compact deterministic brief for meeting
  candidates, open meeting outcomes, call review blockers, closed-won state, lead focus, evidence
  links, and guardrails without implying autonomous scheduling, outreach, or guaranteed conversion.
- Dashboard conversion workflow should include a compact work queue that prioritizes call review
  blockers, overdue meeting outcomes, upcoming meeting prep, handoff candidates, missing contact
  data, and missing closed-value capture with status pills, due labels, and suggested operator
  actions.
- Dashboard revenue forecast should use a dense operational panel for weighted pipeline, target
  gap, stage confidence, Sales Blueprint assumptions, next actions, and forecast guardrails without
  implying guaranteed revenue.
- Dashboard revenue workflow should include a compact manual revenue reconciliation export control
  with completed-meeting value, missing-value warnings, won-lead-without-meeting warnings,
  subscription context, and CSV download language that avoids live accounting sync, invoice
  matching, payment settlement, tax advice, or revenue-recognition automation claims.
- Dashboard action center should include a compact plan growth readiness panel with lead-usage,
  dispatch quota, voice quota, provider-budget, included-channel, Sales Blueprint readiness, recommended-plan, and CTA rows;
  it must stay read-only and avoid implying automatic billing changes, provider procurement, or
  guaranteed revenue lift.
- Dashboard action center should include a managed-support fit panel that recommends Setup Sprint,
  Operator Assist, or Managed RevOps from plan pressure, approval load, conversion work,
  operational health, and AI-worker review posture, while keeping software subscription, provider
  costs, and managed-service scope commercially separate.
- Dashboard action center should include managed-service readiness with compact scope/SOW/pricing
  owner, customer handoff, provider-cost boundary, support capacity, subscription, approval,
  conversion, and AI-worker controls before a managed rollout looks sellable or deliverable.
- Meeting outcome forms should expose compact actual contract value capture for completed meetings,
  and revenue panels should distinguish recorded closed value from modeled pipeline value.
- Meeting cards should expose compact manual calendar handoff controls for ready meetings, using
  small icon+text links for Google, Outlook, and ICS export while clearly avoiding writable
  calendar-provider sync or automated reminder claims.
- Dashboard conversion workflow should expose a compact manual CRM handoff export control with
  record counts, missing-contact warnings, closed-won value, and CSV download language that avoids
  live CRM sync or external mutation claims.
- Dashboard revenue workflow should expose a compact conversion integration readiness panel for CRM
  sync, calendar sync, accounting sync, invoice matching, payment reconciliation, field mapping,
  value capture, and policy blockers without implying live external mutation.
- Suppression/unsubscribe controls must be easy to inspect before live outreach.
- High-risk actions must visually require approval, verified email, and audit trace.
- Dashboard action center should include compact recent audit evidence with severity pills, timestamps,
  request/proposal/provider evidence chips, and no raw request body, IP, user-agent, webhook body,
  or provider payload exposure.
- Dashboard audit evidence should expose a compact manual JSON export control for the sanitized
  hash-chain package with retention-window posture, without implying SIEM streaming, destructive
  retention deletion jobs, legal discovery, or compliance-grade archival.
- Dashboard operational health should summarize dispatch review blockers, provider/webhook issues,
  approval queue posture, and API failures from recent sanitized evidence, while clearly avoiding
  claims of full incident response, SIEM streaming, destructive retention deletion jobs, provider
  retries, or production alerting.
- Mobile and desktop layouts must stay dense, readable, and free of overlapping text.
- Provider setup UI must never ask users to paste raw secrets into browser forms; it should show
  deployment-side requirements, missing secret names, webhook verification posture, Telegram
  activation state, account lifecycle email readiness, setup owners, guardrails, and launch blockers
  only.
- Provider activation readiness should show secret inventory, credential-vault readiness, rotation
  cadence, per-workspace activation policy, rollback controls, webhook verification, and provider
  activation states without offering browser secret entry or implying automated vault writes.
- Provider cost-curve readiness should show provider-cost budget usage, configured email/voice
  unit costs, configured source-run unit costs, mock source-provider activation posture,
  AI-worker dry-run result cost curves, review-only social boundaries, and channel quota maturity
  without implying billing-plan changes, live external AI execution, or universal live scraping.
- Outbound channel readiness should stay compact and operational: email/call live-dispatch gates,
  review-only social posture, SMS roadmap blockers, quota/provider/cost controls, and explicit
  no-SMS/no-social-mutation boundaries before any channel scale claim.
- Source acquisition readiness should expose provider terms, rate-limit, consent, invoice
  reconciliation, and source-quality governance gates as operational checks before live provider
  expansion, without implying universal scraping or automated external source activation.
- Settings incident readiness should use a compact operations table for production probe variables,
  alert routing, triage evidence, and escalation ownership, and must not imply mature pager-backed
  operations, SIEM, external observability, or formal incident response unless those controls exist.
- Sales Blueprint UI should be dense and operational: structured form fields, readiness score,
  compact gap list, clear save/generate-plan actions, and no unsupported autonomy claims.
- Approval Inbox UI should make pending state, risk level, reviewer eligibility, audit posture,
  and rollback path visible before any high-impact action can mutate workspace state.
- Source Acquisition Readiness UI should be compact and scan-first: top-line posture, source lane
  table, evidence/compliance counts, provider mode/readiness, and visible blockers for production
  source expansion.
- Lead Source Evidence UI should be dense and table-like, with compact status pills, evidence
  snippets, rejection reason groups, and clear distinction between mock/configured providers.
- Content Demand Engine UI should stay table-like and operational: opportunity rows, keywords,
  source signals, lead-capture offers, priority, review status, blockers, and visible guardrails
  without implying autonomous publishing.
- AI Worker Control Plane UI should use a three-pane registry, execution ledger, and inspector
  layout with clear approval-gated language, plan-level dry-run budget posture, margin/readiness controls, and no implied autonomous
  execution.
- Integration catalog UI should use a matrix/table pattern rather than a marketing card wall, and
  should make Telegram and LinkedIn boundaries visible without hiding them in footnotes.
- Telegram setup UI should show `/brief`, `/sequence`, and `/forecast` as read-only observability
  commands and keep them visually separate from `/pause`, which creates an approval proposal rather
  than mutating outreach.
- Telegram readiness UI should show deployment secrets, chat binding, webhook verification, command
  allowlist, approval proposal bridge, direct-mutation boundaries, rate-limit durability, and recent
  command audit evidence before the surface looks launch-ready.
- Telegram notification readiness UI should show notification enablement, deployment-owned target-chat
  secret matching, policy, quiet hours, escalation owner, delivery rate cap, delivery audit,
  summary-only notification type coverage, and owner/admin test-delivery state before outbound chat
  alerts look production-ready.
- Telegram setup UI should state that deterministic natural-language aliases use the same
  allowlist and audit trail as slash commands, without implying open-ended AI command execution.
- Contact intake UI should use compact form groups, visible success/error states, and a clear email
  fallback; it must not imply that submitting the form triggers live lead scraping or outreach.
  Provider readiness should show whether the team-notification recipient is configured.

## Notes For Open Design

- Favor a quiet SaaS operations UI over a decorative marketing surface.
- Use compact status pills, tables/lists, segmented sections, and strong empty/error states.
- Keep cards for repeated records only; avoid nested cards.
- Stitch provider readiness screen: `projects/708035015202825549/screens/3ed6ecbd4c2649c9bb0aefd7fe7aef3e`.
- Stitch provider readiness project `projects/708035015202825549` remains the design reference for
  the public Integrations catalog: quiet operational layout, compact rectangular status badges, and
  explicit launch blockers instead of broad automation claims.
- Stitch Sales Blueprint project: `projects/16679974810768326179`. Screen generation timed out
  in-tool, so the prompt and this brief are the current design source until Stitch returns a screen.
- Stitch Approval Inbox project: `projects/816347061179407712`; screen
  `projects/816347061179407712/screens/f070d50f77c34c3bbd5e1cbfd6a3728b`.
- Stitch Lead Source Evidence project: `projects/16437512492899712316`; screen
  `projects/16437512492899712316/screens/371aae65a9ac432c87837dfd21475a52`.
- Stitch AI Worker Control Plane project: `projects/8901404158971870827`. The generated concept
  uses a dense registry, execution ledger, and guarded inspector; the Stitch screen list did not
  return a stable screen id in-tool, so the project id is the current design artifact reference.
- Public segment solution pages should borrow that Stitch project's quiet operational treatment:
  Inter typography, slate/emerald/amber status semantics, low-shadow bordered panels, and explicit
  approval-gated language even on SEO-focused routes.
