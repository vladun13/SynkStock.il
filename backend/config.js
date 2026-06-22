const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'DIRECT_URL'];

const OPTIONAL = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'HOST'];

function validateEnv() {
  // Outside DEMO_MODE, the Shopify webhook HMAC secret is mandatory — without it
  // the order webhook cannot authenticate inbound requests and fails closed.
  const required = process.env.DEMO_MODE === 'true'
    ? REQUIRED
    : [...REQUIRED, 'SHOPIFY_API_SECRET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Copy .env.example to .env and fill in all values.');
    process.exit(1);
  }
}

function getIntegrationStatus() {
  return {
    shopify: !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    odoo: !!(process.env.ODOO_URL && process.env.ODOO_PASSWORD),
  };
}

module.exports = { validateEnv, getIntegrationStatus };
