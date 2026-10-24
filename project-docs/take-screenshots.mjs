// Start the rehearsal with .\start.ps1 first.
// Requires an existing Playwright installation and Chromium browser.
// Optional PLAYWRIGHT_MODULE: absolute path to an existing Playwright package.
// SITE_URL defaults to the actual local Vite route. No external API calls.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SITE_URL || 'http://127.0.0.1:5173';
const OUT = join(__dirname, 'screenshots');
mkdirSync(OUT, { recursive: true });
const shots = [
  { name: 'practice-desktop', path: '/', viewport: { width: 1280, height: 900 } },
  { name: 'practice-result', path: '/', viewport: { width: 1280, height: 900 }, submit: true },
  { name: 'practice-mobile', path: '/', viewport: { width: 390, height: 844 }, submit: true },
];
const browser = await chromium.launch();
try {
  for (const shot of shots) {
    const ctx = await browser.newContext({ viewport: shot.viewport });
    try {
      const page = await ctx.newPage();
      await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.getByRole('heading', { name: '前后端联调练习' }).waitFor();
      if (shot.submit) {
        await page.getByLabel('测试文字').fill('文档截图联调测试');
        await page.getByRole('button', { name: '发送到后端' }).click();
        await page.getByRole('heading', { name: '联调成功' }).waitFor();
      }
      await page.screenshot({ path: join(OUT, shot.name + '.png'), fullPage: false });
      console.log(shot.name + ': OK');
    } finally { await ctx.close(); }
  }
} finally { await browser.close(); }
console.log('Update capture dates in project-docs/index.html if these files change.');
