# Sales AaaS Platform

Workspace-based foundation for a reviewable, approval-aware sales SaaS + AaaS platform with:

- Next.js product surface
- Hono API
- PostgreSQL + Drizzle
- shared domain contracts
- multi-workspace tenancy foundations
- billing and guarded provider workflow foundations
- documentation for product truth, compliance posture, and release operations

## Local setup

1. Copy `.env.example` to `.env`.
   Default local DB: `sales_aaas` on port `5434`.
2. Start Postgres:

```bash
npm run db:up
```

3. Install dependencies:

```bash
npm install
```

4. Start the API:

```bash
npm run dev:api
```

5. Start the web app:

```bash
npm run dev:web
```

6. Apply the schema migration:

```bash
npm run db:migrate
```

## Current scope

The current repo supports a real production-foundation tranche:

- monorepo structure with shared contracts and migrations
- multi-tenant organization and workspace model
- account lifecycle foundations:
  - credentials auth
  - email verification
  - password reset
  - workspace selection
  - initial workspace invite acceptance
- billing foundations:
  - Stripe and Razorpay checkout paths
  - billing portal data
  - payment history and usage visibility
- dashboard, lead, campaign, meeting, and call workflow primitives
- approval-aware live outreach and voice dispatch foundations
- Cloudflare web/API/workflow deployment scaffolding
- source-backed product, compliance, monetization, and ops documentation in [`docs/`](docs/README.md)

## Still ahead

The platform is not yet feature-complete production SaaS. Major work still ahead includes:

- deeper org/workspace administration polish beyond the current owner-only transfer and last-owner protection controls
- richer settings and provider configuration surfaces
- deeper commercial entitlement breadth across live AI-worker execution, per-channel quotas, and provider-specific cost curves
- horizontally safe production rate limiting and abuse controls
- content / SEO workflow as a delivered product capability
- broader channel expansion beyond guarded email and voice foundations

## Product truth standard

The repo follows an operationally honest posture:

- long-term vision: end-to-end AI-assisted sales automation
- current truth: a reviewable, approval-gated revenue execution platform
- no blanket global-compliance or full-autonomy claims without product and policy support
