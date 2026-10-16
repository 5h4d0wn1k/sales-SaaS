# Cloudflare Workers Builds (free CI/CD)

This repo previously relied on GitHub Actions for CI and a manual
`workflow_dispatch` deploy workflow. GitHub Actions is **metered for private
repositories** and the account is currently blocked by a billing issue, so
Actions cannot run. Cloudflare **Workers Builds** is a **free** replacement that
builds and deploys directly from GitHub on push.

> Workers Builds is configured in the Cloudflare dashboard and requires a
> one-time GitHub App authorization. The steps below are for the
> `Salesxgrowthx@gmail.com's Account` (`07eae60a75b06661ea752a78cdf51565`).

## What is deployed

| Worker (dashboard name)      | Wrangler config                    | Env flag     |
| ---------------------------- | ---------------------------------- | ------------ |
| `sales-web-production`       | `apps/web/wrangler.jsonc`          | `production` |
| `sales-api-production`       | `apps/api/wrangler.jsonc`          | `production` |
| `sales-workflows-production` | `apps/workflows/wrangler.jsonc`    | `production` |

> The dashboard Worker name is the Wrangler `name` plus the environment suffix
> (`-production` / `-staging`). Keep the Worker you connect in the dashboard
> consistent with the `--env` flag in the deploy command. See the
> [Workers name requirement](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/#workers-name-requirement).

## One-time setup (per Worker)

1. Dashboard → **Workers & Pages** → select the Worker (e.g. `sales-web-production`).
2. **Settings → Builds → Connect**.
3. Authorize GitHub and select repository `5h4d0wn1k/sales-SaaS`.
4. Set:
   - **Production branch:** `main`
   - **Root directory:** `/` (repo root — this is an npm **workspaces** monorepo)
   - **Build command:** see table below
   - **Deploy command:** see table below
5. Add **Build variables** (Settings → Build → Variables):
   - `NEXT_PUBLIC_API_URL = https://api.salesxgrowth.com`
   - `NEXT_PUBLIC_SITE_URL = https://salesxgrowth.com`
   (Build variables are compile-time only; runtime vars/secrets live in
   `Settings → Variables & Secrets`, already configured per environment.)
6. **Save**. Push to `main` (or **Retry build**) to trigger the first build.

### Commands per Worker

| Worker     | Build command                                                            | Deploy command                                                   |
| ---------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| web        | `npm run build --workspace @sales/shared && npm run build:cf-worker --workspace @sales/web` | `npx wrangler deploy --config apps/web/wrangler.jsonc --env production` |
| api        | `npm run build --workspace @sales/api`                                   | `npx wrangler deploy --config apps/api/wrangler.jsonc --env production` |
| workflows  | `npm run typecheck --workspace @sales/workflows`                         | `npx wrangler deploy --config apps/workflows/wrangler.jsonc --env production` |

### Free quality gate in the build step

Workers Builds runs the **build command** on every push. To also run tests for
free (replacing the blocked GitHub Actions CI), prefix the build command, e.g.:

```
npm run test --workspace @sales/shared && npm run test --workspace @sales/api && npm run build --workspace @sales/api
```

## Notes & caveats

- API token: Workers Builds auto-generates an account token with Workers Scripts
  (edit), Workers KV/R2 (edit), and Workers Routes (edit). Leave the default.
- Monorepo: `npm ci` must run at the repo root so workspace links resolve — set
  **Root directory** to `/`.
- Build variables are not available at runtime. Runtime vars come from the
  Wrangler `vars` blocks; secrets (`AUTH_SECRET`, `DATABASE_URL`,
  `WORKFLOWS_API_TOKEN`) are Wrangler secrets already set on each Worker.
- Container images: not used here, so `npx wrangler deploy` is correct (not
  `wrangler versions upload`).
- Preview builds: non-`main` branches produce Preview URLs by default.

## Fallback if Workers Builds cannot be connected

If GitHub App authorization is unavailable, the existing GitHub Actions
workflows (`ci.yml`, `deploy-cloudflare.yml`) remain valid — they only need the
GitHub **Billing & plans** payment/spending-limit issue resolved:

1. GitHub → **Settings → Billing and plans → Plans and usage**.
2. Update the payment method / increase the spending limit.
3. Re-run the failed workflow.

## Local deploy (used for the initial rebrand cutover)

```
export CLOUDFLARE_API_TOKEN="$(cat ~/.config/cloudflare/salesxgrowth-wrangler.token)"
export CLOUDFLARE_ACCOUNT_ID=07eae60a75b06661ea752a78cdf51565
export NEXT_PUBLIC_API_URL="https://api.salesxgrowth.com"
export NEXT_PUBLIC_SITE_URL="https://salesxgrowth.com"

npm run deploy:api:production
npm run deploy:web:production
npm run deploy:workflows:production
```
