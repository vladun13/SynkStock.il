import { test, expect } from '@playwright/test';
import { login, findOneAtQty, getQty } from '../lib/supa';
import { adjust, resetDemo, genActionId } from '../lib/backend';

// THE core guarantee: two simultaneous sales of the last unit must never both
// succeed. Proven at the API level for determinism (no UI timing involved).
test.describe('Oversell guard', () => {
  test.beforeEach(async ({ request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);
  });

  test('two concurrent -1 on a qty-1 product → exactly one 200, one 409, final stock 0', async ({
    request,
  }) => {
    const { token } = await login(request);
    const row = await findOneAtQty(request, token, 1);
    const { barcode } = row.products;
    const locationId = row.location_id;

    expect(await getQty(request, token, row.product_id, locationId)).toBe(1);

    // Distinct actionIds so this exercises the OVERSELL path, not idempotency.
    const [a, b] = await Promise.all([
      adjust(request, token, { barcode, locationId, delta: -1, actionId: genActionId('os-a') }),
      adjust(request, token, { barcode, locationId, delta: -1, actionId: genActionId('os-b') }),
    ]);

    const statuses = [a.status(), b.status()].sort();
    expect(statuses).toEqual([200, 409]); // exactly one of each

    const ok = a.status() === 200 ? a : b;
    const rejected = a.status() === 409 ? a : b;
    expect((await ok.json()).available).toBe(0);
    expect((await rejected.json()).error).toMatch(/insufficient/i);

    // Source of truth never went negative.
    expect(await getQty(request, token, row.product_id, locationId)).toBe(0);
  });

  test('UI: selling the last unit shows out-of-stock and blocks a further sell', async ({
    page,
    request,
  }) => {
    const { token } = await login(request);
    await resetDemo(request, token);

    const row = await findOneAtQty(request, token, 1);
    const title = row.products.title;
    const locName = (await import('../lib/supa')).getLocations
      ? (await (await import('../lib/supa')).getLocations(request, token)).find(
          (l) => l.id === row.location_id
        )?.name
      : undefined;

    // Log in to admin (pre-filled creds; submit via Enter on the password field).
    await page.goto('/login');
    const pwd = page.locator('input[type="password"]');
    await pwd.fill('demo1234');
    await pwd.press('Enter');
    await expect(page.getByText('SyncStock IL')).toBeVisible({ timeout: 30_000 });

    // Switch to the tab for the location holding the qty-1 product.
    if (locName) {
      await page.getByRole('button', { name: locName }).first().click();
    }

    const rowLoc = page.locator('div.bg-surface-container-low.rounded-md').filter({ hasText: title });
    await expect(rowLoc).toBeVisible();
    const sellBtn = rowLoc.getByRole('button').filter({ hasText: 'remove' });

    await sellBtn.click(); // sell the last unit
    await expect(rowLoc.locator('.text-data-stock')).toHaveText('0', { timeout: 15_000 });
    // Out-of-stock row is rendered danger and the Sell control is disabled.
    await expect(rowLoc).toHaveClass(/border-danger/);
    await expect(sellBtn).toBeDisabled();
  });
});
