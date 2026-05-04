# Critical User Journeys

## 1. Visitor to authenticated workspace

### User and Trigger
- User: owner or first operator for a service business or agency
- Trigger: clicks `Get Started` from the marketing site

### Steps
1. Visit `/get-started`
2. Complete auth or continue with an existing session
3. Enter onboarding details
4. Finalize onboarding session
5. Land in a workspace context that can continue to pricing or dashboard

### Success Definition
- The user gets an authenticated workspace context without confusion or broken redirects.

### Failure Modes
- auth callback fails
- workspace or organization is not created
- onboarding transcript is lost
- session exists but the wrong step is shown

### Signals
- Activation: get-started completion rate
- Availability target: 99.5%
- Latency: p95 under 2.5s for page responses, excluding third-party auth redirects

### Dependencies
- NextAuth
- API onboarding session routes
- database user, organization, and workspace records

## 2. Trial to paid conversion

### User and Trigger
- User: workspace owner
- Trigger: selects Starter, Professional, or Elite plan

### Steps
1. View `/pricing` or `/billing`
2. Select a plan
3. Start Stripe or Razorpay checkout
4. Return from provider
5. Receive subscription state in billing portal and dashboard

### Success Definition
- The chosen plan becomes the workspace subscription without duplicate or missing payment state.

### Failure Modes
- invalid plan key
- customer record not created
- checkout session fails
- webhook signature verification fails
- provider event arrives twice or out of order

### Signals
- Trial-to-paid conversion
- Billing webhook processing success
- Availability target: 99.9%
- Correctness target: verified webhook processed once within 5 minutes

### Dependencies
- pricing contract in `packages/shared`
- billing routes
- Stripe
- Razorpay
- database subscriptions, payments, usage events, and organizations

## 3. Owner opens dashboard and sees trustworthy state

### User and Trigger
- User: authenticated workspace owner or member
- Trigger: loads `/dashboard`

### Steps
1. Web app requests dashboard data
2. API resolves tenant context and storage mode
3. User sees metrics, plan, onboarding state, and modules

### Success Definition
- The user sees the correct workspace state, current plan, and action items without stale or cross-tenant data.

### Failure Modes
- session not forwarded correctly
- dashboard data shape mismatches shared contract
- demo-store and Postgres-backed responses diverge
- no clear error state when data load fails

### Signals
- Dashboard success rate
- Availability target: 99.9%
- Latency target: p95 under 500ms on `GET /v1/dashboard`

### Dependencies
- auth/session callback logic
- API dashboard route
- storage abstraction
- shared dashboard response schema

## 4. Lead and campaign approval-gated execution

### User and Trigger
- User: owner or operator
- Trigger: creates leads, campaigns, or outbound actions

### Steps
1. Create or import a lead
2. Build a campaign
3. Evaluate policy
4. Require explicit approval for risky or first outbound actions
5. Dispatch through configured or mock providers

### Success Definition
- No risky outbound action happens without the expected approval path and audit trace.

### Failure Modes
- policy bypass
- provider dispatch without approval
- activity or call state not recorded
- audit event missing for a sensitive mutation

### Signals
- Policy-evaluation success rate
- Approval-required actions never dispatched automatically without approval
- Availability target: 99.5%

### Dependencies
- shared policy logic
- lead and campaign routes
- provider adapters
- audit log middleware

## 5. Provider webhook reconciliation

### User and Trigger
- User: internal operations and indirectly the paying customer
- Trigger: Stripe, Razorpay, Resend, or Twilio posts a callback

### Steps
1. API receives webhook
2. Signature is verified
3. Provider event is recorded
4. Business state is updated idempotently
5. Result appears in billing or activity state

### Success Definition
- Verified events are processed safely, duplicates do not corrupt state, and invalid signatures do not mutate data.

### Failure Modes
- signature verification broken
- duplicate event replays change state twice
- event recorded but not applied
- provider payload changes break parsing silently

### Signals
- Verified webhook success rate
- Invalid webhook rejection rate
- Correctness target: exactly-once effective state transition for duplicate-safe events

### Dependencies
- webhook verification helpers
- billing routes
- provider event storage
- payment and subscription tables
