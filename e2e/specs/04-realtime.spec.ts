import { test, expect, Page } from '@playwright/test';
import { login, getLocations, inventoryForLocation } from '../lib/supa';
import { adjust, resetDemo, genActionId } from '../lib/backend';

// Supabase Realtime: an inventory change made out-of-band (API, no page reload)
// pushes into the open dashboard and updates the row live.

async function loginAdmin(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="password"]').press('Enter');
  await expect(page.getByText('סך מוצרים')).toBeVisible({ timeout: 30_000 });
}

test.describe('Realtime', () => {
  test.beforeEach(async ({ request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);
  });

  test('out-of-band adjust updates the open dashboard without reload', async ({
    page,
    request,
  }) => {
    const { token } = await login(request);
    await loginAdmin(page);

    // Whatever location the dashboard is currently showing.
    const activeName = await page.getByRole('heading').first().innerText();
    const locations = await getLocations(request, token);
    const loc = locations.find((l) => l.name === activeName) || locations[0];

    const rows = await inventoryForLocation(request, token, loc.id);
    const target = rows.find((r) => r.available > 0);
    if (!target) throw new Error(`No visible product in location ${loc.name}`);
    const title = target.products.title;

    const rowLoc = page.locator('div.bg-surface-container-low').filter({ hasText: title });
    await expect(rowLoc).toBeVisible();
    const q = Number(await rowLoc.locator('.text-data-stock').innerText());

    // Mutate from the API context — the page does NOT reload.
    const res = await adjust(request, token, {
      barcode: target.products.barcode,
      locationId: loc.id,
      delta: +1,
      actionId: genActionId('realtime'),
    });
    expect(res.status()).toBe(200);

    await expect(rowLoc.locator('.text-data-stock')).toHaveText(String(q + 1), {
      timeout: 20_000,
    });
  });
});
