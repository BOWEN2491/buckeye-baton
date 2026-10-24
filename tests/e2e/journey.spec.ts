import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

// Browser plugin not available; repository Playwright uses an isolated production SQL database.
const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'buckeye-baton-phase1-qa');
const errors = new WeakMap<Page, string[]>();
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
  await expect(page.getByRole('heading', { name: 'Explore projects', exact: true })).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('owned reflections save across ongoing, finished and paused without losing history', async ({ page }) => {
  const title = `State journey ${Date.now()}`;
  await page.goto('/');
  await identity(page, 'student-alex');
  await page.getByRole('link', { name: 'New project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill(title);
  await page.getByLabel('What did you set out to do?').fill('A fictional team tests accessible campus notifications.');
  await page.getByLabel('Course or club').fill('E2E team');
  await page.getByLabel('Term', { exact: true }).fill('Autumn 2026');
  await page.getByLabel('Topics').fill('testing, accessibility');
  await page.getByRole('button', { name: 'Publish project', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const projectPath = new URL(page.url()).pathname;
  const saved = async () => (await (await page.request.get(`/api${projectPath}`)).json()).data.project;
  expect((await saved()).status).toBe('ongoing');
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Current progress', { exact: true }).fill('Built the first notification prototype.');
  await page.getByLabel('Project status', { exact: true }).selectOption('finished');
  await page.getByRole('button', { name: 'Add outcome', exact: true }).click();
  await page.getByLabel('Outcome 1', { exact: true }).fill('Completed a keyboard accessible notification flow.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByLabel('Outcome 1', { exact: true })).toHaveValue('Completed a keyboard accessible notification flow.');
  expect((await saved()).status).toBe('ongoing');
  await page.getByLabel('For the next team', { exact: true }).fill('Test delivery on slow campus Wi-Fi.');
  await page.getByRole('button', { name: 'Add outcome', exact: true }).click();
  await page.getByLabel('Outcome 2', { exact: true }).fill('Discard this draft outcome.');
  await page.getByRole('button', { name: 'Remove outcome 2', exact: true }).click();
  await expect(page.getByLabel('Outcome 2', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add problem', exact: true }).click();
  await page.getByLabel('Problem title 1', { exact: true }).fill('Notifications on slow connections');
  await page.getByLabel('We assumed 1', { exact: true }).fill('Every request would return quickly.');
  await page.getByLabel('What happened 1', { exact: true }).fill('The loading state was unclear.');
  await page.getByLabel('We changed 1', { exact: true }).fill('Added clear progress and retry messages.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toBeVisible();
  await expect(page.getByText('Completed a keyboard accessible notification flow.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Added clear progress and retry messages.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Project status', { exact: true }).selectOption('paused');
  await page.getByLabel('Why we paused', { exact: true }).fill('The team needs access to a test mailing service.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByLabel('Why we paused', { exact: true })).toHaveValue('The team needs access to a test mailing service.');
  expect((await saved()).status).toBe('finished');
  await page.getByRole('button', { name: 'Add restart suggestion', exact: true }).click();
  await page.getByLabel('If we did it again 1', { exact: true }).fill('Arrange test service access before implementation.');
  await page.getByRole('button', { name: 'Add reusable material', exact: true }).click();
  await page.getByLabel('Reusable name 1', { exact: true }).fill('Notification prototype');
  await page.getByLabel('Reusable URL 1', { exact: true }).fill('https://example.com/notification-prototype');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open material ↗', exact: true })).toHaveAttribute('href', 'https://example.com/notification-prototype');
  await page.reload();
  await expect(page.getByText('Arrange test service access before implementation.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Project status', { exact: true }).selectOption('ongoing');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Built the first notification prototype.', { exact: true })).toBeVisible();
  const project = await saved();
  expect(project.status).toBe('ongoing');
  expect(project.reflection.outcomes).toEqual(['Completed a keyboard accessible notification flow.']);
  expect(project.reflection.whyPaused).toBe('The team needs access to a test mailing service.');
  expect(project.reflection.problems).toHaveLength(1);
  await identity(page, 'student-mia');
  await page.goto(projectPath);
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0);
});

test('explore filters, legacy history, three state details and mobile layout work', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  await page.goto('/');
  await expect(page).toHaveTitle(/Buckeye Baton/);
  await expect(page.getByRole('tab', { name: 'Lessons', exact: true })).toHaveCount(0);
  await expect(page.locator('.project-card').first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'desktop.png') });
  for (const status of ['Ongoing', 'Finished', 'Paused']) {
    await page.getByRole('button', { name: status, exact: true }).click();
    await expect(page.getByRole('button', { name: status, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.project-card').first()).toBeVisible();
    await expect(page.locator(`.project-card .status:not(.${status.toLowerCase()})`)).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'All projects', exact: true }).click();
  await page.getByLabel('Search projects', { exact: true }).fill(`no-match-${Date.now()}`);
  await expect(page.getByRole('heading', { name: 'No matches yet', exact: true })).toBeVisible();
  await page.getByLabel('Search projects', { exact: true }).fill('Campus Signup');
  await expect(page.getByRole('heading', { name: 'Campus Signup', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Campus Signup', exact: true }).click();
  await expect(page).toHaveURL('/projects/project-signup');
  await expect(page.getByRole('heading', { name: 'Historical experience', exact: true })).toBeVisible();
  for (const id of ['project-events', 'project-v2-finished', 'project-v2-paused']) {
    await page.goto(`/projects/${id}`);
    await expect(page.locator('.reflection-hero')).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, `${id}-desktop.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [id, section] of [['project-events', 'Current progress'], ['project-v2-finished', 'What we got'], ['project-v2-paused', 'Why we paused']]) {
    await page.goto(`/projects/${id}`);
    await expect(page.getByRole('heading', { name: section, exact: true })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, `${id}-mobile.png`), fullPage: true });
  }
  await page.goto('/');
  await expect(page.getByLabel('Exploring as')).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'mobile.png') });
});

test('identity switching resets filters and unsaved edits to the project home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Paused', exact: true }).click();
  await page.getByLabel('Search projects', { exact: true }).fill('no-match');
  await identity(page, 'student-alex');
  await expect(page.getByLabel('Search projects', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'All projects', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/projects/project-signup');
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('Unsaved title should disappear');
  await identity(page, 'staff-kevin');
  await page.goto('/projects/project-signup');
  await expect(page.getByRole('heading', { name: 'Campus Signup', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0);
  await identity(page, 'mentor-sarah');
  await page.reload();
  await expect(page.getByLabel('Exploring as')).toHaveValue('mentor-sarah');
});

test('role entry points on project pages do not write until an action is submitted', async ({ page }) => {
  await page.goto('/');
  const mutations: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) mutations.push(`${request.method()} ${request.url()}`);
  });
  for (const id of ['project-v2-finished', 'project-v2-paused']) {
    await page.goto(`/projects/${id}`);
    await expect(page.getByRole('link', { name: 'Pick up this project', exact: true })).toHaveAttribute('href', `/projects/${id}/pick-up`);
    await expect(page.getByRole('heading', { name: 'Questions & guidance', exact: true })).toBeVisible();
  }
  for (const id of ['staff-kevin', 'mentor-sarah']) {
    await identity(page, id);
    await page.goto('/projects/project-events');
    await expect(page.getByRole('link', { name: 'Open my workbench', exact: true })).toHaveAttribute('href', '/workspace');
    await expect(page.getByText(/next round/i)).toHaveCount(0);
  }
  expect(mutations).toEqual([]);
});

test('retired lesson pages redirect to projects and adoption controls stay removed', async ({ page }) => {
  await page.goto('/lessons/lesson-fields#discussion');
  await expect(page).toHaveURL(/\/projects\/project-signup(?:#discussion)?$/);
  await expect(page.getByRole('heading', { name: 'Historical experience', exact: true })).toBeVisible();
  const checkProjectOnly = async () => {
    await expect(page.getByText('Use this lesson in your project', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Add to my project/i })).toHaveCount(0);
    await expect(page.getByText(/project reported an outcome|projects reported an outcome|Lessons we.re building on|The relay continues/)).toHaveCount(0);
    await expect(page.locator('a[href^="/lessons/"]')).toHaveCount(0);
  };
  await checkProjectOnly();
  for (const route of ['/', '/projects/project-events', '/projects/project-v2-finished', '/projects/project-v2-paused', '/workspace']) {
    await page.goto(route);
    await expect(page.getByLabel('Exploring as')).toBeVisible();
    if (route.startsWith('/projects/')) await expect(page.locator('.reflection-hero')).toBeVisible();
    await checkProjectOnly();
  }
  await identity(page, 'staff-kevin');
  await page.goto('/workspace');
  await checkProjectOnly();
  await identity(page, 'mentor-sarah');
  await page.goto('/workspace');
  await checkProjectOnly();
});
