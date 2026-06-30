import { test, expect } from '@playwright/test';
import { login, findOneAtQty, getQty } from '../lib/supa';
import { adjust, resetDemo, genActionId } from '../lib/backend';

// Re-delivering the same action (webhook retry / offline scan replay) must change
// stock exactly once. The stable key is `actionId` (processed_events).
test.describe('Idempotency', () => {
  test.beforeEach(async ({ request }) => {
    const { token } = await login(request);
    await resetDemo(request, token);
  });

  test('same actionId twice → second is 409 and stock changes only once', async ({
    request,
  }) => {
    const { token } = await login(request);
    const row = await findOneAtQty(request, token, 2);
    const { barcode } = row.products;
    const locationId = row.location_id;
    const start = await getQty(request, token, row.product_id, locationId);

    const actionId = genActionId('idem');
    const first = await adjust(request, token, { barcode, locationId, delta: -1, actionId });
    expect(first.status()).toBe(200);
    expect((await first.json()).available).toBe(start - 1);

    const second = await adjust(request, token, { barcode, locationId, delta: -1, actionId });
    expect(second.status()).toBe(409);
    expect((await second.json()).error).toMatch(/already processed/i);

    // Net effect of the duplicate is a single decrement.
    expect(await getQty(request, token, row.product_id, locationId)).toBe(start - 1);
  });

  test('concurrent duplicate actionId → exactly one 200, one 409, single decrement', async ({
    request,
  }) => {
    const { token } = await login(request);
    const row = await findOneAtQty(request, token, 3);
    const { barcode } = row.products;
    const locationId = row.location_id;
    const start = await getQty(request, token, row.product_id, locationId);

    const actionId = genActionId('idem-conc');
    const [a, b] = await Promise.all([
      adjust(request, token, { barcode, locationId, delta: -1, actionId }),
      adjust(request, token, { barcode, locationId, delta: -1, actionId }),
    ]);

    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    expect(await getQty(request, token, row.product_id, locationId)).toBe(start - 1);
  });
});
