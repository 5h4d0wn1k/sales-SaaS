# Sales AaaS Platform

Local-first foundation for an autonomous sales platform with:

- Next.js frontend
- Hono API
- PostgreSQL + Drizzle
- Shared domain contracts
- Basic policy logic for approval-gated autonomous outreach

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

This bootstrap implements the platform foundation:

- monorepo structure
- core SaaS domain schema
- shared typed contracts
- tenant, billing, and campaign policy primitives
- dashboard shell for the product surface

It now includes Drizzle migration assets and a storage layer that can use Postgres when the schema is applied.

It does not yet implement provider integrations, full auth, or real agent execution.
