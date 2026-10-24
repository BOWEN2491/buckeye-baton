import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Build first. Each run starts a separate production server with an isolated database.
const port = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 1400, height: 900 },
    actionTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_MODE: 'pglite',
      PGLITE_DATA_DIR: path.join(tmpdir(), `pass-it-on-e2e-${randomUUID()}`),
    },
  },
});
