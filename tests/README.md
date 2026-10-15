# Test Surface

This directory contains cross-repo automated coverage for launch-critical behavior.

## Layout

- `tests/unit/` protects deterministic shared logic such as pricing and webhook helpers.
- `tests/e2e/` runs Playwright browser smoke coverage against a built `apps/web` app.
- Workspace-local tests live beside each package in `apps/*/tests` and `packages/*/tests`.

## Core Commands

- `npm run test` runs root and workspace Vitest suites.
- `npm run test:unit` runs root unit tests only.
- `npm run test:e2e` runs the Playwright smoke suite against production-build web behavior.
- `npm run typecheck`, `npm run build`, and `npm run repo:audit` are part of the production gate for behavior-sensitive work.
- `npm run smoke:cloudflare` checks deployed web/API health and readiness plus public sitemap, robots, social preview images, and security contact metadata.

## Current Critical Journeys Covered

- public pricing and navigation surfaces
- get-started visitor activation
- contact intake prefill from solution, Sales Blueprint, and ROI context
- public integrations, solution pages, ROI calculator, and Sales Blueprint builder
- authenticated redirect posture for billing when no session exists

Add or update tests here when a change affects public activation, billing, dashboard trust, tenant scope, lifecycle recovery, or other cross-package behavior.
