import { test, expect, Page } from '@playwright/test';
import { login, getLocations, inventoryForLocation } from '../lib/supa';
import { resetDemo } from '../lib/backend';

// CORE vertical slice: a UI sell decrements SyncStock, the pg-boss worker pushes
// it (sync_logs pending→synced visible in Activity), and a receive restores it.
// Trace + video are on globally — these artifacts are the sync-loop demo.

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="password"]').press('Enter');
  await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
}

test.describe('Atomic sync loop', () => {
  test.beforeEach(async ({ request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);
  });

  test('sell → dashboard decrements → Activity shows synced → receive restores', async ({
    page,
    request,
  }) => {
    const { token } = await login(request);
    const [main] = await getLocations(request, token);
    const rows = await inventoryForLocation(request, token, main.id);
    const target = rows.find((r) => r.available > 5);
    if (!target) throw new Error('No product with available>5 in main location');
    const title = target.products.title;

    await loginAdmin(page);
    await page.getByRole('button', { name: main.name }).first().click();
    await expect(page.getByRole('heading', { name: main.name })).toBeVisible();

    const rowLoc = page.locator('div.bg-surface-container-low').filter({ hasText: title });
    await expect(rowLoc).toBeVisible();
    const qtyEl = rowLoc.locator('.text-data-stock');
    const q = Number(await qtyEl.innerText());

    // Sell one unit (the minus / "remove" icon button).
    await rowLoc.getByRole('button').filter({ hasText: 'remove' }).click();
    await expect(qtyEl).toHaveText(String(q - 1), { timeout: 15_000 });

    // Activity proves the worker flipped pending → synced for this product.
    await page.goto('/activity');
    const activityRow = page.locator('table tr').filter({ hasText: title }).first();
    await expect(activityRow.getByText('סונכרן')).toBeVisible({ timeout: 20_000 });

    // Receive one back → row returns to its starting quantity.
    await page.goto('/');
    await page.getByRole('button', { name: main.name }).first().click();
    const rowAgain = page.locator('div.bg-surface-container-low').filter({ hasText: title });
    await rowAgain.getByRole('button').filter({ hasText: 'add' }).click();
    await expect(rowAgain.locator('.text-data-stock')).toHaveText(String(q), { timeout: 15_000 });
  });
});
