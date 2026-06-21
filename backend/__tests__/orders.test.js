const request = require('supertest');
const app = require('../server');
const { db, runMigrations, seedDemo, getDemoToken, cleanupBetweenTests, destroy } = require('./helpers');

let token;
let locationId;
let healthyBarcode;

beforeAll(async () => {
  await runMigrations();
  await seedDemo();
  token = await getDemoToken();
  locationId = (await db('locations').where({ shopify_location_id: 1001 }).first()).id;
  healthyBarcode = (await db('products').where({ sku: 'SKU-003' }).first()).barcode;
}, 60000);

afterEach(async () => {
  await cleanupBetweenTests();
  locationId = (await db('locations').where({ shopify_location_id: 1001 }).first()).id;
  healthyBarcode = (await db('products').where({ sku: 'SKU-003' }).first()).barcode;
}, 60000);

afterAll(async () => {
  await destroy();
});

describe('POST /api/orders/webhook', () => {
  it('decrements stock and records origin=order', async () => {
    const before = await db('inventory_levels')
      .where({ location_id: locationId })
      .join('products', 'products.id', 'inventory_levels.product_id')
      .where({ 'products.barcode': healthyBarcode })
      .first('inventory_levels.available');

    const orderId = `test:${Date.now()}`;
    const res = await request(app)
      .post('/api/orders/webhook')
      .set('Authorization', `Bearer ${token}`)
      .send({
        order_id: orderId,
        webhook_id: 'wh-1',
        line_items: [{ barcode: healthyBarcode, quantity: 1, location_id: locationId }],
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const after = await db('inventory_levels')
      .where({ location_id: locationId })
      .join('products', 'products.id', 'inventory_levels.product_id')
      .where({ 'products.barcode': healthyBarcode })
      .first('inventory_levels.available');

    expect(after.available).toBe(before.available - 1);

    const log = await db('sync_logs')
      .where({ location_id: locationId })
      .join('products', 'products.id', 'sync_logs.product_id')
      .where({ 'products.barcode': healthyBarcode, origin: 'order' })
      .first('sync_logs.status');
    expect(log).toBeTruthy();
    expect(log.status).toBe('synced');
  });

  it('does not create a Shopify outbox row', async () => {
    const orderId = `test:${Date.now()}:noshopify`;
    await request(app)
      .post('/api/orders/webhook')
      .set('Authorization', `Bearer ${token}`)
      .send({
        order_id: orderId,
        webhook_id: 'wh-2',
        line_items: [{ barcode: healthyBarcode, quantity: 1, location_id: locationId }],
      });

    const shopifyOutbox = await db('outbox')
      .where({ source: 'order', destination: 'shopify' })
      .first();
    expect(shopifyOutbox).toBeFalsy();
  });

  it('rejects duplicate order webhook with 409', async () => {
    const orderId = `test:${Date.now()}:dup`;
    const payload = {
      order_id: orderId,
      webhook_id: 'wh-3',
      line_items: [{ barcode: healthyBarcode, quantity: 1, location_id: locationId }],
    };

    const first = await request(app)
      .post('/api/orders/webhook')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/orders/webhook')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('Already processed');
  });
});
