# Architecture Decision Record: Monorepo foundation for Sales AaaS

- Status: Accepted
- Date: 2026-05-03
- Owners: @5h4d0wn1k

## Context

The platform needs to ship a tenant-safe SaaS foundation quickly while keeping auth, billing, onboarding, and approval logic consistent between web and API. The team size is small, the product is still in public-beta shaping, and billing must support both global and India-first workflows.

## Requirements

- Shared domain contracts between UI and API
- Multi-tenant organization and workspace model
- Subscription billing with Stripe and Razorpay
- Approval-gated AI-assisted workflows
- Auditability for sensitive changes
- Low operational overhead for an early-stage product

## Options Considered

1. Monorepo with Next.js web, Hono API, shared packages, and Postgres
2. Separate repos for web, API, and shared contracts
3. Single Next.js app with API routes and no separate Hono service

## Decision

Use a monorepo with:
- `apps/web` for the customer-facing product surface
- `apps/api` for API, auth, billing, and webhook handling
- `packages/shared` for contracts, pricing, and policy logic
- `packages/database` for Drizzle schema and migrations
- a storage abstraction that can support demo mode and Postgres mode while the product hardens

## Why

- Shared schemas reduce drift between UI and API for onboarding, billing, and dashboard payloads.
- A separate Hono API keeps billing, webhooks, and future provider adapters isolated from the UI runtime.
- The monorepo keeps early-stage iteration fast without cross-repo release coordination.
- Postgres plus Drizzle gives a durable path to auditability and multi-tenant correctness.

## Tradeoffs

- The storage abstraction can drift if demo-mode behavior is not tested against Postgres-backed behavior.
- A single repo means broad blast radius when shared packages change.
- Operational maturity is still manual because deploy policy, observability, and on-call are not yet deeply automated.

## Rollout

1. Keep shared contracts as the source of truth for cross-boundary data.
2. Route new runtime-critical features through the API instead of embedding logic only in the web app.
3. Treat schema and billing changes as compatibility-sensitive.
4. Increase provider integrations only after auth, billing, and dashboard foundations are stable.

## Follow-up

- Re-evaluate when:
  - provider integrations become operationally complex
  - dashboard and API latency regress under real tenant load
  - team size makes ownership boundaries a bottleneck
  - enterprise isolation or compliance needs justify service extraction
