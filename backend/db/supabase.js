const { createClient } = require('@supabase/supabase-js');
const knex = require('knex');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Pooled connection (pgbouncer transaction mode) — app queries only, no DDL
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
  // Required under pgbouncer transaction mode
  asyncStackTraces: false,
  pg: { ssl: { rejectUnauthorized: false } },
});

// pgbouncer transaction mode: no prepared statements
db.client.driver.defaults.parseInputDatesAsUTC = true;

async function checkConnection() {
  await db.raw('SELECT 1');
}

module.exports = { supabaseAdmin, db, checkConnection };
