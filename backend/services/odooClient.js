const IS_DEMO = process.env.DEMO_MODE === 'true';
const { db } = require('../db/supabase');

const mock = {
  async testConnection(settings) {
    return { success: true, message: 'DEMO_MODE: Odoo connection OK' };
  },
};

const real = {
  async testConnection({ url, database_name, username, vault_secret_id }) {
    if (!url || !database_name || !username || !vault_secret_id) {
      return { success: false, message: 'Missing Odoo connection settings' };
    }

    let password;
    try {
      const result = await db.raw('SELECT vault.get_secret(?) AS secret', [vault_secret_id]);
      password = result.rows[0]?.secret;
    } catch (err) {
      return { success: false, message: `Failed to read password from Vault: ${err.message}` };
    }

    if (!password) {
      return { success: false, message: 'Password not found in Vault' };
    }

    const Odoo = require('odoo-xmlrpc');
    const odoo = new Odoo({ url, db: database_name, username, password });

    return new Promise((resolve) => {
      odoo.connect((err) => {
        if (err) {
          resolve({ success: false, message: err.message || 'Odoo connection failed' });
        } else {
          resolve({ success: true, message: 'Odoo connection OK' });
        }
      });
    });
  },
};

module.exports = IS_DEMO ? mock : real;
