const request = require('supertest');
const app = require('../server');
const { db, runMigrations, seedDemo, getDemoToken, cleanupBetweenTests, destroy } = require('./helpers');

let token;
let locationId;
let outOfStockBarcode;
let healthyBarcode;

beforeAll(async () => {
  await runMigrations();
  await seedDemo();
  token = await getDemoToken();

  locationId = (await db('locations').where({ shopify_location_id: 1001 }).first()).id;
  outOfStockBarcode = (await db('products').where({ sku: 'SKU-001' }).first()).barcode;
  healthyBarcode = (await db('products').where({ sku: 'SKU-003' }).first()).barcode;
}, 60000);

afterEach(async () => {
  await cleanupBetweenTests();
  // Re-fetch mutable references after reset
  locationId = (await db('locations').where({ shopify_location_id: 1001 }).first()).id;
  outOfStockBarcode = (await db('products').where({ sku: 'SKU-001' }).first()).barcode;
  healthyBarcode = (await db('products').where({ sku: 'SKU-003' }).first()).barcode;
}, 60000);

afterAll(async () => {
  await destroy();
});

describe('POST /api/inventory/adjust', () => {
  it('succeeds and returns pending sync status', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barcode: healthyBarcode,
        locationId,
        delta: -1,
        actionId: `test:${Date.now()}:ok`,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('available');
    expect(res.body.syncStatus).toBe('pending');
  });

  it('rejects oversell with 409', async () => {
    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barcode: outOfStockBarcode,
        locationId,
        delta: -1,
        actionId: `test:${Date.now()}:oversell`,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Insufficient stock');
  });

  it('rejects duplicate actionId with 409', async () => {
    const actionId = `test:${Date.now()}:dup`;

    const first = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barcode: healthyBarcode,
        locationId,
        delta: -1,
        actionId,
      });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/inventory/adjust')
      .set('Authorization', `Bearer ${token}`)
      .send({
        barcode: healthyBarcode,
        locationId,
        delta: -1,
        actionId,
      });
    expect(second.status).toBe(409);
    expect(second.body.error).toBe('Already processed');
  });
});

describe('GET /api/inventory/:locationId', () => {
  it('returns shop-scoped inventory rows', async () => {
    const res = await request(app)
      .get(`/api/inventory/${locationId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('product_id');
    expect(res.body[0]).toHaveProperty('available');
  });
});
