import { defineConfig } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Build first. Each run starts a separate production server with an isolated database.
const port = Number(process.env.E2E_PORT || 3100);
const baseURL = `http://127.0.0.1:${port}`;
const mockPort = Number(process.env.E2E_MOCK_AI_PORT || port + 99);
const githubPort = Number(process.env.E2E_MOCK_GITHUB_PORT || port + 100);
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
  webServer: [
    {
      command: `node tests/e2e/mock-github.mjs ${githubPort}`,
      url: `http://127.0.0.1:${githubPort}/`,
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      command: `node tests/e2e/mock-openai.mjs ${mockPort}`,
      url: `http://127.0.0.1:${mockPort}/`,
      reuseExistingServer: false,
      timeout: 20_000,
    },
    {
      // P3 fixtures use dates relative to now and only touch this run's temporary database.
      command: `npx tsx tests/e2e/p3-fixtures.ts && npm run start -- --port ${port}`,
      url: `${baseURL}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      // Explicit values override any .env.local, so tests never use a real key or model.
      env: {
        DATABASE_MODE: 'pglite',
        PGLITE_DATA_DIR: path.join(tmpdir(), `pass-it-on-e2e-${randomUUID()}`),
        OPENAI_API_KEY: 'e2e-mock-key-not-real',
        OPENAI_PROJECT_INTRO_MODEL: 'e2e-mock-model',
        OPENAI_BASE_URL: `http://127.0.0.1:${mockPort}/v1`,
        GITHUB_API_BASE_URL: `http://127.0.0.1:${githubPort}`,
        AI_ANALYSIS_RUNNER_ENABLED: '1',
        // P4 runner: proves automatic invitations without any browser page (only this temporary database).
        INVITATION_RUNNER_ENABLED: '1',
      },
    },
  ],
});
