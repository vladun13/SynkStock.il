import { test, expect, Page } from '@playwright/test';
import { login, getLocations, inventoryForLocation, getQty } from '../lib/supa';
import { adjust, resetDemo, genActionId } from '../lib/backend';

// The demo reset button restores seeded stock — dirty one product via the API,
// then reset from the admin UI and prove the value returns to baseline.

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="password"]').press('Enter');
  await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
}

test.describe('Demo reset', () => {
  test('reset button restores a product to its baseline quantity', async ({ page, request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);

    const [main] = await getLocations(request, token);
    const rows = await inventoryForLocation(request, token, main.id);
    const target = rows.find((r) => r.available > 1);
    if (!target) throw new Error('No product with available>1 to dirty');
    const title = target.products.title;
    const q0 = await getQty(request, token, target.product_id, main.id);

    // Dirty it.
    await adjust(request, token, {
      barcode: target.products.barcode,
      locationId: main.id,
      delta: -1,
      actionId: genActionId('reset-dirty'),
    });
    expect(await getQty(request, token, target.product_id, main.id)).toBe(q0 - 1);

    // Reset from the admin UI (button + confirm).
    await loginAdmin(page);
    // Trigger is an icon-only button — its accessible name is the ligature, so
    // target it by title; the confirm dialog button uses t('confirm') = אישור.
    await page.locator('button[title="איפוס הדמו"]').click();
    await page.getByRole('button', { name: 'אישור' }).click();

    // Source of truth back to baseline...
    await expect
      .poll(async () => getQty(request, token, target.product_id, main.id), { timeout: 20_000 })
      .toBe(q0);

    // ...and the dashboard row reflects it.
    await page.getByRole('button', { name: main.name }).first().click();
    const rowLoc = page.locator('div.bg-surface-container-low.rounded-md').filter({ hasText: title });
    await expect(rowLoc.locator('.text-data-stock')).toHaveText(String(q0), { timeout: 15_000 });
  });
});
