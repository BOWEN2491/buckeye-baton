import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

// P2 journeys. Generation uses the local mock model started by playwright.config.ts (not a real model).
const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'buckeye-baton-p2-qa');
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
  // Intentional 409/503 responses are logged by Chromium as failed resources; anything else is a defect.
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
const unavailable = { status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AI_UNAVAILABLE', message: 'AI introductions are unavailable right now. Your project content is unchanged.' } }) };
const card = (page: Page, title: string) => page.locator('.project-card').filter({ has: page.getByRole('link', { name: title, exact: true }) });

test('owner reviews GitHub-derived async introduction, immutable labels, conflicts and stale fallback', async ({ page }) => {
  test.setTimeout(180_000);
  const projectPath = '/projects/project-v2-finished';
  const title = 'Club Check-in Prototype';
  const asOwner = { headers: { 'x-demo-user-id': 'student-alex' } };
  const getEditor = async () => (await (await page.request.get(`/api${projectPath}/introduction`, asOwner)).json()).data;
  const ready = async () => { await expect.poll(async () => (await getEditor()).status, { timeout: 45000 }).toBe('ready'); return getEditor(); };
  await page.request.patch(`/api${projectPath}`, { ...asOwner, data: { codeUrl: 'https://github.com/example/check-in' } });
  await ready();
  await page.goto('/'); await identity(page, 'student-alex'); await page.goto(projectPath);
  const panel = page.getByRole('region', { name: 'Browse introduction' });
  await expect(panel.getByText('Draft · only you can see this')).toBeVisible();
  await expect(panel.getByText('Browse cards show your original summary. Topics pending review.')).toBeVisible();
  await expect(panel.getByLabel('Generated labels')).toContainText('front-end');
  await expect(panel.locator('input').filter({ has: page.getByLabel(/^Tags/) })).toHaveCount(0);
  await panel.getByText('Sources · mock evidence', { exact: true }).click();
  await expect(panel.getByText('Mock evidence — this is not a live GitHub analysis.')).toBeVisible();
  await expect(panel.getByText('README.md', { exact: true })).toBeVisible();
  // Failure to enqueue preserves the private draft and authored project.
  await page.route('**/introduction/generate', route => route.fulfill(unavailable), { times: 1 });
  await panel.getByRole('button', { name: 'Generate new draft', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('AI introductions are unavailable');
  await panel.getByRole('button', { name: 'Generate new draft', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Analysis in progress…', exact: true })).toBeDisabled();
  const generated = await ready(); await page.reload();
  await expect(panel.getByLabel('Sentence 1', { exact: true })).toHaveValue(`${title} is a fictional student project shared on Buckeye Baton.`);
  await panel.getByLabel('Sentence 2', { exact: true }).fill('Two sentences here. This breaks the rule.');
  await expect(panel.getByRole('alert')).toContainText('Write exactly one sentence per line');
  await panel.getByRole('button', { name: 'Remove sentence 2' }).click();
  await panel.getByLabel('Sentence 1', { exact: true }).fill('An owner-reviewed fictional accessible check-in prototype.');
  await panel.getByRole('button', { name: 'Confirm for browsing', exact: true }).click();
  await expect(panel.getByText(/^Confirmed\. Browse cards/)).toBeVisible();
  // Confirmation refreshes the parent detail immediately, without a navigation/reload.
  await expect(page.locator('.project-detail > .field-help').filter({ hasText: 'Topics pending review' })).toHaveCount(0);
  await expect(page.locator('.project-detail > .tags')).toContainText('front-end');
  await expect(page.locator('.project-detail > .ai-sources')).toBeVisible();
  await identity(page, 'student-mia');
  await expect(card(page, title)).toContainText('An owner-reviewed fictional accessible check-in prototype.');
  await expect(card(page, title).getByText('AI-assisted · owner-reviewed')).toBeVisible();
  await expect(card(page, title).locator('.tags').first()).toContainText('front-end');
  await page.goto(projectPath); await expect(page.getByRole('region', { name: 'Browse introduction' })).toHaveCount(0);
  // Replacing a draft in a different client must make this tab conflict without publishing old edits.
  await identity(page, 'student-alex'); await page.goto(projectPath);
  await expect(panel.getByLabel('Sentence 1', { exact: true })).toHaveValue(`${title} is a fictional student project shared on Buckeye Baton.`);
  await page.request.post(`/api${projectPath}/introduction/generate`, { ...asOwner, data: {} });
  const replacement = await ready(); expect(replacement.draft.id).not.toBe(generated.draft.id);
  await panel.getByLabel('Sentence 1', { exact: true }).fill('Old tab edit that must not be published.');
  await panel.getByRole('button', { name: 'Confirm for browsing', exact: true }).click();
  await expect(panel.getByRole('alert')).toContainText('A newer draft replaced');
  await expect(panel.getByLabel('Sentence 1', { exact: true })).toHaveValue('Old tab edit that must not be published.');
  await panel.getByRole('button', { name: 'Load the newer draft' }).click();
  await expect(panel.getByLabel('Sentence 1', { exact: true })).toHaveValue(`${title} is a fictional student project shared on Buckeye Baton.`);
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('What did you set out to do?').fill('Fictional demo: an updated keyboard-friendly check-in prototype.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.goto('/'); await expect(card(page, title)).toContainText('Fictional demo: an updated keyboard-friendly check-in prototype.');
  await expect(card(page, title).getByText('AI-assisted · owner-reviewed')).toHaveCount(0);
  await expect(card(page, title)).toContainText('Topics pending review');
  await ready(); await page.goto(projectPath);
  await panel.getByRole('button', { name: 'Confirm for browsing', exact: true }).click();
  await expect(panel.getByText(/^Confirmed\. Browse cards/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 }); await noOverflow(page);
  await mkdir(evidenceDir, { recursive: true }); await page.screenshot({ path: path.join(evidenceDir, 'p5-introduction-mobile.png'), fullPage: true });
});
test('Staff see Mentor Awaiting reply counts move with referrals, replies and follow-ups', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(evidenceDir, { recursive: true });
  const stamp = Date.now();
  const questionTitle = `Workload question ${stamp}`;
  const sarahCount = async () => {
    const row = page.getByRole('region', { name: 'Mentor workload' }).getByRole('listitem').filter({ hasText: 'Sarah Patel' });
    const text = await row.locator('.workload-count').innerText();
    return Number(text.replace('Awaiting reply: ', ''));
  };
  await page.goto('/');
  await identity(page, 'staff-kevin');
  await page.goto('/workspace');
  await expect(page.getByRole('region', { name: 'Mentor workload' }).getByText(/^Updated /)).toBeVisible();
  const n = await sarahCount();

  await identity(page, 'student-mia');
  await page.goto('/projects/project-events');
  await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
  await page.getByLabel('Your question').fill(questionTitle);
  await page.getByRole('radio', { name: 'Yes, ask Staff to refer a mentor', exact: true }).check();
  await page.getByRole('button', { name: 'Post question', exact: true }).click();
  const thread = page.getByRole('article', { name: questionTitle, exact: true });
  await expect(thread).toContainText('Waiting for Staff referral');

  // Kevin: unavailable counts do not block manual referral and keep choices.
  await identity(page, 'staff-kevin');
  await page.goto('/projects/project-events');
  await page.route('**/api/mentors/workload', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Unavailable' } }) }), { times: 1 });
  await thread.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await expect(thread.getByText('Workload unavailable.')).toBeVisible();
  await thread.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await thread.getByLabel('Why this mentor fits').fill('Sarah has built confirmation flows.');
  await thread.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(thread.getByRole('option', { name: new RegExp(`Sarah Patel .* Awaiting reply: ${n}$`) })).toBeAttached();
  await expect(thread.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('mentor-sarah');
  await expect(thread.getByLabel('Why this mentor fits')).toHaveValue('Sarah has built confirmation flows.');
  await page.screenshot({ path: path.join(evidenceDir, 'referral-candidates-desktop.png'), fullPage: true });
  await thread.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(thread).toContainText('Referred to Sarah Patel · waiting for reply');
  await page.goto('/workspace');
  await expect.poll(sarahCount).toBe(n + 1);
  await page.screenshot({ path: path.join(evidenceDir, 'staff-workload-desktop.png'), fullPage: true });

  const actAs = async (user: string, label: string, body: string, buttonName: string) => {
    await identity(page, user);
    await page.goto('/projects/project-events');
    await thread.getByLabel(label).fill(body);
    await thread.getByRole('button', { name: buttonName, exact: true }).click();
    await expect(thread.locator('.post').last()).toContainText(body);
  };
  const expectCount = async (value: number) => {
    await identity(page, 'staff-kevin');
    await page.goto('/workspace');
    await expect.poll(sarahCount).toBe(value);
  };
  await actAs('mentor-sarah', 'Reply as the referred mentor', 'Start with in-app confirmation.', 'Post mentor reply');
  await expectCount(n);
  await actAs('student-mia', 'Add a follow-up or comment', 'Thanks!', 'Post comment');
  await expectCount(n);
  await actAs('student-mia', 'Add a follow-up or comment', 'How should we test it?', 'Post follow-up');
  await actAs('student-mia', 'Add a follow-up or comment', 'One more detail about the test.', 'Post follow-up');
  await expectCount(n + 1);
  // Manual refresh and the failure state on the workbench panel.
  const workload = page.getByRole('region', { name: 'Mentor workload' });
  await page.route('**/api/mentors/workload', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Unavailable"}}' }), { times: 1 });
  await workload.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(workload.getByText('Workload unavailable.')).toBeVisible();
  await expect(workload.locator('.workload-count')).toHaveCount(0);
  await workload.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(sarahCount).toBe(n + 1);
  await actAs('mentor-sarah', 'Reply as the referred mentor', 'Test with five students first.', 'Post mentor reply');
  await expectCount(n);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(workload.getByText(/^Updated /)).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'staff-workload-mobile.png'), fullPage: true });
});

// R3: a successful referral refreshes every open candidate list on the page; manual refresh keeps inputs.
test('a referral refreshes Awaiting reply counts in other open referral forms', async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const first = `Two forms first ${stamp}`;
  const second = `Two forms second ${stamp}`;
  await page.goto('/');
  await identity(page, 'student-mia');
  await page.goto('/projects/project-v2-finished');
  for (const title of [first, second]) {
    await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
    await page.getByLabel('Your question').fill(title);
    await page.getByRole('radio', { name: 'Yes, ask Staff to refer a mentor', exact: true }).check();
    await page.getByRole('button', { name: 'Post question', exact: true }).click();
    await expect(page.getByRole('article', { name: title, exact: true })).toContainText('Waiting for Staff referral');
  }
  await identity(page, 'staff-kevin');
  await page.goto('/projects/project-v2-finished');
  const a = page.getByRole('article', { name: first, exact: true });
  const b = page.getByRole('article', { name: second, exact: true });
  await a.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await b.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  const sarahOption = (thread: typeof a) => thread.getByRole('option', { name: /^Sarah Patel/ });
  await expect(sarahOption(a)).toHaveText(/Awaiting reply: \d+$/);
  const n = Number((await sarahOption(b).innerText()).match(/Awaiting reply: (\d+)$/)![1]);
  await expect(sarahOption(a)).toHaveText(new RegExp(`Awaiting reply: ${n}$`));
  // Draft choices in the second form survive the refresh triggered by the first referral.
  await b.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await b.getByLabel('Why this mentor fits').fill('Second form reason.');
  await a.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await a.getByLabel('Why this mentor fits').fill('First form reason.');
  await a.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(a).toContainText('Referred to Sarah Patel · waiting for reply');
  await expect(sarahOption(b)).toHaveText(new RegExp(`Awaiting reply: ${n + 1}$`));
  const api = await (await page.request.get('/api/mentors/workload', { headers: { 'x-demo-user-id': 'staff-kevin' } })).json();
  expect(api.data.items.find((i: { mentor: { id: string } }) => i.mentor.id === 'mentor-sarah').awaitingReply).toBe(n + 1);
  await expect(b.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('mentor-sarah');
  await expect(b.getByLabel('Why this mentor fits')).toHaveValue('Second form reason.');
  // Manual refresh failure: Unavailable with Retry, no fake 0, inputs kept, referral still possible.
  await page.route('**/api/mentors/workload', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Unavailable"}}' }), { times: 1 });
  await b.getByRole('button', { name: 'Refresh counts', exact: true }).click();
  await expect(b.getByText('Workload unavailable.')).toBeVisible();
  await expect(sarahOption(b)).not.toHaveText(/Awaiting reply/);
  await expect(b.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('mentor-sarah');
  await expect(b.getByLabel('Why this mentor fits')).toHaveValue('Second form reason.');
  await b.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(sarahOption(b)).toHaveText(new RegExp(`Awaiting reply: ${n + 1}$`));
  await b.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(b).toContainText('Referred to Sarah Patel · waiting for reply');
  await page.goto('/workspace');
  await expect(page.getByRole('region', { name: 'Mentor workload' }).getByRole('listitem').filter({ hasText: 'Sarah Patel' })).toContainText(`Awaiting reply: ${n + 2}`);
});
