exports.up = async (knex) => {
  await knex.schema.alterTable('products', (t) => {
    t.text('image_url');
  });
  await knex.schema.alterTable('sync_logs', (t) => {
    t.string('status').notNullable().defaultTo('pending');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('sync_logs', (t) => t.dropColumn('status'));
  await knex.schema.alterTable('products', (t) => t.dropColumn('image_url'));
};
