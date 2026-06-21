require('dotenv').config({ path: '../.env' });
const knex = require('knex');
const { createClient } = require('@supabase/supabase-js');
const { stopBoss } = require('../services/syncEngine');

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DIRECT_URL;

const db = knex({
  client: 'pg',
  connection: TEST_DB_URL,
  pg: { ssl: { rejectUnauthorized: false } },
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function runMigrations() {
  await db.migrate.latest({ directory: './db/migrations' });
}

async function seedDemo() {
  // Re-use the seed script logic by spawning it
  const { execSync } = require('child_process');
  execSync('npm run seed', { cwd: __dirname + '/..', stdio: 'ignore' });
}

async function getDemoToken() {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: 'demo@syncstock.dev',
    password: 'demo1234',
  });
  if (error) throw error;
  return data.session.access_token;
}

async function cleanupBetweenTests() {
  // Keep demo user, shop, products, locations; reset mutable state
  await db('processed_events').whereLike('event_key', 'test:%').del();
  await db('processed_events').whereLike('event_key', 'orders/create:test:%').del();
  await db('outbox').del();
  await db('sync_logs').whereRaw("origin IN ('scan', 'order')").del();

  // Reset inventory to seeded values
  const { execSync } = require('child_process');
  execSync('npm run seed', { cwd: __dirname + '/..', stdio: 'ignore' });
}

async function destroy() {
  await stopBoss();
  await db.destroy();
  await supabaseAnon.auth.signOut();
}

module.exports = {
  db,
  supabaseAdmin,
  supabaseAnon,
  runMigrations,
  seedDemo,
  getDemoToken,
  cleanupBetweenTests,
  destroy,
};
