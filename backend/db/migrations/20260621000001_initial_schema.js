exports.up = async (knex) => {
  // ── Enable pgcrypto for gen_random_uuid() ────────────────────────────────
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  // ── shops ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('shops', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('shopify_domain').notNullable().unique();
    t.text('access_token');
    t.string('erp_type'); // 'odoo' | 'priority' | null
    t.string('erp_credentials_vault_id'); // Supabase Vault secret ref
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('installed_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── products ─────────────────────────────────────────────────────────────
  await knex.schema.createTable('products', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.bigInteger('shopify_product_id').notNullable();
    t.bigInteger('shopify_variant_id').notNullable();
    t.bigInteger('shopify_inventory_item_id');
    t.text('title');
    t.string('sku');
    t.string('barcode');
    t.string('erp_item_id');
    t.string('erp_part_number');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['shop_id', 'shopify_variant_id']);
  });

  // ── locations ────────────────────────────────────────────────────────────
  await knex.schema.createTable('locations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.text('name').notNullable();
    t.bigInteger('shopify_location_id').notNullable();
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['shop_id', 'shopify_location_id']);
  });

  // ── inventory_levels ─────────────────────────────────────────────────────
  await knex.schema.createTable('inventory_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.uuid('location_id').notNullable().references('id').inTable('locations').onDelete('CASCADE');
    t.integer('available').notNullable().defaultTo(0);
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['product_id', 'location_id']);
  });
  // available must never go negative
  await knex.raw('ALTER TABLE inventory_levels ADD CONSTRAINT available_non_negative CHECK (available >= 0)');

  // ── sync_logs ────────────────────────────────────────────────────────────
  await knex.schema.createTable('sync_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE');
    t.uuid('product_id');
    t.uuid('location_id');
    // origin: scan | order | erp | manual
    t.string('origin').notNullable();
    t.integer('delta');
    t.integer('available_after');
    t.string('erp_destination'); // odoo | priority
    t.string('erp_response_status');
    t.text('error_message');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── erp_settings ─────────────────────────────────────────────────────────
  await knex.schema.createTable('erp_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable().references('id').inTable('shops').onDelete('CASCADE').unique();
    t.string('erp_type').notNullable(); // odoo | priority
    t.text('url');
    t.string('database_name'); // Odoo DB name
    t.string('username');
    t.string('vault_secret_id'); // password stored in Supabase Vault
    t.boolean('is_connected').notNullable().defaultTo(false);
    t.timestamp('last_synced_at', { useTz: true });
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── processed_events (dedupe ledger) ─────────────────────────────────────
  await knex.schema.createTable('processed_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // webhook key: "topic:order_id:webhook_id"
    // offline scan key: "deviceId:timestamp:seq"
    t.text('event_key').notNullable().unique();
    t.string('status').notNullable().defaultTo('processing'); // processing | done | failed
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // ── outbox (transactional outbox) ─────────────────────────────────────────
  await knex.schema.createTable('outbox', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('shop_id').notNullable();
    t.string('source').notNullable(); // scan | order | manual
    t.string('destination').notNullable(); // shopify | odoo | priority
    t.jsonb('payload').notNullable();
    t.string('status').notNullable().defaultTo('pending'); // pending | processing | done | failed
    t.integer('attempts').notNullable().defaultTo(0);
    t.text('last_error');
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('processed_at', { useTz: true });
  });

  // ── Indexes ───────────────────────────────────────────────────────────────
  // shop_id first in every composite index (RLS evaluates this predicate on every query)
  await knex.raw('CREATE INDEX idx_products_shop_id ON products (shop_id, shopify_variant_id)');
  await knex.raw('CREATE INDEX idx_inventory_levels_shop_id ON inventory_levels (shop_id, product_id)');
  await knex.raw('CREATE INDEX idx_sync_logs_shop_id ON sync_logs (shop_id, created_at DESC)');
  await knex.raw('CREATE INDEX idx_outbox_status ON outbox (status, created_at) WHERE status = \'pending\'');
  await knex.raw('CREATE INDEX idx_processed_events_key ON processed_events (event_key)');

  // ── RLS ───────────────────────────────────────────────────────────────────
  // Auth: Supabase Auth (email/password). shops.id = auth.uid() — the user IS the shop.
  // Backend uses service-role key (bypasses RLS for all writes).
  // Frontend uses authenticated session for read-only Realtime.

  const tenantTables = ['products', 'locations', 'inventory_levels', 'sync_logs', 'erp_settings', 'outbox'];

  for (const table of tenantTables) {
    await knex.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await knex.raw(`
      CREATE POLICY tenant_isolation ON ${table}
        FOR SELECT TO authenticated
        USING (shop_id = auth.uid())
    `);
  }

  // shops: id = auth.uid() so the row is visible only to the owner
  await knex.raw('ALTER TABLE shops ENABLE ROW LEVEL SECURITY');
  await knex.raw(`
    CREATE POLICY tenant_isolation ON shops
      FOR SELECT TO authenticated
      USING (id = auth.uid())
  `);

  // processed_events: internal ledger — service role only, no authenticated access
  await knex.raw('ALTER TABLE processed_events ENABLE ROW LEVEL SECURITY');

  // ── Realtime ──────────────────────────────────────────────────────────────
  await knex.raw('ALTER TABLE inventory_levels REPLICA IDENTITY FULL');
  await knex.raw('ALTER TABLE sync_logs REPLICA IDENTITY FULL');
  await knex.raw('ALTER PUBLICATION supabase_realtime ADD TABLE inventory_levels');
  await knex.raw('ALTER PUBLICATION supabase_realtime ADD TABLE sync_logs');
};

exports.down = async (knex) => {
  await knex.raw('ALTER PUBLICATION supabase_realtime DROP TABLE sync_logs');
  await knex.raw('ALTER PUBLICATION supabase_realtime DROP TABLE inventory_levels');

  const tables = [
    'outbox', 'processed_events', 'erp_settings',
    'sync_logs', 'inventory_levels', 'locations', 'products', 'shops',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
