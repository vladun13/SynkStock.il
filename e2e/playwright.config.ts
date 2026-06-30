import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { ADMIN_URL, SCANNER_URL, API_URL } from './lib/env';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1, // shared demo DB state — keep deterministic
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: require.resolve('./global-setup'),
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: ADMIN_URL,
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Boots backend + both CRA dev servers. reuseExistingServer lets you run
  // against an already-running stack. CRA is slow to compile → generous timeout.
  webServer: [
    {
      command: 'npm start',
      cwd: path.resolve(__dirname, '../backend'),
      url: `${API_URL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'BROWSER=none npm start',
      cwd: path.resolve(__dirname, '../frontend-admin'),
      url: ADMIN_URL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'BROWSER=none npm start',
      cwd: path.resolve(__dirname, '../frontend-scanner'),
      url: SCANNER_URL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
