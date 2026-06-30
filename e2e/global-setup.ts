import { request } from '@playwright/test';
import { login } from './lib/supa';
import { resetDemo } from './lib/backend';

/** Reset demo stock to the seeded baseline so every run starts deterministic. */
export default async function globalSetup() {
  const ctx = await request.newContext();
  try {
    const { token } = await login(ctx);
    const res = await resetDemo(ctx, token);
    if (!res.ok()) {
      throw new Error(
        `Demo reset failed (${res.status()}): ${await res.text()}. ` +
          `Did you run 'npm run migrate && npm run seed' in backend, and is DEMO_MODE=true?`
      );
    }
    // eslint-disable-next-line no-console
    console.log('[e2e] global-setup: demo stock reset to baseline.');
  } finally {
    await ctx.dispose();
  }
}
