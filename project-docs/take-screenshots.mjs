import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch();
const page = await browser.newPage();
const base = process.env.APP_URL || 'http://127.0.0.1:3000';
await mkdir(new URL('./screenshots/', import.meta.url), { recursive: true });
try {
  for (const [viewport, width, height] of [['desktop', 1400, 900], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const [name, route] of [['', '/'], ['ongoing-', '/projects/project-events'], ['finished-', '/projects/project-v2-finished'], ['paused-', '/projects/project-v2-paused']]) {
      await page.goto(`${base}${route}`);
      await page.getByRole('heading', { name: route === '/' ? 'Explore projects' : /.+/ }).first().waitFor();
      if (route === '/') await page.locator('.project-card').first().waitFor();
      else {
        await page.locator('.reflection-hero').waitFor();
        await page.getByText('Loading questions…', { exact: true }).waitFor({ state: 'hidden' });
      }
      await page.screenshot({ path: fileURLToPath(new URL(`./screenshots/${name}${viewport}.png`, import.meta.url)), fullPage: true });
    }
  }
} finally { await browser.close(); }
