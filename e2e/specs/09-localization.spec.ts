import { test, expect, Page } from '@playwright/test';

// Hebrew RTL is the default; the language toggle flips to English LTR and the
// choice persists across a reload.

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="password"]').press('Enter');
  await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
}

test.describe('Localization', () => {
  test('defaults to Hebrew RTL, toggles to English LTR, persists across reload', async ({
    page,
  }) => {
    await loginAdmin(page);

    // Default: RTL (dir lives on a wrapper div, not <html>).
    await expect(page.locator('div[dir]').first()).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('סך מוצרים')).toBeVisible();

    // Toggle → English LTR.
    await page.getByRole('button', { name: 'language' }).click();
    await expect(page.locator('div[dir]').first()).toHaveAttribute('dir', 'ltr');
    await expect(page.getByText('Total SKUs')).toBeVisible();

    // Persists across reload.
    await page.reload();
    await expect(page.locator('div[dir]').first()).toHaveAttribute('dir', 'ltr');

    // Toggle back to Hebrew so later specs see the default state.
    await page.getByRole('button', { name: 'language' }).click();
    await expect(page.locator('div[dir]').first()).toHaveAttribute('dir', 'rtl');
  });
});
