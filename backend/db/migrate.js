require('dotenv').config({ path: '../.env' });
const knex = require('knex');

// Migrations run against DIRECT_URL (not pooled) — required for DDL
const db = knex({
  client: 'pg',
  connection: process.env.DIRECT_URL,
  migrations: { directory: './db/migrations' },
  pg: { ssl: { rejectUnauthorized: false } },
});

const command = process.argv[2];

async function run() {
  if (command === 'rollback') {
    await db.migrate.rollback();
    console.log('Rollback complete');
  } else {
    await db.migrate.latest();
    console.log('Migrations complete');
  }
  await db.destroy();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
