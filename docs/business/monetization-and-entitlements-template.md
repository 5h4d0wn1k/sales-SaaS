# Monetization and Entitlements Review

## Revenue Model

- Primary model:
  - subscription SaaS
- Geo-aware payment support:
  - Stripe for global card-first flows
  - Razorpay for India-first checkout flows
- Likely future expansion:
  - enterprise setup fees
  - premium provider integrations
  - AI-assisted workflow add-ons

## Pricing Unit

- Workspace subscription is the primary billable unit
- Usage and seat limits are secondary control points

## Current Plan Boundaries

- `free`
  - 14-day trial
  - 100 leads
  - 1 seat
- `starter`
  - $49 / INR 3999
  - 1,000 leads per month
  - 3 seats
- `pro`
  - $99 / INR 7999
  - 5,000 leads per month
  - 10 seats
- `elite`
  - $249 / INR 19999
  - 20,000 leads per month
  - effectively unlimited seats

## Entitlements

- Gated by plan today:
  - lead volume
  - seat count
  - support level
  - AI depth and advanced integrations in roadmap terms
- Hard limits:
  - lead usage caps
  - seats
- Soft or future limits:
  - advanced workflow automation
  - custom webhooks
  - whitelabeling and on-premise options

## Metering

- Usage events that must stay trustworthy:
  - lead creation/import
  - billing state changes
  - subscription transitions
  - future AI or provider-usage events
- Requirements:
  - idempotent billing webhook application
  - auditable subscription transitions
  - tenant-safe aggregation by organization

## Customer Controls

- Billing portal visibility
- plan visibility on dashboard
- future quota visibility by plan
- audit trail for sensitive changes

## Expansion Hooks

- premium provider integrations
- advanced AI personalization
- team and admin workflows
- enterprise-grade governance and reporting

## Engineering Risks

- Dummy provider defaults creating unsafe checkout behavior
- Incorrect webhook reconciliation causing subscription drift
- Usage enforcement lagging behind pricing promises
- High-cost provider or AI workflows eroding margin without metering
