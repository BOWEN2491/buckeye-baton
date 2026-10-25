import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

// P3 journeys on the isolated production server. tests/e2e/p3-fixtures.ts adds a fictional Paused project
// shared 40 days ago with a question waiting 10 days (dates relative to now). No AI calls are made.
const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'buckeye-baton-p3-qa');
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  // Intentional 403/503 responses are logged by Chromium as failed resources; anything else is a defect.
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) messages.push(message.text()); });
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
function localDay(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const fixtureTitle = 'Study Room Finder Pilot';
const fixtureQuestion = 'How fresh must room data be before students trust it?';
const fixturePath = '/projects/p3-old-paused';
const card = (page: Page, title: string) => page.locator('.project-card').filter({ has: page.getByRole('link', { name: title, exact: true }) });

test('Explore Recommended explains its order; Newest, search and status still reach every project', async ({ page }) => {
  await mkdir(evidenceDir, { recursive: true });
  const aiRequests: string[] = [];
  page.on('request', r => { if (r.url().includes('/introduction/generate')) aiRequests.push(r.url()); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Recommended', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const first = page.locator('.project-card').first();
  await expect(first.getByRole('link', { name: fixtureTitle, exact: true })).toBeVisible();
  const why = first.getByLabel('Why recommended');
  await expect(why).toContainText('+20');
  await expect(why).toContainText('Shared 40 days ago · no pickup yet');
  await expect(why).toContainText('+30');
  await expect(why).toContainText('Waiting 10 days for a reply');
  await expect(why.getByRole('link', { name: 'Waiting 10 days for a reply' })).toHaveAttribute('href', /\/projects\/p3-old-paused#q-p3-old-question$/);
  await expect(page.getByText(/^Updated /).first()).toBeVisible();
  await expect(page.getByText(/probab|likely to|guarantee/i)).toHaveCount(0);
  const recommendedCount = await page.locator('.project-card').count();
  await expect(page.locator('.project-card').filter({ hasText: 'No priority boost' }).first()).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'explore-recommended-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Newest', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Newest', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Why recommended')).toHaveCount(0);
  await expect(page.locator('.project-card')).toHaveCount(recommendedCount);
  await page.getByLabel('Search projects', { exact: true }).fill('Study Room');
  await page.getByRole('button', { name: 'Paused', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Recommended', exact: true }).click();
  await expect(card(page, fixtureTitle).getByLabel('Why recommended')).toContainText('no pickup yet');
  await page.getByRole('button', { name: 'Finished', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No matches yet', exact: true })).toBeVisible();
  // Identity switch returns to the unfiltered home with the default sort.
  await identity(page, 'student-alex');
  await expect(page.getByRole('button', { name: 'Recommended', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Search projects', { exact: true })).toHaveValue('');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'explore-recommended-mobile.png'), fullPage: true });
  expect(aiRequests).toEqual([]);
});

test('age-only Priority, system suggestions, referral/reply/follow-up/delete recompute, and pickup clears the boost', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir(evidenceDir, { recursive: true });
  const stamp = Date.now();
  const dueSoonTitle = `Due soon question ${stamp}`;
  await page.goto('/');
  // Mia asks a question due in 12 hours (exact time via the API keeps it away from the 24h boundary).
  const asked = await page.request.post('/api/projects/project-events/questions', { headers: { 'x-demo-user-id': 'student-mia' }, data: { title: dueSoonTitle, body: '', wantsMentor: true, dueAt: new Date(Date.now() + 12 * 3600000).toISOString() } });
  expect(asked.status()).toBe(201);

  // Kevin: Priority puts the near reply date first; Oldest first keeps creation order.
  await identity(page, 'staff-kevin');
  await page.goto('/workspace');
  await expect(page.getByRole('button', { name: 'Priority', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const titles = () => page.locator('.workbench-item .workbench-title').allInnerTexts();
  await expect(page.locator('.workbench-item').first()).toContainText(fixtureQuestion);
  await expect(page.locator('.workbench-item').first().getByLabel('Priority')).toContainText('Waiting 10 days');
  const fixtureItem = page.locator('.workbench-item', { hasText: fixtureQuestion });
  await expect(fixtureItem.getByLabel('Priority')).toContainText('Waiting 10 days for a reply');
  const priorityOrder = await titles();
  expect(priorityOrder.indexOf(fixtureQuestion)).toBeLessThan(priorityOrder.indexOf(dueSoonTitle));
  await page.screenshot({ path: path.join(evidenceDir, 'staff-workbench-priority-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Oldest first', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Oldest first', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.workbench-item .card-priority')).toHaveCount(0);
  const oldest = await titles();
  expect(oldest.indexOf(fixtureQuestion)).toBeLessThan(oldest.indexOf(dueSoonTitle));
  expect([...oldest].sort()).toEqual([...priorityOrder].sort());

  // Reply-date inputs are retired; old stored dates do not affect age-based priority.
  await identity(page, "student-mia");
  await page.goto(fixturePath);
  const thread = page.getByRole("article", { name: fixtureQuestion, exact: true });
  const panel = page.getByRole("region", { name: "Project priority" });
  await expect(thread.getByRole("button", { name: "Edit reply date" })).toHaveCount(0);
  await expect(thread).not.toContainText("Hoping for a reply by");
  await expect(panel).toContainText("Waiting 10 days for a reply");
  await expect(panel.locator(".owner-advice")).toHaveCount(0);
  await page.reload();
  // Alex owns the project but cannot change Mia's date; he sees owner advice instead.
  await identity(page, 'student-alex');
  await page.goto(fixturePath);
  await expect(thread.getByRole('button', { name: 'Edit reply date' })).toHaveCount(0);
  const advice = panel.getByLabel('Suggestions for your project');
  await expect(advice).toContainText('No team has picked this project up yet.');
  await expect(advice).toContainText('has waited 10 days');
  await advice.getByRole('button', { name: 'Edit project from owner advice' }).click();
  await expect(page.getByLabel('Project name', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel editing', exact: true }).click();
  const denied = await page.request.patch('/api/project-questions/p3-old-question', { headers: { 'x-demo-user-id': 'student-alex' }, data: { dueAt: null } });
  expect(denied.status()).toBe(403);
  await page.screenshot({ path: path.join(evidenceDir, 'project-priority-owner-desktop.png'), fullPage: true });

  // Referral → reply → thanks → follow-up → reply → owner deletes the reply: priority follows the shared state.
  const projectScore = async () => (await (await page.request.get('/api/projects/p3-old-paused/priority')).json()).data.priority.score;
  const sarahCounts = async () => {
    const load = (await (await page.request.get('/api/mentors/workload', { headers: { 'x-demo-user-id': 'staff-kevin' } })).json()).data.items.find((i: { mentor: { id: string } }) => i.mentor.id === 'mentor-sarah').awaitingReply;
    const priority = (await (await page.request.get('/api/workbench?sort=priority', { headers: { 'x-demo-user-id': 'mentor-sarah' } })).json()).data.awaitingReply.length;
    const plain = (await (await page.request.get('/api/workbench', { headers: { 'x-demo-user-id': 'mentor-sarah' } })).json()).data.awaitingReply.length;
    return [load, priority, plain];
  };
  expect(await projectScore()).toBe(50);
  await identity(page, 'staff-kevin');
  await page.goto(`${fixturePath}#q-p3-old-question`);
  await thread.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await thread.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await thread.getByLabel('Why this mentor fits').fill('Sarah has built dashboards from daily exports.');
  await thread.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(thread).toContainText('Referred to Sarah Patel · waiting for reply');
  await expect(thread.getByLabel('Question priority')).toContainText('Waiting 10 days for a reply');
  const [n] = await sarahCounts();
  expect(await sarahCounts()).toEqual([n, n, n]);

  await identity(page, 'mentor-sarah');
  await page.goto('/workspace');
  await expect(page.getByRole('button', { name: 'Priority', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.workbench-item', { hasText: fixtureQuestion }).getByLabel('Priority')).toContainText('Waiting 10 days');
  await expect(page.locator('.workbench-item', { hasText: dueSoonTitle })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, 'mentor-workbench-priority-desktop.png'), fullPage: true });
  await page.locator('.workbench-item', { hasText: fixtureQuestion }).getByRole('link', { name: fixtureQuestion }).click();
  await thread.getByLabel('Reply as the referred mentor').fill('Show the export time on every room.');
  await thread.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(thread).toContainText('Sarah Patel replied');
  await expect(thread.getByLabel('Question priority')).toHaveCount(0);
  await expect(panel).toContainText('Shared 40 days ago · no pickup yet');
  await expect(panel).not.toContainText('Waiting 10 days');
  expect(await projectScore()).toBe(20);
  expect(await sarahCounts()).toEqual([n - 1, n - 1, n - 1]);

  await identity(page, 'student-mia');
  await page.goto(fixturePath);
  await thread.getByLabel('Add a follow-up or comment').fill('Thanks!');
  await thread.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(thread.locator('.post').last()).toContainText('Thanks!');
  expect(await projectScore()).toBe(20);
  await thread.getByLabel('Add a follow-up or comment').fill('Should rooms booked but empty count as free?');
  await thread.getByRole('button', { name: 'Post follow-up', exact: true }).click();
  await expect(thread).toContainText('New follow-up · waiting for Sarah Patel');
  // Waiting restarts at the follow-up (0 full days); the reply date still counts.
  await expect(thread.getByLabel('Question priority')).toContainText('No priority boost');
  await expect(thread.getByLabel('Question priority')).not.toContainText('Waiting');
  await expect(panel.locator('.priority-reasons')).not.toContainText('Reply date');
  expect(await projectScore()).toBe(20);
  expect(await sarahCounts()).toEqual([n, n, n]);

  await identity(page, 'mentor-sarah');
  await page.goto(fixturePath);
  await thread.getByLabel('Reply as the referred mentor').fill('Mark them as possibly free after 15 minutes.');
  await thread.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(thread.locator('.post.mentor_reply')).toHaveCount(2);
  expect(await projectScore()).toBe(20);

  // Alex as project owner deletes Sarah's latest reply: the question is awaiting again from the follow-up.
  await identity(page, 'student-alex');
  await page.goto(fixturePath);
  page.once('dialog', dialog => void dialog.accept());
  await thread.getByRole('button', { name: 'Delete referred mentor reply by Sarah Patel' }).last().click();
  await expect(thread.locator('.post.mentor_reply')).toHaveCount(1);
  await expect(thread).toContainText('New follow-up · waiting for Sarah Patel');
  await expect(panel.locator('.priority-reasons')).not.toContainText('Reply date');
  expect(await projectScore()).toBe(20);
  expect(await sarahCounts()).toEqual([n, n, n]);

  // Pickup removes the no-pickup boost; source, successor, summary and question history stay.
  await identity(page, 'student-mia');
  await page.goto(fixturePath);
  await page.getByRole('link', { name: 'Pick up this project', exact: true }).click();
  await page.getByRole('radio', { name: /^Continue/ }).check();
  await page.getByLabel('New project name').fill(`Room finder one building ${stamp}`);
  await page.getByLabel('Your team’s goal').fill('Show free rooms in one building from the official export.');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Project source' })).toContainText(`Picked up from ${fixtureTitle}`);
  await page.goto(fixturePath);
  await expect(panel).not.toContainText('no pickup yet');
  await expect(page.getByRole('heading', { name: 'Picked up by (1)', exact: true })).toBeVisible();
  await expect(page.getByText('Fictional demo: the team could not get room availability data in time.')).toBeVisible();
  await expect(thread.locator('.post')).toHaveCount(3); // reply, thanks, follow-up (second reply deleted)
  expect(await projectScore()).toBe(0);
  await page.goto('/');
  await expect(card(page, fixtureTitle).getByLabel('Why recommended')).not.toContainText('no pickup yet');

  // 390px views.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fixturePath);
  await expect(panel).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'project-priority-mobile.png'), fullPage: true });
  await identity(page, 'staff-kevin');
  await page.goto('/workspace');
  await expect(page.getByRole('button', { name: 'Priority', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'staff-workbench-priority-mobile.png'), fullPage: true });
});

test('priority panel and workbench show Retry on failed loads', async ({ page }) => {
  await page.goto('/');
  const failing = '**/api/projects/p3-old-paused/priority';
  await page.route(failing, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Unavailable"}}' }));
  await page.goto(fixturePath);
  const panel = page.getByRole('region', { name: 'Project priority' });
  await expect(panel.getByText('Priority unavailable.')).toBeVisible();
  await expect(page.getByRole('article', { name: fixtureQuestion, exact: true })).toBeVisible();
  await page.unroute(failing);
  await panel.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(panel.getByText(/^Updated /)).toBeVisible();
  await identity(page, 'staff-kevin');
  await page.route('**/api/workbench?sort=priority', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Workbench unavailable."}}' }), { times: 1 });
  await page.goto('/workspace');
  await expect(page.getByRole('alert').filter({ hasText: 'Workbench unavailable.' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Priority', exact: true })).toBeVisible();
});
