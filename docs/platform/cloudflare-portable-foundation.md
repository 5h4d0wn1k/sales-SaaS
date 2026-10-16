# Cloudflare Portable Foundation

This repo now has a Cloudflare-first foundation without locking the product into Cloudflare-only or Supabase-only contracts.

## What is in place

- `apps/workflows`
  - Scaffolded from `npm create cloudflare@latest -- --type=hello-world-workflows`.
  - Reworked into an approval-gated campaign workflow instead of the stock sample.
  - Uses plain HTTP callback/webhook contracts for dispatch so the orchestration layer can move to another platform later.
- `apps/api`
  - Still runs locally with the existing Node entrypoint.
  - Now also has a Worker entrypoint at `src/worker.ts` plus `wrangler.jsonc`.
  - Accepts either `DATABASE_URL` directly or a Hyperdrive binding mapped onto the same contract.
- `packages/database`
  - Database initialization is now lazy and reconfigurable at runtime.
  - Business logic still imports `db` the same way.
  - Worker runtimes can inject a different connection string without rewriting app code.
  - OpenNext request context can now surface a bound Hyperdrive connection string for the web worker without changing app-level query code.

## Portability rules

Keep these boundaries intact:

- Use standard Postgres connection strings as the app contract.
- Treat Hyperdrive as an optional transport optimization, not a schema or query dependency.
- Keep workflow-to-backend integration on HTTP payloads instead of Cloudflare service bindings unless latency makes that necessary later.
- Keep workflow payloads and webhook payloads provider-neutral.
- Do not put Supabase-specific auth, storage, or RPC assumptions into workflow code.

## Live staging resources

These staging resources now exist:

- Cloudflare account `07eae60a75b06661ea752a78cdf51565`
- `workers.dev` subdomain `salesxgrowth.workers.dev`
- Zone `salesxgrowth.com` (`efb771adc30d98e9f4ab171f65891b7c`)
- Supabase project ref `gfvngovcyjoxkbzawqnm` in `ap-south-1`
- Hyperdrive config `9c1c36b38d064425b8e7e3587c12635d`

Current staging endpoints:

- Web: `https://sales-web-staging.salesxgrowth.workers.dev`
- API: `https://sales-api-staging.salesxgrowth.workers.dev`
- Workflows: `https://sales-workflows-staging.salesxgrowth.workers.dev`

## Live production resources

Production runs in the same account on the `salesxgrowth.com` zone:

- Web: `https://salesxgrowth.com` and `https://www.salesxgrowth.com` (custom domains attached to `sales-web-production`), plus `https://sales-web-production.salesxgrowth.workers.dev`
- API: `https://api.salesxgrowth.com` (custom domain attached to `sales-api-production`) and `https://sales-api-production.salesxgrowth.workers.dev`
- Workflows: `https://sales-workflows-production.salesxgrowth.workers.dev` (internal, token-gated; not exposed on a public subdomain)

Production workers use the same Supabase Postgres database via the Hyperdrive config above. Set `NEXT_PUBLIC_API_URL=https://api.salesxgrowth.com` at web build time (the value is inlined into the client bundle) and keep `FRONTEND_URL=https://salesxgrowth.com` on the API worker.

## Zone-level edge configuration

A few production controls live on the zone (edge), not in the worker bundles, so they are not managed by `wrangler deploy`. They are applied through the Cloudflare Rulesets API (`cf rulesets create -z salesxgrowth.com ...`):

- `http_ratelimit` — one rule blocks more than 100 requests per 10 s per client IP for `api.salesxgrowth.com`. This backs the API `RATE_LIMIT_BACKEND=edge` declaration so `/ready` reports `rate-limits: ready`.
- `http_request_cache_settings` — caches the `/opengraph-image` and `/twitter-image` responses at the edge.
- `http_request_transform` — rewrites `/opengraph-image` and `/twitter-image` to the static `/og-image.png` asset.

The rewrite exists because dynamic Open Graph rendering (`next/og` → Satori/resvg) exceeds the Workers free-plan 10 ms CPU limit intermittently, which surfaced as `error code: 1102` on those routes. `apps/web/public/og-image.png` holds the prerendered PNG (the same bytes the build produces at `apps/web/.next/server/app/opengraph-image.body`). If the social preview design changes, regenerate that PNG from a fresh build and redeploy the web worker. Upgrading the account to Workers Paid (30 s CPU) would let the dynamic routes render directly and the rewrite could be dropped.

## Local development

Install dependencies from the repo root:

```bash
npm install
```

Start the existing Node API:

```bash
npm run dev:api
```

Start the workflow worker:

```bash
cp apps/workflows/.dev.vars.example apps/workflows/.dev.vars
npm run dev:workflows
```

