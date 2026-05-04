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

- Cloudflare account `e251f79bafcd5a50d2964251a5e53450`
- `workers.dev` subdomain `sales-aaas-nikhil204.workers.dev`
- Supabase project ref `gfvngovcyjoxkbzawqnm` in `ap-south-1`
- Hyperdrive config `08eda5f0a1714b69b1abb3df8c3b897e`

Current staging endpoints:

- Web: `https://sales-web-staging.sales-aaas-nikhil204.workers.dev`
- API: `https://sales-api-staging.sales-aaas-nikhil204.workers.dev`
- Workflows: `https://sales-workflows-staging.sales-aaas-nikhil204.workers.dev`

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

- `apps/api` staging is live and `/health` reports `storage: "postgres"`.
- `apps/web` staging is live and serves the public product surface.
- API CORS now allows the deployed staging web origin.
- `apps/workflows` staging is live and token-protected.

What is still not production-grade:

- The web/API auth flow is improved, but production OAuth on Workers still depends on setting `AUTH_TRUST_HOST=true` and smoke-testing the deployed callback host.
- Tenant isolation and billing hardening issues from the audit still need remediation before public production use.
- Google OAuth is intentionally disabled in staging unless `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
- The workflow callback contract is ready, but the API still does not expose a dedicated service-to-service campaign dispatch endpoint.
