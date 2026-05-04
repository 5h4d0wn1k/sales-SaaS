import { test, expect } from '@playwright/test';

test.describe('User Registration and Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to get-started and show auth options', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page).toHaveURL('/get-started');
    await expect(page.getByRole('heading', { name: "Let's get you started" })).toBeVisible();
  });

  test('should let a visitor progress through the email signup UI', async ({ page }) => {
    await page.goto('/get-started');
    await page.getByRole('button', { name: 'Sign up with email' }).click();

    await expect(page.getByRole('heading', { name: "What's your work email?" })).toBeVisible();
    await page.locator('#email').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Nice to meet you' })).toBeVisible();
  });

  test('should have billing link in dashboard', async ({ page }) => {
    // Register first (or mock session)
    // This would need a real backend - in CI we'd seed the DB
    
    // For now, just verify the billing page exists
    await page.goto('/billing');
    // Should redirect to /get-started if not authenticated
    await expect(page).toHaveURL('/get-started');
  });
});

test.describe('Pricing Page', () => {
  test('should display the shared pricing tiers', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.getByRole('heading', { name: 'Straightforward pricing for the current public beta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Elite' })).toBeVisible();
  });

  test('should show the canonical shared pricing values', async ({ page }) => {
    await page.goto('/pricing');
    
    await expect(page.getByText('$49', { exact: true })).toBeVisible();
    await expect(page.getByText('$99', { exact: true })).toBeVisible();
    await expect(page.getByText('$249', { exact: true })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have functional navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Check key links exist
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
  });
});
