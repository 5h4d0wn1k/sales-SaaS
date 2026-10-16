# Critical User Journeys

## 1. Visitor -> signup -> onboarding -> workspace -> billing -> dashboard

### User and trigger

- User: founder, operator, or agency lead
- Trigger: clicks `Get Started` from the public site

### Steps

1. Open `/get-started`
2. Preserve public-site acquisition context when arriving from pricing, comparison, ROI, Sales Blueprint, resource, AI sales automation platform, AI SDR, AI lead generation, AI outbound automation, AI sales meeting scheduler, Telegram sales command center, or solution-segment CTAs
3. Review the get-started Sales Blueprint checkpoint and either keep attached context, open the public builder, or request reviewed rollout support
4. Create account or continue with an existing session
5. Confirm email when required for protected follow-up actions
6. Enter or confirm the workspace Sales Blueprint: business profile, audience, goals, channels, constraints, targets, and guardrails
7. Land in a valid workspace scope
8. Choose a plan or continue in the free workspace
9. Reach `/dashboard` with attached activation context visible when the public-site journey supplied it
10. Review any attached Settings blueprint prefill, complete missing offer and voice details, then save or update the workspace Sales Blueprint before provider setup, sourcing, outreach, billing changes, or Telegram-controlled mutation

### Completion condition

The user reaches a real workspace with a trustworthy next step, not a dead end.

### Main failure modes

- auth/session mismatch
- email verification state confusion
- workspace scope ambiguity
- onboarding, pricing-fit, or rollout-intent context loss
- billing redirect confusion

### Signals

- signup-to-workspace activation
- onboarding completion
- dashboard first-load success

## 2. Business onboarding -> lead plan -> source run

### User and trigger

- User: workspace owner or operator
- Trigger: wants qualified leads for a specific business goal

### Steps

1. Provide or update the workspace Sales Blueprint
2. Review ICP, goals, source channels, outreach channels, constraints, and readiness gaps
3. Generate or confirm a source plan
4. Run source discovery through supported adapters
5. Review accepted and rejected lead output

### Completion condition

The user has a lead plan and a lead set that reflect the business context and can be reviewed before outreach begins.

### Main failure modes

- poor context capture
- low-fit leads
- unclear source rationale
- no visibility into why records were accepted or rejected

### Signals

- time to first lead plan
- accepted-lead rate
- operator review satisfaction

## 3. Campaign review -> approval -> dispatch

### User and trigger

- User: workspace owner or operator
- Trigger: wants to turn leads into real outbound activity

### Steps

1. Review the deterministic outreach sequence plan for channel order, candidate leads, sample copy, and channel blockers
2. Create or review campaign draft
3. Check policy and approval requirements
4. Review the action proposal with risk level, guardrails, expected effect, and rollback plan
5. Approve or reject the first or risky action
6. Dispatch through configured or mock provider path after approval
7. Inspect activity record, status, provider result, and audit evidence

### Completion condition

An approved action is dispatched with visible audit and status evidence.

### Main failure modes

- risky action bypasses approval
- sequence plan is mistaken for an automatic send, call, social action, SMS, scraping run, or guaranteed response
- approval proposal lacks enough context for a safe decision
- provider path is unavailable
- activity state is unclear
- audit trail is missing

### Signals

- approval-required actions blocked until approval
- sequence-plan review before campaign creation
- approval review records reviewer, note, and audit linkage
- provider dispatch success
- activity status correctness

## 4. Outreach -> meeting -> conversion follow-through

### User and trigger

- User: operator or sales owner
- Trigger: a contacted lead needs follow-up, scheduling, or disposition

### Steps

1. Review activity and lead state
2. Review the conversion work queue for call review blockers, overdue meeting outcomes, upcoming meeting prep, handoff candidates, missing contact data, and missing closed-value capture
3. Schedule a manual meeting from an eligible lead
4. Add the scheduled meeting to the operator's calendar through Google, Outlook, Office 365, or ICS handoff when needed
5. Record call summary, meeting outcome, and actual contract value when a meeting closes
6. Update conversion status through the meeting outcome: completed becomes won, canceled becomes lost
7. Download the manual CRM handoff export when the operator is ready to import or reconcile pipeline state
8. Download the manual revenue reconciliation export when completed-meeting value is ready for accounting review
9. Review deterministic revenue forecast coverage and target-gap next actions before increasing source or outreach volume

### Completion condition

The workspace has a visible, prioritized conversion queue, an operator calendar handoff for scheduled meetings, a manual CRM export for reviewed pipeline state, a manual revenue reconciliation export for accounting handoff review, a record of the conversion step, and a claim-safe forecast of how current pipeline compares with Sales Blueprint targets.

### Main failure modes

- no meeting handoff from eligible leads
- call or meeting state drift
- unclear owner
- calendar handoff is missing, invalid, or mistaken for automated calendar-provider sync
- public AI sales meeting scheduler context is lost or mistaken for live calendar sync, automated reminder delivery, or external CRM/accounting mutation
- CRM handoff is stale, missing contact fields, or mistaken for live CRM sync
- revenue reconciliation export is stale, missing completed-meeting values, or mistaken for live accounting sync, invoice matching, payment settlement, tax advice, or revenue-recognition automation
- lead state or actual value does not reflect real conversion outcome
- overdue meeting outcomes or missing contract values are not visible to operators
- forecast implies guaranteed revenue instead of guarded planning guidance

