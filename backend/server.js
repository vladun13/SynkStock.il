require('dotenv').config({ path: '../.env' });
const { validateEnv, getIntegrationStatus } = require('./config');
validateEnv();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const healthRouter = require('./routes/health');
const inventoryRouter = require('./routes/inventory');
const ordersRouter = require('./routes/orders');
const erpRouter = require('./routes/erp');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : [];

if (allowedOrigins.length === 0) {
  console.error('ALLOWED_ORIGINS is not set. Set it in .env to permit CORS requests.');
  process.exit(1);
}

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/health', healthRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/erp', erpRouter);

if (process.env.DEMO_MODE === 'true') {
  const demoRouter = require('./routes/demo');
  app.use('/api/demo', demoRouter);
}

async function startWorker() {
  try {
    const { startSyncWorker } = require('./services/syncEngine');
    await startSyncWorker();
    console.log('  ✓ pg-boss    : shopify-sync worker running');
  } catch (err) {
    console.error('  ✗ pg-boss    : failed to start worker', err.message);
  }
}

function start() {
  return app.listen(PORT, async () => {
    await startWorker();

    const integrations = getIntegrationStatus();

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(' SyncStock IL — Backend');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Port       : ${PORT}`);
    console.log(`  Health     : http://localhost:${PORT}/health`);
    console.log(`  DEMO_MODE  : ${process.env.DEMO_MODE === 'true' ? 'ON' : 'off'}`);
    console.log('  ✓ Supabase  : connected');
    console.log(`  ${integrations.shopify ? '✓' : '○'} Shopify   : ${integrations.shopify ? 'connected' : 'not configured'}`);
    console.log(`  ${integrations.odoo ? '✓' : '○'} Odoo      : ${integrations.odoo ? 'connected' : 'not configured'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  });
}

module.exports = app;

if (require.main === module) {
  start();
}
