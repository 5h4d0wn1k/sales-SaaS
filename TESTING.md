# Testing Guide

This project uses a multi-layered testing strategy to ensure reliability, security, and correctness of the Sales SaaS platform.

## Test Stack

- **Vitest** - Unit and integration tests (fast, node environment)
- **Playwright** - End-to-end browser tests (Chromium)
- **Testcontainers** - Real PostgreSQL in Docker for integration tests (optional)
- **MSW** - Mock Service Worker for API mocking (future)

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── unit/
│   ├── auth/                   # Authentication tests
│   │   └── callbacks.test.ts   # JWT & session callbacks
│   ├── billing/                # Billing logic tests
│   │   ├── pricing.test.ts    # Pricing plan validation
│   │   ├── price-calculator.test.ts
│   │   └── stripe-webhook.test.ts  # Webhook signature verification
│   └── policy/                 # Policy evaluation (TODO)
├── integration/                # API + DB integration (TODO)
│   └── api/
├── e2e/                       # Full user journeys
│   └── smoke.spec.ts         # Critical path smoke tests
└── fixtures/                 # Test data builders (TODO)
```

## Running Tests

### Unit Tests (Fast, no DB required)
```bash
npm run test:unit           # Run once
npm run test:watch          # Watch root Vitest suites
npm run test:ui             # Open Vitest UI for root suites
```

### Root + Workspace Tests
```bash
npm test                    # Root Vitest + app/package Vitest suites
npm run test:root           # Root-only Vitest suites under tests/
npm run test:workspaces     # apps/* and packages/* Vitest suites
```

### E2E Tests (Requires dev servers running)
```bash
# Terminal 1: Start API and DB
npm run db:up
npm run dev:api

# Terminal 2: Start frontend
npm run dev:web

# Terminal 3: Run Playwright tests
npm run test:e2e
```

### With Coverage
```bash
npm run test:unit -- --coverage
# Opens HTML report in coverage/index.html
```

## Test Database

For integration tests that need a real database:

```bash
# Option 1: Use local Docker PostgreSQL (recommended)
docker compose up -d
# Ensure DATABASE_URL in .env.test points to test DB

# Option 2: Testcontainers (auto-spins up PostgreSQL)
# Just set DATABASE_URL and tests will use container
```

## Writing New Tests

### Unit Test Pattern

```typescript
import { describe, it, expect } from "vitest";
import { functionUnderTest } from "@sales/shared";

describe("functionUnderTest", () => {
  it("should behave correctly", () => {
    // Arrange
    const input = { ... };
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expected);
  });
});
```

### E2E Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await page.click('text=Get Started');
    await expect(page).toHaveURL('/get-started');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('h1')).toContainText('Plan Selection');
  });
});
```

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/ci.yml`):

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run db:generate --workspace @sales/database
      - run: npm run db:migrate --workspace @sales/database
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      - run: npm run typecheck --workspaces
      - run: npm run test:unit -- --coverage
      - run: npm run test:workspaces
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Security Testing

### Critical Security Tests

1. **Webhook Signature Verification** (`tests/unit/billing/stripe-webhook.test.ts`)
   - Validates Stripe/Razorpay signatures
   - Rejects tampered payloads
   - Enforces timestamp tolerance

2. **Authentication Bypass Attempts** (TODO)
   - Test unauthenticated access to protected routes
   - Test expired/invalid JWT tokens
   - Test role escalation

3. **Rate Limiting** (TODO)
   - Verify 429 after threshold
   - Test per-user limits

4. **SQL Injection** (covered by Drizzle ORM parameterized queries)

### GRC Compliance

All user actions affecting billing, subscriptions, or data mutations are logged to `audit_events`. Test that:

- Every API write operation creates an audit event
- Audit events include: `actorId`, `actorType`, `eventType`, `payload`, `createdAt`
- Events are never modified or deleted

## Performance Testing

For load testing, consider:

- **k6** or **Artillery** for API load testing
- Target: 100 concurrent users, 95th percentile < 200ms
- Use staging environment with production-like data

Example k6 script:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function() {
  // Test dashboard load (authenticated)
  const res = http.get('http://localhost:4000/v1/dashboard', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

## Test Coverage Goals

- **Overall**: 80%+ lines, branches, functions
- **Critical paths** (billing, auth): 90%+
- **Security-sensitive code**: 100%
- **UI components**: 70%+

View coverage report:
```bash
npm run test:unit -- --coverage
# Open coverage/index.html
```

## Common Test Patterns

### Testing API Routes

```typescript
import { Hono } from 'hono';
import { createApp } from '@sales/api/src/app';

const app = createApp();

test('GET /health returns ok', async () => {
  const res = await app.fetch(new Request('http://localhost/health'));
  const data = await res.json();
  expect(data.status).toBe('ok');
});
```

### Testing with Test Database

```typescript
import { db } from '@sales/database';
import { users } from '@sales/database';
import { eq } from 'drizzle-orm';

beforeEach(async () => {
  // Clean DB
  await db.delete(users).execute();
});

afterAll(async () => {
  // Close connections
  await db.$pool?.end();
});
```

## Troubleshooting

### "Cannot find module '@sales/database'"
Ensure you've run `npm install` at the root (monorepo symlinks).

### Tests hanging
Check that PostgreSQL is running: `docker compose ps`

### Type errors in tests
Vitest uses the same tsconfig as the project. Ensure `paths` are configured correctly.

### Playwright cannot start browser
Install browsers: `npx playwright install --with-deps chromium`

## Future Improvements

- [ ] Add integration tests for all API endpoints
- [ ] Add tests for Razorpay webhook validation
- [ ] Add tests for usage metering enforcement
- [ ] Add visual regression tests for UI (Playwright)
- [ ] Add mutation testing (stryker) to verify test quality
- [ ] Set up CI with parallel test sharding
- [ ] Add property-based testing (fast-check) for edge cases
