import { test, expect, Page } from '@playwright/test';

// Dashboard renders the seeded inventory with honest stock-state styling:
// out-of-stock rows are danger (Sell disabled), low-stock rows are warning.
// Location tabs and the stock filter narrow the visible set.

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="password"]').press('Enter');
  await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
}

test.describe('Dashboard', () => {
  test('stat labels, stock-state rows, tabs, and low-stock filter', async ({ page }) => {
    await loginAdmin(page);

    // Stat cards (HE labels). Out-of-stock card may not render — proven via rows.
    await expect(page.getByText('סך מוצרים')).toBeVisible();
    await expect(page.getByText('מלאי נמוך').first()).toBeVisible();

    // Product rows are `.rounded-md`; the recent-activity panel is `.rounded`.
    // Rows hydrate from Supabase async, so wait for the first before counting.
    const rows = page.locator('div.bg-surface-container-low.rounded-md');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);

    // An out-of-stock row: danger border, qty 0, Sell (remove) disabled.
    const outOfStock = page.locator('div.bg-surface-container-low.border-danger').first();
    await expect(outOfStock).toBeVisible();
    await expect(outOfStock.locator('.text-data-stock')).toHaveText('0');
    await expect(outOfStock.getByRole('button').filter({ hasText: 'remove' })).toBeDisabled();

    // A low-stock row: warning border, qty in 1..3.
    const lowStock = page.locator('div.bg-surface-container-low.border-warning').first();
    await expect(lowStock).toBeVisible();
    const lowQty = Number(await lowStock.locator('.text-data-stock').innerText());
    expect(lowQty).toBeGreaterThanOrEqual(1);
    expect(lowQty).toBeLessThanOrEqual(3);

    // Location tabs (no "All" tab — "All" is a stock filter).
    await page.getByRole('button', { name: 'חנות תל אביב' }).click();
    await expect(page.getByRole('heading', { name: 'חנות תל אביב' })).toBeVisible();
    await page.getByRole('button', { name: 'מחסן ראשי' }).click();
    await expect(page.getByRole('heading', { name: 'מחסן ראשי' })).toBeVisible();

    // Low-stock filter: every visible qty ∈ {1,2,3}; "הכל" restores.
    await page.getByRole('button', { name: 'מלאי נמוך' }).click();
    const stocks = page.locator('div.bg-surface-container-low .text-data-stock');
    await expect.poll(async () => stocks.count()).toBeGreaterThan(0);
    const values = await stocks.allInnerTexts();
    for (const v of values) {
      const n = Number(v);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
    await page.getByRole('button', { name: 'הכל' }).click();
    await expect.poll(async () => stocks.count()).toBeGreaterThan(values.length);
  });
});
