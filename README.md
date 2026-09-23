# Sales & AaaS Platform

Workspace-based foundation for a reviewable, approval-aware sales SaaS + AI-assisted (AaaS)
platform — Next.js product surface, Hono API, PostgreSQL + Drizzle, shared domain contracts, and
multi-workspace tenancy, billing, and deployment foundations.

![CI](https://github.com/5h4d0wn1k/sales-SaaS/actions/workflows/ci.yml/badge.svg)
![GitHub stars](https://img.shields.io/github/stars/5h4d0wn1k/sales-SaaS)
![GitHub last commit](https://img.shields.io/github/last-commit/5h4d0wn1k/sales-SaaS)
![GitHub issues](https://img.shields.io/github/issues/5h4d0wn1k/sales-SaaS)

## Why

Sales teams run on revenue execution: outreach, calls, meetings, and the approvals that gate them.
This platform is built to be *operationally honest* — long-term vision is end-to-end AI-assisted
sales automation, current truth is a reviewable, approval-gated revenue execution platform with
deliberate guardrails, no blanket autonomy and no empty compliance claims. A monorepo with shared,
tested packages keeps product, compliance, and release truth in one source.

## Features

- **Monorepo** — npm workspaces (`apps/*`, `packages/*`) with shared contracts and migrations.
- **Multi-tenant foundations** — organization and workspace model with account lifecycle:
  credentials auth, email verification, password reset, workspace selection, and invite acceptance.
- **Billing foundations** — Stripe and Razorpay checkout paths, billing-portal data, payment
  history, and usage visibility.
- **Sales workflows** — dashboard, lead, campaign, meeting, and call primitives with approval-aware
  live outreach and voice-dispatch foundations.
- **Cloudflare deployment scaffolding** — web, API, and workflow runners with staging/production
  targets (wrangler configs per app).

## Quickstart

Prerequisites: Node.js 20+, npm 11+, Docker (for local Postgres).

```bash
cp .env.example .env          # local DB default: sales_aaas on port 5434
npm run db:up                 # docker compose up -d
npm install
npm run dev:api               # Hono API
npm run dev:web               # Next.js app
npm run db:migrate            # apply Drizzle schema
```

Verify core health: `npm run verify:core` (typecheck + tests + build), or run Playwright e2e with
`npm run test:e2e`.

## Project structure

- `apps/web` — Next.js product surface (NextAuth, App Router).
- `apps/api` — Hono API on Cloudflare Workers.
- `apps/workflows` — Cloudflare Workflows workers.
- `packages/database` — Drizzle schema, generate + migrate tooling.
- `packages/shared` — shared domain contracts.
- `docs/` — product, compliance, reliability, roadmap, and operations truth.

## Documentation

- [docs/README.md](docs/README.md) — documentation index.
- [PLATFORM_SUMMARY.md](PLATFORM_SUMMARY.md) — platform summary.
- [AGENTS.md](AGENTS.md) — agent workflow notes.

## Status

Foundations are real and tested; mature org/workspace administration, entitlements and quota
enforcement, production rate limiting, and the delivered content/SEO workflow remain ahead.

## Contributing

See [CODEOWNERS](CODEOWNERS) for ownership and [AGENTS.md](AGENTS.md) for conventions. PRs welcome;
keep tests and docs in sync.

## License

No license file is provided; all rights reserved by the author.