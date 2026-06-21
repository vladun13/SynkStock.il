require('dotenv').config({ path: '../.env' });
const { supabaseAdmin } = require('./supabase');
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DIRECT_URL,
  pg: { ssl: { rejectUnauthorized: false } },
});

function ean13(prefix12) {
  const digits = prefix12.toString().padStart(12, '0').split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return prefix12 + check.toString();
}

const PRODUCTS = [
  'ספר לימוד מתמטיקה', 'כיסא משרדי ארגונומי', 'מחשב נייד 15 אינץ',
  'עט כדורי שחור', 'מחברת A4 100 עמודים', 'אוזניות אלחוטיות',
  'עכבר אלחוטי', 'מקלדת מכנית', 'צג 27 אינץ', 'שולחן עמידה מתכוונן',
  'מנורת שולחן LED', 'תיק גב למחשב נייד', 'מטען USB-C 65W',
  'כבל HDMI 2 מטר', 'רמקול בלוטות', 'מצלמת רשת HD', 'מאוורר שולחני',
  'מחזיק לפלאפון', 'לוח מחיקה יבשה', 'סל ניירות משרדי',
  'דיו למדפסת שחור', 'נייר A4 500 גיליונות', 'סכין פותחן מעטפות',
  'מהדק ניירות אוטומטי', 'לוח פקקים', 'פלאש דיסק 64GB',
  'כרטיסיות דביקות', 'מחשבון מדעי', 'עמדת טעינה מרובת יציאות', 'מארגן שולחן',
];

// [mainWarehouse, tlvStore]
// 0-1: out of stock; 2-6: low (1-3 both); 7-10: healthy↔0; 11-12: 0↔healthy; 13-29: healthy both
function stockFor(idx) {
  if (idx < 2) return [0, 0];
  if (idx < 7) { const q = (idx % 3) + 1; return [q, q]; }
  if (idx < 11) return [50 + idx * 7, 0];
  if (idx < 13) return [0, 50 + idx * 7];
  return [20 + idx * 6, 20 + (29 - idx) * 5];
}

const ORIGINS = ['scan', 'order', 'manual'];

async function seed() {
  console.log('Seeding demo data...');

  let userId;
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existing?.users?.find(u => u.email === 'demo@syncstock.dev');

  if (existingUser) {
    userId = existingUser.id;
    console.log('  ✓ Demo user exists:', userId);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'demo@syncstock.dev',
      password: 'demo1234',
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log('  ✓ Demo user created:', userId);
  }

  await db('shops').insert({
    id: userId,
    shopify_domain: 'demo.myshopify.com',
    is_active: true,
  }).onConflict('id').merge({ shopify_domain: 'demo.myshopify.com', is_active: true });
  console.log('  ✓ Shop upserted');

  const locationRows = await db('locations')
    .insert([
      { shop_id: userId, name: 'מחסן ראשי', shopify_location_id: 1001 },
      { shop_id: userId, name: 'חנות תל אביב', shopify_location_id: 1002 },
    ])
    .onConflict(['shop_id', 'shopify_location_id'])
    .merge({ name: db.raw('EXCLUDED.name') })
    .returning('id');
  const [mainId, tlvId] = locationRows.map(r => r.id);
  console.log('  ✓ Locations upserted');

  const productInserts = PRODUCTS.map((title, i) => ({
    shop_id: userId,
    shopify_product_id: 10000000 + i,
    shopify_variant_id: 20000000 + i,
    shopify_inventory_item_id: 30000000 + i,
    title,
    sku: `SKU-${String(i + 1).padStart(3, '0')}`,
    barcode: ean13(String(40000000 + i).padStart(12, '0')),
    image_url: `https://picsum.photos/seed/SKU-${String(i + 1).padStart(3, '0')}/200/200`,
  }));

  const productRows = await db('products')
    .insert(productInserts)
    .onConflict(['shop_id', 'shopify_variant_id'])
    .merge({
      title: db.raw('EXCLUDED.title'),
      sku: db.raw('EXCLUDED.sku'),
      barcode: db.raw('EXCLUDED.barcode'),
      image_url: db.raw('EXCLUDED.image_url'),
    })
    .returning('id');
  const productIds = productRows.map(r => r.id);
  console.log(`  ✓ ${productIds.length} products upserted`);

  const invInserts = [];
  productIds.forEach((productId, i) => {
    const [mainQty, tlvQty] = stockFor(i);
    invInserts.push({ shop_id: userId, product_id: productId, location_id: mainId, available: mainQty });
    invInserts.push({ shop_id: userId, product_id: productId, location_id: tlvId, available: tlvQty });
  });
  await db('inventory_levels')
    .insert(invInserts)
    .onConflict(['product_id', 'location_id'])
    .merge({ available: db.raw('EXCLUDED.available') });
  console.log(`  ✓ ${invInserts.length} inventory_levels upserted`);

  const syncLogInserts = Array.from({ length: 12 }, (_, i) => ({
    shop_id: userId,
    product_id: productIds[i % productIds.length],
    location_id: i % 2 === 0 ? mainId : tlvId,
    origin: ORIGINS[i % 3],
    delta: i % 2 === 0 ? -1 : 1,
    available_after: 10 + i,
    status: 'synced',
    created_at: new Date(Date.now() - Math.floor(i / 2) * 86400000 - i * 3600000),
  }));
  await db('sync_logs').insert(syncLogInserts);
  console.log(`  ✓ 12 sync_log history rows inserted`);

  console.log('\nSeed complete. Demo credentials: demo@syncstock.dev / demo1234');
  await db.destroy();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
