const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'DIRECT_URL'];

const OPTIONAL = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'HOST'];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
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
