const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db } = require('../db/supabase');

const router = express.Router();
router.use(requireAuth);

function stockFor(idx) {
  if (idx < 2) return [0, 0];
  if (idx < 7) { const q = (idx % 3) + 1; return [q, q]; }
  if (idx < 11) return [50 + idx * 7, 0];
  if (idx < 13) return [0, 50 + idx * 7];
  return [20 + idx * 6, 20 + (29 - idx) * 5];
}

router.post('/reset', async (req, res) => {
  const { shopId } = req;
  try {
    const products = await db('products').where({ shop_id: shopId }).select('id').orderBy('created_at');
    const locations = await db('locations').where({ shop_id: shopId }).orderBy('shopify_location_id').select('id');
    if (products.length === 0 || locations.length < 2) {
      return res.status(400).json({ error: 'Run seed first' });
    }
    const [mainId, tlvId] = [locations[0].id, locations[1].id];
    await Promise.all(products.map(async (p, i) => {
      const [mainQty, tlvQty] = stockFor(i);
      await db('inventory_levels').where({ product_id: p.id, location_id: mainId }).update({ available: mainQty, updated_at: db.fn.now() });
      await db('inventory_levels').where({ product_id: p.id, location_id: tlvId }).update({ available: tlvQty, updated_at: db.fn.now() });
    }));
    await db('processed_events').where({ status: 'processing' }).del();
    return res.json({ ok: true, message: 'Demo stock reset to initial values' });
  } catch (err) {
    console.error('Reset error:', err);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