### Signals

- meeting creation rate
- calendar handoff download or provider-link usage
- CRM export download count
- revenue reconciliation export download count
- lead-to-meeting conversion
- conversion queue backlog by urgency
- disposition completeness
- actual closed value capture rate
- missing closed-value reconciliation count
- forecast target coverage
- weighted pipeline gap

## 5. Owner manages billing and trust-sensitive account state

### User and trigger

- User: workspace owner
- Trigger: needs to upgrade, cancel, review usage, or recover account access

### Steps

1. Open billing or account lifecycle page
2. Verify email if required
3. Review plan, usage, provider-cost budget, channel fit, and payment history
4. Review proactive plan growth readiness before a lead-volume, provider-budget, or channel entitlement block interrupts work
5. Review recent sanitized audit evidence for sensitive requests, proposal reviews, provider callbacks, and command activity
6. Download the manual hash-chain audit JSON when evidence needs to be shared with an operator or reviewer
7. Change plan or schedule cancellation
8. Request password reset or lifecycle email if access is at risk

### Completion condition

The owner can trust subscription, account, and recent sensitive-action evidence without support intervention.

### Main failure modes

- billing state drift
- incorrect tenant scope in billing
- plan readiness is mistaken for automatic billing change, guaranteed revenue, or provider procurement
- audit evidence is missing, too raw for safe operator display, lacks hash-chain export, or is mistaken for SIEM, retention automation, immutable archival, legal discovery, or compliance-grade export
- lifecycle email failure
- cancellation status confusion

### Signals

- trial-to-paid conversion
- upgrade CTA review from plan growth readiness
- billing support burden
- recent audit panel visibility
- audit JSON export download count
- password-reset success
- verified billing action success

## 6. Visitor chooses segment solution -> starts workspace or rollout review

### User and trigger

- User: founder, agency buyer, or SMB sales lead
- Trigger: lands from organic search on a segment-specific AI sales workspace query

### Steps

1. Open `/solutions/founders-validating-outbound`, `/solutions/agencies-running-client-pipeline`, or `/solutions/smb-sales-teams-modernizing-ops`
2. Review the segment fit signals, current beta workflow, guardrails, and commercial path
3. Choose the free workspace path, Sales Blueprint builder, trust posture, or reviewed rollout contact path
4. Preserve attribution through `utm_source=solution_segment` when moving into contact or get-started

### Completion condition

The buyer understands what salesxgrowth can support today, what remains guarded or roadmap, and reaches a next step that can turn search intent into workspace activation or managed-service revenue.

### Main failure modes

- segment page implies universal scraping, guaranteed revenue, or direct Telegram-controlled outreach
- CTA does not route to contact or workspace start with attribution
- sitemap omits static segment pages
- page reads like generic marketing instead of a concrete operating workflow

### Signals

- segment-page organic visits
- segment-to-workspace conversion
- segment-to-contact conversion
- managed rollout requests with segment attribution

## 7. Visitor models ROI -> requests reviewed rollout

### User and trigger

- User: founder, operator, or agency buyer
- Trigger: wants to understand whether a governed sales workspace can justify software or managed rollout spend

### Steps

1. Open `/roi-calculator`
2. Adjust lead volume, qualification, meeting, close-rate, contract-value, budget, and time-savings assumptions
3. Review modeled revenue, efficiency value, net impact, ROI multiple, and payback period
4. Compare plans, request a managed rollout review, or start a workspace with calculator context attached

### Completion condition

The buyer has a claim-safe scenario and a clear next step into pricing, contact, or workspace start, with modeled assumptions available to the intake reviewer or signup flow when they request rollout help.

### Main failure modes

- calculator implies guaranteed revenue or meetings
- assumptions are hidden or hard to change
- CTA does not route to a revenue-intake path
- calculator is absent from sitemap/navigation

### Signals

- calculator visits from organic search
- calculator-to-contact conversion
- calculator-to-pricing conversion
- managed rollout requests with complete context

## 8. Visitor builds Sales Blueprint -> requests reviewed plan

### User and trigger

- User: founder, operator, agency buyer, or SMB sales lead
- Trigger: wants to understand whether their ICP, lead targets, source channels, outreach channels, and guardrails are ready for a governed sales workflow

### Steps

1. Open `/sales-blueprint`
2. Select the operating segment and enter industry, target audience, regions, lead target, meeting target, contract value, source channels, outreach channels, and constraints
3. Review readiness score, source plan posture, approval gates, and missing context
4. Request a blueprint review with context attached or start a workspace with blueprint context preserved

### Completion condition

The buyer has a claim-safe readiness score and a clear next step into contact or workspace setup, with blueprint assumptions available to the intake reviewer or signup flow when they ask for help.

### Main failure modes

- blueprint implies live scraping or outreach has started
- roadmap channels are not visibly guarded
- missing constraints do not reduce readiness
- CTA does not carry context into intake

### Signals

- blueprint page visits from organic search
- blueprint-to-contact conversion
- blueprint-to-workspace conversion
- reviewed plans with complete context
