# Critical User Journeys

## 1. Visitor -> signup -> onboarding -> workspace -> billing -> dashboard

### User and trigger

- User: founder, operator, or agency lead
- Trigger: clicks `Get Started` from the public site

### Steps

1. Open `/get-started`
2. Create account or continue with an existing session
3. Confirm email when required for protected follow-up actions
4. Enter business profile, audience, goals, channels, and constraints
5. Land in a valid workspace scope
6. Choose a plan or continue in the free workspace
7. Reach `/dashboard`

### Completion condition

The user reaches a real workspace with a trustworthy next step, not a dead end.

### Main failure modes

- auth/session mismatch
- email verification state confusion
- workspace scope ambiguity
- onboarding context loss
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

1. Provide business profile and target audience context
2. Review extracted goals, channels, and constraints
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

1. Create or review campaign draft
2. Check policy and approval requirements
3. Approve the first or risky action
4. Dispatch through configured or mock provider path
5. Inspect activity record, status, and provider result

### Completion condition

An approved action is dispatched with visible audit and status evidence.

### Main failure modes

- risky action bypasses approval
- provider path is unavailable
- activity state is unclear
- audit trail is missing

### Signals

- approval-required actions blocked until approval
- provider dispatch success
- activity status correctness

## 4. Outreach -> meeting -> conversion follow-through

### User and trigger

- User: operator or sales owner
- Trigger: a contacted lead needs follow-up, scheduling, or disposition

### Steps

1. Review activity and lead state
2. Schedule or update meeting
3. Record call summary or meeting outcome
4. Update conversion status

### Completion condition

The workspace has a visible record of the conversion step, not just the top-of-funnel action.

### Main failure modes

- no meeting handoff
- call or meeting state drift
- unclear owner
- lead state does not reflect real conversion outcome

### Signals

- meeting creation rate
- lead-to-meeting conversion
- disposition completeness

## 5. Owner manages billing and trust-sensitive account state

### User and trigger

- User: workspace owner
- Trigger: needs to upgrade, cancel, review usage, or recover account access

### Steps

1. Open billing or account lifecycle page
2. Verify email if required
3. Review plan, usage, and payment history
4. Change plan or schedule cancellation
5. Request password reset or lifecycle email if access is at risk

### Completion condition

The owner can trust subscription and account state without support intervention.

### Main failure modes

- billing state drift
- incorrect tenant scope in billing
- lifecycle email failure
- cancellation status confusion

### Signals

- trial-to-paid conversion
- billing support burden
- password-reset success
- verified billing action success
