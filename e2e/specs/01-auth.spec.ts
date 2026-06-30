import { test, expect } from '@playwright/test';

// Auth gate: the demo login works with the pre-filled creds, and the
// ProtectedRoute bounces an unauthenticated visitor back to /login.
test.describe('Auth', () => {
  test('pre-filled demo creds log in and land on the dashboard', async ({ page }) => {
    await page.goto('/login');

    // Creds are pre-filled by the demo build; assert that, then submit via Enter.
    const email = page.locator('input').first();
    const pwd = page.locator('input[type="password"]');
    await expect(email).toHaveValue('demo@syncstock.dev');
    await expect(pwd).toHaveValue('demo1234');

    await pwd.press('Enter');

    await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test('unauthenticated visit to / is redirected to /login', async ({ browser }) => {
    // Fresh context → no session → ProtectedRoute should redirect.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    await context.close();
  });
});
