import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  
  use: {
    baseURL: 'http://127.0.0.1:3100',
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
    command: 'AUTH_TRUST_HOST=true AUTH_URL=http://127.0.0.1:3100 NEXTAUTH_URL=http://127.0.0.1:3100 npm run build --workspace @sales/web && AUTH_TRUST_HOST=true AUTH_URL=http://127.0.0.1:3100 NEXTAUTH_URL=http://127.0.0.1:3100 npm run start --workspace @sales/web -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 300 * 1000,
  },
});
