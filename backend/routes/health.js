const express = require('express');
const { checkConnection } = require('../db/supabase');
const { getIntegrationStatus } = require('../config');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await checkConnection();
    const integrations = getIntegrationStatus();
    res.json({
      status: 'ok',
      db: 'connected',
      integrations,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

module.exports = router;
