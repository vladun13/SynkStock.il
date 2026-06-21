const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { db } = require('../db/supabase');
const odooClient = require('../services/odooClient');

const router = express.Router();
router.use(requireAuth);

router.get('/settings', async (req, res) => {
  const { shopId } = req;
  try {
    const row = await db('erp_settings').where({ shop_id: shopId }).first();
    if (!row) return res.json({ settings: null });
    return res.json({
      settings: {
        id: row.id,
        erp_type: row.erp_type,
        url: row.url,
        database_name: row.database_name,
        username: row.username,
        is_connected: row.is_connected,
        last_synced_at: row.last_synced_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    });
  } catch (err) {
    console.error('ERP settings fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/settings', async (req, res) => {
  const { shopId } = req;
  const { erp_type, url, database_name, username, password } = req.body;

  if (!erp_type || !url || !database_name || !username) {
    return res.status(400).json({ error: 'erp_type, url, database_name, and username are required' });
  }

  try {
    const existing = await db('erp_settings').where({ shop_id: shopId }).first();
    let vaultSecretId = existing?.vault_secret_id;

    if (password) {
      if (vaultSecretId) {
        // Update existing secret in place to avoid unique name collisions
        await db.raw(
          'SELECT vault.update_secret(?, ?, ?, ?)',
          [vaultSecretId, password, `erp-${erp_type}-${shopId}`, `ERP password for shop ${shopId}`]
        );
      } else {
        const result = await db.raw(
          'SELECT vault.create_secret(?, ?, ?) AS secret_id',
          [password, `erp-${erp_type}-${shopId}`, `ERP password for shop ${shopId}`]
        );
        vaultSecretId = result.rows[0].secret_id;
      }
    }

    const payload = {
      shop_id: shopId,
      erp_type,
      url,
      database_name,
      username,
      vault_secret_id: vaultSecretId,
      is_connected: false,
      updated_at: db.fn.now(),
    };

    await db('erp_settings')
      .insert(payload)
      .onConflict('shop_id')
      .merge({
        erp_type: db.raw('EXCLUDED.erp_type'),
        url: db.raw('EXCLUDED.url'),
        database_name: db.raw('EXCLUDED.database_name'),
        username: db.raw('EXCLUDED.username'),
        vault_secret_id: vaultSecretId ? db.raw('EXCLUDED.vault_secret_id') : undefined,
        is_connected: db.raw('EXCLUDED.is_connected'),
        updated_at: db.raw('EXCLUDED.updated_at'),
      });

    return res.json({ ok: true });
  } catch (err) {
    console.error('ERP settings save error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test', async (req, res) => {
  const { shopId } = req;
  try {
    const settings = await db('erp_settings').where({ shop_id: shopId }).first();
    if (!settings) {
      return res.status(400).json({ error: 'Save ERP settings first' });
    }

    const result = await odooClient.testConnection(settings);

    await db('erp_settings')
      .where({ shop_id: shopId })
      .update({
        is_connected: result.success,
        last_synced_at: result.success ? db.fn.now() : null,
        updated_at: db.fn.now(),
      });

    return res.json(result);
  } catch (err) {
    console.error('ERP test error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
