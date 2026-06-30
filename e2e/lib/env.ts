import * as dotenv from 'dotenv';
import * as path from 'path';

// Load the repo-root .env (SUPABASE_URL / SUPABASE_ANON_KEY live here) and the
// admin frontend .env (REACT_APP_* fallbacks). Explicit process.env always wins.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../frontend-admin/.env') });

export const API_URL = process.env.API_URL || 'http://localhost:3000';
export const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3001';
export const SCANNER_URL = process.env.SCANNER_URL || 'http://localhost:3002';

export const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const DEMO_EMAIL = process.env.DEMO_EMAIL || 'demo@syncstock.dev';
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Surfaced early so a misconfigured env fails loudly instead of as a cryptic 401.
  // eslint-disable-next-line no-console
  console.warn(
    '[e2e] SUPABASE_URL / SUPABASE_ANON_KEY are not set. ' +
      'Ensure the repo-root .env or frontend-admin/.env is present.'
  );
}
