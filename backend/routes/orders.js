const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { resolve: resolveBarcode } = require('../services/barcodeService');
const { db } = require('../db/supabase');

const router = express.Router();

// Real Shopify webhooks are unauthenticated (HMAC verified).
// In DEMO_MODE we accept a simplified JSON payload via the authenticated admin UI.
if (process.env.DEMO_MODE === 'true') {
  router.use(requireAuth);
} else {
  // TODO: real Shopify webhook HMAC verification middleware
  router.use((req, res, next) => next());
}

router.post('/webhook', async (req, res) => {
  const { order_id, webhook_id, line_items } = req.body;
  const shopId = req.shopId;

  if (!order_id || !webhook_id || !Array.isArray(line_items) || line_items.length === 0) {
    return res.status(400).json({ error: 'order_id, webhook_id, and line_items are required' });
  }

  const eventKey = `orders/create:${order_id}:${webhook_id}`;

  try {
    await db.transaction(async (trx) => {
      // Idempotency
      const dedupeResult = await trx.raw(
        `INSERT INTO processed_events (event_key, status)
         VALUES (?, 'processing') ON CONFLICT (event_key) DO NOTHING`,
        [eventKey]
      );
      if (dedupeResult.rowCount === 0) {
        const err = new Error('Already processed'); err.code = 'DUPLICATE'; throw err;
      }

      for (const item of line_items) {
        const { barcode, quantity, location_id: locationId } = item;
        if (!barcode || !Number.isInteger(quantity) || quantity <= 0 || !locationId) {
          const err = new Error('Invalid line_item: barcode, positive quantity, and location_id required');
          err.code = 'BAD_ITEM';
          throw err;
        }

        const product = await trx('products')
          .where({ barcode, shop_id: shopId })
          .select('id', 'shopify_inventory_item_id')
          .first();

        if (!product) {
          const err = new Error(`Product not found for barcode ${barcode}`);
          err.code = 'NOT_FOUND';
          throw err;
        }

        const delta = -quantity;
        const updateResult = await trx.raw(
          `UPDATE inventory_levels
           SET available = available + ?, updated_at = now()
           WHERE product_id = ? AND location_id = ? AND shop_id = ? AND available + ? >= 0
           RETURNING available`,
          [delta, product.id, locationId, shopId, delta]
        );
        if (updateResult.rows.length === 0) {
          const err = new Error(`Insufficient stock for barcode ${barcode}`);
          err.code = 'OVERSELL';
          throw err;
        }
        const newAvailable = updateResult.rows[0].available;

        // Shopify already decremented its own stock, so we do NOT enqueue shopify-sync.
        // We optionally record an ERP outbox row for visibility in the demo bridge.
        await trx.raw(
          `INSERT INTO outbox (shop_id, source, destination, payload, status)
           VALUES (?, 'order', 'odoo', ?, 'pending')`,
          [shopId, JSON.stringify({ productId: product.id, locationId, delta })]
        );

        await trx.raw(
          `INSERT INTO sync_logs (shop_id, product_id, location_id, delta, available_after, origin, status)
           VALUES (?, ?, ?, ?, ?, 'order', 'synced')`,
          [shopId, product.id, locationId, delta, newAvailable]
        );
      }

      // Mark event done after successful processing
      await trx('processed_events').where({ event_key: eventKey }).update({ status: 'done' });
    });
  } catch (err) {
    if (err.code === 'DUPLICATE') return res.status(409).json({ error: 'Already processed' });
    if (err.code === 'OVERSELL') return res.status(409).json({ error: err.message });
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
    if (err.code === 'BAD_ITEM') return res.status(400).json({ error: err.message });
    console.error('Order webhook error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  return res.json({ ok: true, message: 'Order processed' });
});

module.exports = router;
