const { db } = require('../db/supabase');

// Resolve a scanned barcode OR a manually typed SKU to a product, scoped to the shop.
async function resolve(code, shopId) {
  const rows = await db('products')
    .where({ shop_id: shopId })
    .andWhere((b) => b.where('barcode', code).orWhere('sku', code))
    .select('id', 'shopify_inventory_item_id', 'title', 'sku', 'image_url', 'barcode')
    .limit(1);

  if (rows.length === 0) return null;

  return {
    productId: rows[0].id,
    shopifyInventoryItemId: rows[0].shopify_inventory_item_id,
    title: rows[0].title,
    sku: rows[0].sku,
    imageUrl: rows[0].image_url,
    barcode: rows[0].barcode,
  };
}

module.exports = { resolve };
