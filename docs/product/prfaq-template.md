# Sales AaaS Public Beta PRFAQ

## Press Release

### Headline
Sales AaaS helps service businesses and agencies launch a safer, approval-gated sales operating system with onboarding, billing, lead workflows, and AI-assisted campaign foundations in one workspace.

### Problem
Small sales teams and agencies lose time and money across disconnected onboarding, lead capture, billing, and outreach workflows. Most “AI sales” tools over-promise autonomy before the basic tenant, billing, and approval controls are trustworthy.

### Solution
Sales AaaS gives a workspace owner one place to:
- onboard the business profile
- create a tenant and workspace
- choose a plan and pay with Stripe or Razorpay
- review dashboard health and usage
- manage leads, campaigns, and approval-gated outbound actions

### Customer Benefit
- Faster time to first workspace and first configured campaign
- Safer adoption of AI-assisted sales workflows
- Better billing clarity for global and India-based buyers
- Clearer audit trail around sensitive actions

### Why This Wins
This product wins by being operationally honest. It prioritizes tenant-safe billing, auditability, and approval gates before promising fully autonomous execution.

## FAQ

### Customer
- Target users:
  - owner-led service businesses
  - growth agencies
  - small outbound sales teams that need a shared workspace before they need deep enterprise automation
- Critical user journey:
  - landing page to get-started to authenticated workspace to plan selection to billing to dashboard visibility
- Likely adoption drivers:
  - faster setup
  - payment support in both Stripe and Razorpay regions
  - safe starting point for AI-assisted outreach

### Business
- Primary metrics:
  - get-started completion rate
  - signup-to-workspace activation rate
  - trial-to-paid conversion
  - weekly active workspace owners
- Revenue model:
  - subscription SaaS with Trial, Starter, Professional, and Elite plans
- Retention drivers:
  - dashboard usefulness
  - billing transparency
  - lead and campaign continuity
  - future provider integrations that remove manual work

### Engineering
- Top technical risks:
  - auth and session correctness across web and API
  - billing checkout and webhook reconciliation correctness
  - demo-storage and Postgres behavior drifting apart
  - contract mismatches between shared schemas and runtime flows
- Top operational risks:
  - missing production observability
  - manual deploy discipline not yet codified into real release automation
  - provider credentials or dummy defaults leaking into unsafe environments
- What stays intentionally simple in `v1`:
  - a single monorepo
  - one API service
  - one primary Postgres schema
  - approval-gated automation instead of full autonomy
- Future seams that should exist:
  - usage metering and plan enforcement
  - stronger provider adapters
  - workspace/team controls
  - enterprise audit and compliance features

### Launch
- In scope for the current public beta:
  - onboarding, workspace creation, pricing, checkout, billing portal, dashboard foundations, lead/campaign primitives
- Explicitly out of scope:
  - mature provider integrations across all channels
  - fully autonomous outreach
  - full enterprise operations tooling
  - polished team management and password recovery flows
- Evidence required before more investment:
  - sustained activation from get-started to dashboard
  - successful paid conversions
  - low billing-support burden
  - low incident rate on auth and billing paths
