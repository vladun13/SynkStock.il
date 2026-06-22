exports.up = async (knex) => {
  await knex.raw(`
    ALTER TABLE sync_logs
      ADD CONSTRAINT sync_logs_product_id_fkey
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  `);
  await knex.raw(`
    ALTER TABLE sync_logs
      ADD CONSTRAINT sync_logs_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
  `);
  // Reload PostgREST schema cache so it picks up the new FKs
  await knex.raw(`NOTIFY pgrst, 'reload schema'`);
};

exports.down = async (knex) => {
  await knex.raw(`ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_location_id_fkey`);
  await knex.raw(`ALTER TABLE sync_logs DROP CONSTRAINT IF EXISTS sync_logs_product_id_fkey`);
};
