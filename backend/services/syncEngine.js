const PgBoss = require('pg-boss');
const { db } = require('../db/supabase');
const shopifyClient = require('./shopifyClient');

let boss;

async function getBoss() {
  if (!boss) {
    boss = new PgBoss({
      connectionString: process.env.DIRECT_URL,
      ssl: { rejectUnauthorized: false },
      retryLimit: 3,
      retryDelay: 5,
    });
    await boss.start();
    // pg-boss v10 requires queues to be created explicitly before send()/work();
    // without this, send() is a silent no-op and jobs are never enqueued.
    await boss.createQueue('shopify-sync');
  }
  return boss;
}

// pg-boss v10 delivers a batch (array) of jobs to the work handler.
async function handleSyncJob({ data }) {
  const {
    outboxId,
    shopId,
    shopifyInventoryItemId,
    locationId,
    delta,
    productId,
    syncLogId,
    actionId,
  } = data;

  await shopifyClient.adjustInventory(shopifyInventoryItemId, locationId, delta);

  await db('outbox').where({ id: outboxId }).update({
    status: 'done',
    processed_at: db.fn.now(),
  });

  if (syncLogId) {
    await db('sync_logs').where({ id: syncLogId }).update({ status: 'synced' });
  } else {
    // Fallback for any jobs that don't carry the exact log id
    const logRow = await db('sync_logs')
      .where({ shop_id: shopId, product_id: productId, location_id: locationId, status: 'pending' })
      .orderBy('created_at', 'desc')
      .first();
    if (logRow) {
      await db('sync_logs').where({ id: logRow.id }).update({ status: 'synced' });
    }
  }

  if (actionId) {
    await db('processed_events').where({ event_key: actionId }).update({ status: 'done' });
  }
}

async function startSyncWorker() {
  const b = await getBoss();
  await b.work('shopify-sync', { batchSize: 5 }, async (jobs) => {
    for (const job of jobs) {
      await handleSyncJob(job);
    }
  });
  return b;
}

async function sendSyncJob(data) {
  const b = await getBoss();
  await b.send('shopify-sync', data);
}

async function stopBoss() {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}

module.exports = { startSyncWorker, sendSyncJob, stopBoss };
