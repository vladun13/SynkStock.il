const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolve: resolveBarcode } = require('../services/barcodeService');
const { sendSyncJob } = require('../services/syncEngine');
const { db } = require('../db/supabase');

const router = express.Router();
router.use(requireAuth);

router.post('/adjust', async (req, res) => {
  const { barcode, locationId, delta, actionId } = req.body;
  const { shopId } = req;

  if (!barcode || !locationId || delta === undefined || !actionId) {
    return res.status(400).json({ error: 'barcode, locationId, delta, actionId are required' });
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return res.status(400).json({ error: 'delta must be a non-zero integer' });
  }

  const product = await resolveBarcode(barcode, shopId);
  if (!product) return res.status(404).json({ error: 'Product not found for this barcode' });

  let newAvailable;
  let outboxId;
  let syncLogId;

  try {
    await db.transaction(async (trx) => {
      // Idempotency INSERT inside txn — rolls back atomically on failure
      const dedupeResult = await trx.raw(
        `INSERT INTO processed_events (event_key, status)
         VALUES (?, 'processing') ON CONFLICT (event_key) DO NOTHING`,
        [actionId]
      );
      if (dedupeResult.rowCount === 0) {
        const err = new Error('Already processed'); err.code = 'DUPLICATE'; throw err;
      }

      // Atomic stock update — 0 rows returned means oversell rejected
      const updateResult = await trx.raw(
        `UPDATE inventory_levels
         SET available = available + ?, updated_at = now()
         WHERE product_id = ? AND location_id = ? AND shop_id = ? AND available + ? >= 0
         RETURNING available`,
        [delta, product.productId, locationId, shopId, delta]
      );
      if (updateResult.rows.length === 0) {
        const err = new Error('Insufficient stock'); err.code = 'OVERSELL'; throw err;
      }
      newAvailable = updateResult.rows[0].available;

      // Transactional outbox — same txn as stock update
      const outboxResult = await trx.raw(
        `INSERT INTO outbox (shop_id, source, destination, payload, status)
         VALUES (?, 'scan', 'shopify', ?, 'pending') RETURNING id`,
        [shopId, JSON.stringify({ productId: product.productId, shopifyInventoryItemId: product.shopifyInventoryItemId, locationId, delta })]
      );
      outboxId = outboxResult.rows[0].id;

      // Sync log with status='pending' — worker flips to 'synced' after Shopify call
      const logResult = await trx.raw(
        `INSERT INTO sync_logs (shop_id, product_id, location_id, delta, available_after, origin, status)
         VALUES (?, ?, ?, ?, ?, 'scan', 'pending') RETURNING id`,
        [shopId, product.productId, locationId, delta, newAvailable]
      );
      syncLogId = logResult.rows[0].id;
    });
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(409).json({ error: 'Already processed' });
    if (err.code === 'OVERSELL') return res.status(409).json({ error: 'Insufficient stock' });
    console.error('Adjust error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  // Enqueue AFTER transaction commit
  sendSyncJob({
    outboxId,
    shopId,
    shopifyInventoryItemId: product.shopifyInventoryItemId,
    locationId,
    delta,
    productId: product.productId,
    newAvailable,
    syncLogId,
    actionId,
  }).catch(err => console.error('Failed to enqueue sync job:', err));

  // Return 'pending' — Realtime drives the pending→synced UI badge flip
  return res.json({ available: newAvailable, syncStatus: 'pending' });
});

router.get('/:locationId', async (req, res) => {
  const { locationId } = req.params;
  const { shopId } = req;
  try {
    const rows = await db('inventory_levels as il')
      .join('products as p', 'p.id', 'il.product_id')
      .where({ 'il.location_id': locationId, 'il.shop_id': shopId })
      .select('il.id', 'il.product_id', 'il.available', 'il.updated_at',
              'p.title', 'p.sku', 'p.barcode', 'p.image_url')
      .orderBy('p.title');
    return res.json(rows);
  } catch (err) {
    console.error('Inventory fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
