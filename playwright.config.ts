import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.PLAYWRIGHT_PORT ?? '3100';
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: e2eBaseUrl,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Run against the built app so the smoke suite matches production behavior
    // and avoids Next.js dev-server navigation flake under concurrent access.
    command: `AUTH_TRUST_HOST=true AUTH_URL=${e2eBaseUrl} NEXTAUTH_URL=${e2eBaseUrl} npm run build --workspace @sales/web && AUTH_TRUST_HOST=true AUTH_URL=${e2eBaseUrl} NEXTAUTH_URL=${e2eBaseUrl} npm run start --workspace @sales/web -- --hostname 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 300 * 1000,
  },
});
