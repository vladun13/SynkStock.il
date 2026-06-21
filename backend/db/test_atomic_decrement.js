/**
 * Concurrency test for the atomic decrement primitive.
 * Fires N parallel requests against the last unit — exactly one must succeed.
 *
 * Run: node db/test_atomic_decrement.js
 */
require('dotenv').config({ path: '../.env' });
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DIRECT_URL,
  pg: { ssl: { rejectUnauthorized: false } },
});

const CONCURRENCY = 10;

async function atomicDecrement(db, id, delta) {
  const rows = await db.raw(
    `UPDATE inventory_levels
        SET available = available + ?,
            updated_at = now()
      WHERE id = ? AND available + ? >= 0
  RETURNING available`,
    [delta, id, delta]
  );
  return rows.rows[0] ?? null; // null = would oversell
}

async function run() {
  // ── Setup: insert a test shop + product + location + inventory row ────────
  const [shop] = await db('shops')
    .insert({ shopify_domain: `test-concurrency-${Date.now()}.myshopify.com` })
    .returning('id');

  const [product] = await db('products')
    .insert({
      shop_id: shop.id,
      shopify_product_id: 1,
      shopify_variant_id: 1,
      title: 'Test Product',
    })
    .returning('id');

  const [location] = await db('locations')
    .insert({ shop_id: shop.id, name: 'Warehouse', shopify_location_id: 1 })
    .returning('id');

  const [level] = await db('inventory_levels')
    .insert({ shop_id: shop.id, product_id: product.id, location_id: location.id, available: 1 })
    .returning('id');

  console.log(`\nFiring ${CONCURRENCY} parallel sell(-1) requests against 1 available unit...`);

  // ── Run N parallel decrements ─────────────────────────────────────────────
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, () => atomicDecrement(db, level.id, -1))
  );

  const successes = results.filter(Boolean);
  const rejections = results.filter((r) => r === null);

  console.log(`  Successes : ${successes.length} (expected 1)`);
  console.log(`  Rejections: ${rejections.length} (expected ${CONCURRENCY - 1})`);

  const [final] = await db('inventory_levels').where({ id: level.id }).select('available');
  console.log(`  Final stock: ${final.available} (expected 0)`);

  // ── Verify ────────────────────────────────────────────────────────────────
  const passed =
    successes.length === 1 &&
    rejections.length === CONCURRENCY - 1 &&
    final.available === 0;

  if (passed) {
    console.log('\n✓ PASS — atomic decrement is concurrency-safe\n');
  } else {
    console.error('\n✗ FAIL — oversell detected or wrong counts\n');
    process.exitCode = 1;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  await db('shops').where({ id: shop.id }).delete();
  await db.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