Optional: run the API on Workers locally:

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
npm run dev:api:worker
```

Regenerate workflow runtime types after changing workflow bindings:

```bash
npm run cf:typegen:workflows
```

## Workflow endpoints

The workflow worker exposes:

- `GET /health`
- `POST /workflows/campaign-dispatch`
- `GET /workflows/:id`
- `POST /workflows/:id/approval`

If `WORKFLOWS_API_TOKEN` is configured, send it as either:

- `Authorization: Bearer <token>`
- `X-Workflows-Token: <token>`

## Callback contract

Set `CAMPAIGN_DISPATCH_WEBHOOK_URL_TEMPLATE` to a template URL such as:

```text
http://127.0.0.1:4000/v1/campaigns/{campaignId}/dispatch
```

The workflow replaces:

- `{campaignId}`
- `{requestId}`

It then POSTs this JSON body:

```json
{
  "requestId": "uuid",
  "campaignId": "campaign-id",
  "organizationId": "optional-org-id",
  "workspaceId": "optional-workspace-id",
  "initiatedBy": "optional-user-id",
  "approval": {
    "approved": true,
    "approvedBy": "user-id",
    "notes": "optional"
  },
  "metadata": {}
}
```

This lets the current API, a future queue consumer, or a different orchestration platform receive the same approval result.

## Cloudflare secrets and vars

Recommended secrets for `apps/workflows`:

```bash
npx wrangler secret put WORKFLOWS_API_TOKEN --config apps/workflows/wrangler.jsonc
npx wrangler secret put CAMPAIGN_DISPATCH_BEARER_TOKEN --config apps/workflows/wrangler.jsonc
```

Recommended secret for `apps/api`:

```bash
npx wrangler secret put DATABASE_URL --config apps/api/wrangler.jsonc
```

Other existing API secrets should also be stored in Wrangler secrets before a real deployment.

## Health and readiness

- Web liveness: `GET /health`
- Web readiness: `GET /ready`
- API liveness: `GET /health`
- API readiness: `GET /ready`

Use liveness to confirm the worker process can answer requests. Use readiness before promotion or traffic cutover. API readiness fails production deployments that fall back to demo memory storage, and web readiness checks that the downstream API readiness endpoint is healthy. The Cloudflare smoke script also fetches public `sitemap.xml`, `robots.txt`, social preview image headers, and `/.well-known/security.txt` so SEO and trust assets are verified after the web worker is ready.

## Production readiness monitor

`.github/workflows/readiness-monitor.yml` runs the same Cloudflare smoke script every 30 minutes. Configure repository or organization variables with production-prefixed names when possible:

- `PRODUCTION_WEB_APP_URL`
- `PRODUCTION_API_HEALTHCHECK_URL`
- optional `PRODUCTION_WEB_HEALTHCHECK_URL`
- optional `PRODUCTION_WEB_READINESSCHECK_URL`
- optional `PRODUCTION_API_READINESSCHECK_URL`
- optional `PRODUCTION_WORKFLOWS_HEALTHCHECK_URL`
- optional secret `PRODUCTION_READINESS_ALERT_WEBHOOK_URL`
- optional `PRODUCTION_READINESS_ALERT_WEBHOOK_FORMAT` as `slack`, `discord`, or `generic`
- optional `PRODUCTION_READINESS_ALLOW_WARNINGS=true` only for an explicitly accepted rollout exception

If production-prefixed values are not present, the monitor falls back to the existing smoke variable names used by deployment workflows.

Readiness warnings fail the production monitor by default. This keeps warning-level launch blockers, such as missing provider readiness or process-local abuse controls, from looking like a clean production pass. Set `PRODUCTION_READINESS_ALLOW_WARNINGS=true` only when the owner has accepted a temporary rollout exception and documented the follow-up.

When the optional alert webhook secret is configured, failed scheduled runs post to the webhook. Without it, GitHub Actions still records the failed scheduled run as the owner-facing alert.

## Staging deploy order

Use this order so browser CORS and build-time envs line up correctly:

1. Create or update the staging Supabase database and apply Drizzle migrations.
2. Create or update the Hyperdrive config against the Supabase direct connection string.
3. Deploy `apps/api` staging first.
4. Deploy `apps/web` staging with `NEXT_PUBLIC_API_URL` exported at build time.
5. Re-deploy `apps/api` staging with `FRONTEND_URL` set to the real web staging URL.
6. Deploy `apps/workflows` staging last.

## Hyperdrive usage

Staging now uses Hyperdrive for `apps/api`, and `apps/web` can also consume the same Hyperdrive binding through the shared database client.

The important detail is that the app still treats the database as a standard Postgres contract:

- local Node uses `.env`
- Cloudflare can use `DATABASE_URL`
- Cloudflare can use Hyperdrive
- another host can still use plain Postgres

For OpenNext deploys, the local deploy process also needs a local fallback string for the Hyperdrive binding:

```bash
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgresql://..."
```

Without that variable, `opennextjs-cloudflare deploy` cannot build the local platform proxy for a Hyperdrive-bound environment.

## Current staging posture

What is working:

- `apps/api` staging is live, `/health` reports `storage: "postgres"`, and `/ready`
  confirms production traffic readiness.
- `apps/web` staging is live, serves the public product surface, and exposes `/health`
  plus `/ready` with `service: "sales-web"` for deployment smoke checks.
- API CORS now allows the deployed staging web origin.
- `apps/workflows` staging is live and token-protected.

What is still not production-grade:

- The web/API auth flow is improved, but production OAuth on Workers still depends on setting `AUTH_TRUST_HOST=true` and smoke-testing the deployed callback host.
- Tenant isolation and billing hardening issues from the audit still need remediation before public production use.
- Google OAuth is intentionally disabled in staging unless `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- The workflow callback contract is ready, but the API still does not expose a dedicated service-to-service campaign dispatch endpoint.
