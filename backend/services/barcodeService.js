const { db } = require('../db/supabase');

async function resolve(barcode, shopId) {
  const rows = await db('products')
    .where({ barcode, shop_id: shopId })
    .select('id', 'shopify_inventory_item_id', 'title', 'sku', 'image_url')
    .limit(1);

  if (rows.length === 0) return null;

  return {
    productId: rows[0].id,
    shopifyInventoryItemId: rows[0].shopify_inventory_item_id,
    title: rows[0].title,
    sku: rows[0].sku,
    imageUrl: rows[0].image_url,
  };
}

module.exports = { resolve };
