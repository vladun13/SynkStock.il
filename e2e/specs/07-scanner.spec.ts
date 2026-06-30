import { test, expect } from '@playwright/test';
import { SCANNER_URL } from '../lib/env';
import { login, inventoryForLocation, getQty } from '../lib/supa';
import { resetDemo } from '../lib/backend';

// Scanner PWA manual path (camera getUserMedia fails headless, so we use the
// "type a code" entry). A sell from the scanner decrements the source of truth.
test.describe('Scanner', () => {
  test.beforeEach(async ({ request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);
  });

  test('manual barcode entry → ProductCard → sell decrements stock', async ({ page, request }) => {
    const { token } = await login(request);

    await page.goto(SCANNER_URL);
    await page.locator('input[type="password"]').press('Enter');
    const select = page.locator('select');
    await expect(select).toBeVisible({ timeout: 30_000 });
    // Options hydrate async — wait until the select holds a real location id.
    await expect.poll(async () => select.inputValue(), { timeout: 15_000 }).not.toBe('');

    // The scanner's active location → pick a product that's in stock there.
    const locationId = await select.inputValue();
    const rows = await inventoryForLocation(request, token, locationId);
    const target = rows.find((r) => r.available > 0);
    if (!target) throw new Error(`No in-stock product in scanner location ${locationId}`);
    const { barcode, title } = { barcode: target.products.barcode, title: target.products.title };
    const startQty = await getQty(request, token, target.product_id, locationId);

    // Switch to manual code entry, type the barcode, submit with Enter.
    await page.getByRole('button', { name: 'הקלדת קוד' }).click();
    const input = page.getByPlaceholder('הזן ברקוד או מק"ט');
    await input.fill(barcode);
    await input.press('Enter');

    // ProductCard for the matched product appears.
    await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });

    // Sell one (red action button) → card stock and source of truth both drop by 1.
    await page.locator('.btn-scan-action.bg-danger').click();
    await expect.poll(
      async () => getQty(request, token, target.product_id, locationId),
      { timeout: 15_000 }
    ).toBe(startQty - 1);
  });
});
