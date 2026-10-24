import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'pass-it-on-qa');
const errors = new WeakMap<Page, string[]>();

test.beforeAll(async ({ browser, baseURL }) => {
  await mkdir(evidenceDir, { recursive: true });
  const page = await browser.newPage({ baseURL, viewport: { width: 1400, height: 900 } });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Campus Signup', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Exploring as')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDir, 'mobile.png') });
  await page.close();
});

test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', message => { if (message.type() === 'error') messages.push(message.text()); });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'No browser exceptions or console errors').toEqual([]);
});

async function identity(page: Page, id: string) {
  await page.getByLabel('Exploring as').selectOption(id);
  await expect(page.getByLabel('Exploring as')).toHaveValue(id);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('tab', { name: 'Projects', exact: true })).toHaveAttribute('aria-selected', 'true');
}

async function createProject(page: Page, title: string) {
  await page.goto('/projects/new');
  await page.getByLabel('Project name', { exact: true }).fill(title);
  await page.getByLabel('What did you set out to do?').fill('A fictional project used to test the complete knowledge relay.');
  await page.getByLabel('Course or club').fill('E2E test team');
  await page.getByLabel('Term', { exact: true }).fill('Autumn 2026');
  await page.getByLabel('Topics').fill('testing, accessibility');
  await page.getByRole('button', { name: 'Publish project', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  return new URL(page.url()).pathname;
}

test('students pass a lesson through staff and mentor to a later project', async ({ page }) => {
  const run = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sourceTitle = `Source team ${run}`;
  const destinationTitle = `Next team ${run}`;
  const lessonTitle = `Keep essential registration fields ${run}`;
  await page.goto('/');
  await identity(page, 'student-alex');
  const sourcePath = await createProject(page, sourceTitle);
  await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await page.getByLabel('Lesson title').fill(lessonTitle);
  await page.getByLabel('What did you expect?').fill('Every field would be useful at signup.');
  await page.getByLabel('What actually happened?').fill('Test participants found optional questions distracting.');
  await page.getByLabel('What changed, or what would you do next?').fill('Keep essential fields and collect the rest later.');
  await page.getByLabel('When does this apply?').fill('Low risk student event registration; test in your context.');
  await page.getByRole('button', { name: 'Publish lesson', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(lessonTitle) }).click();
  await expect(page).toHaveURL(/\/lessons\/[^/]+$/);
  await expect(page.getByRole('heading', { name: lessonTitle, exact: true })).toBeVisible();
  const lessonPath = new URL(page.url()).pathname;

  await identity(page, 'student-mia');
  const destinationPath = await createProject(page, destinationTitle);
  await page.goto(lessonPath);
  await page.getByLabel('What would you like to ask?').fill('Should dietary details remain required for our event?');
  await page.getByRole('button', { name: 'Post contribution', exact: true }).click();
  await expect(page.getByText('Should dietary details remain required for our event?', { exact: true })).toBeVisible();
  await identity(page, 'staff-kevin');
  await page.goto(lessonPath);
  await page.getByRole('button', { name: 'Connect a mentor' }).click();
  await page.getByRole('combobox', { name: /^Mentor/ }).selectOption('mentor-sarah');
  await page.getByLabel('Why this mentor?').fill('Sarah understands accessible registration design.');
  await page.getByRole('button', { name: 'Send introduction', exact: true }).click();
  await expect(page.getByText('Sarah understands accessible registration design.', { exact: true })).toBeVisible();
  await identity(page, 'mentor-sarah');
  await page.goto(lessonPath);
  await page.getByLabel('Your guidance').fill('Collect essential participation details and test optional dietary questions.');
  await page.getByRole('button', { name: 'Respond to introduction', exact: true }).click();
  await expect(page.getByText('Mentor responded', { exact: true })).toBeVisible();

  await identity(page, 'student-mia');
  await page.goto(lessonPath);
  await page.getByRole('combobox', { name: /^Your project/ }).selectOption({ label: destinationTitle });
  await page.getByRole('button', { name: 'Add to my project', exact: true }).click();
  await expect(page.locator('.adoption-stats strong')).toHaveText('0');
  await page.getByRole('combobox', { name: /^What happened\?/ }).selectOption('partial');
  await page.getByLabel('Your result', { exact: true }).fill('We kept essential fields and tested an optional dietary question.');
  await page.getByRole('button', { name: 'Share result', exact: true }).click();
  await expect(page.locator('.adoption-stats strong')).toHaveText('1');
  await page.getByLabel('Your result', { exact: true }).fill('We tested the adjustment again and kept the improved form.');
  await page.getByRole('button', { name: 'Update result', exact: true }).click();
  await expect(page.locator('.adoption-row').getByText('We tested the adjustment again and kept the improved form.', { exact: true })).toBeVisible();
  await expect(page.locator('.adoption-stats strong')).toHaveText('1');
  await page.reload();
  await expect(page.locator('.adoption-stats strong')).toHaveText('1');
  await page.goto(destinationPath);
  await expect(page.getByRole('heading', { name: 'Lessons we’re building on' })).toBeVisible();
  await expect(page.getByRole('link', { name: lessonTitle, exact: true })).toHaveAttribute('href', lessonPath);
  await expect(page.getByRole('link', { name: sourceTitle, exact: true })).toHaveAttribute('href', sourcePath);
  await page.goto(sourcePath);
  await expect(page.getByRole('link', { name: destinationTitle, exact: true })).toHaveAttribute('href', destinationPath);
  await expect(page.getByText('We tested the adjustment again and kept the improved form.', { exact: true })).toBeVisible();
});

test('switching identities returns to unfiltered Explore projects and keeps the selected identity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Lessons', exact: true }).click();
  await page.getByLabel('Search projects or lessons').fill('no-match');
  await identity(page, 'student-alex');
  await expect(page.getByLabel('Search projects or lessons')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Campus Signup', exact: true })).toBeVisible();
  for (const [route, id] of [
    ['/projects/project-signup', 'staff-kevin'],
    ['/lessons/lesson-fields', 'mentor-sarah'],
    ['/workspace', 'student-mia'],
  ]) {
    await page.goto(route);
    await identity(page, id);
  }
  await page.reload();
  await expect(page.getByLabel('Exploring as')).toHaveValue('student-mia');
  await page.goto('/lessons/lesson-fields');
  await expect(page.getByRole('link', { name: '← Source project: Campus Signup' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Use this lesson in your project' })).toBeVisible();
  await expect(page.getByText('Saving links this lesson to your project.', { exact: false })).toBeVisible();
});

test('explore filtering, empty results and mobile layout remain usable', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Campus Signup', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finished', exact: true }).click();
  await expect(page.locator('.project-card')).not.toHaveCount(0);
  await expect(page.locator('.project-card .status:not(.finished)')).toHaveCount(0);
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page.getByLabel('Search projects or lessons').fill(`no-match-${Date.now()}`);
  await expect(page.getByRole('heading', { name: 'No matches yet' })).toBeVisible();
  await page.getByRole('tab', { name: 'Lessons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matches yet' })).toBeVisible();
  await page.getByLabel('Search projects or lessons').fill('');
  await expect(page.locator('.lesson-card').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Projects', exact: true }).click();
  await expect(page.locator('.project-card').first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Exploring as')).toBeVisible();
  await expect(page.getByLabel('Search projects or lessons')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/lessons/lesson-fields');
  await expect(page.getByRole('heading', { name: 'Ask only for information you need now', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
