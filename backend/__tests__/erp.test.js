const request = require('supertest');
const app = require('../server');
const { db, runMigrations, seedDemo, getDemoToken, cleanupBetweenTests, destroy } = require('./helpers');

let token;

beforeAll(async () => {
  await runMigrations();
  await seedDemo();
  token = await getDemoToken();
}, 60000);

afterEach(async () => {
  await cleanupBetweenTests();
}, 60000);

afterAll(async () => {
  await destroy();
});

describe('ERP settings', () => {
  it('saves Odoo settings and stores a vault secret id, not plaintext password', async () => {
    const res = await request(app)
      .post('/api/erp/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        erp_type: 'odoo',
        url: 'http://localhost:8069',
        database_name: 'odoo',
        username: 'admin',
        password: 'secret123',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const row = await db('erp_settings').first();
    expect(row).toBeTruthy();
    expect(row.vault_secret_id).toBeTruthy();
    expect(row.password).toBeFalsy(); // column doesn't exist
    expect(row.vault_secret_id).not.toBe('secret123');
  });

  it('tests Odoo connection in DEMO_MODE', async () => {
    await request(app)
      .post('/api/erp/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        erp_type: 'odoo',
        url: 'http://localhost:8069',
        database_name: 'odoo',
        username: 'admin',
        password: 'secret123',
      });

    const res = await request(app)
      .post('/api/erp/test')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const row = await db('erp_settings').first();
    expect(row.is_connected).toBe(true);
  });
});
