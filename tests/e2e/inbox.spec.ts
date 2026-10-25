import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

// P4 journeys. This file runs first (alphabetical), so its first test observes invitations created by the
// production runner (INVITATION_RUNNER_ENABLED=1 in playwright.config.ts) before any browser page opened.
const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'buckeye-baton-p4-qa');
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', error => messages.push(error.message));
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
const as = (user: string) => ({ headers: { 'x-demo-user-id': user } });
async function inboxApi(request: APIRequestContext, user: string, query = '?limit=50') {
  const response = await request.get(`/api/inbox${query}`, as(user));
  expect(response.status()).toBe(200);
  return (await response.json()).data;
}

test('the production runner sent invitations before any page was opened and keeps checking every 60 seconds', async ({ request }) => {
  test.setTimeout(150_000);
  // Only GET requests that never dispatch. No browser page exists in this test.
  const status = async () => (await (await request.get('/api/invitations/status', as('staff-kevin'))).json()).data;
  await expect.poll(async () => (await status()).lastCompletedAt, { timeout: 30_000 }).not.toBeNull();
  const first = await status();
  expect(first.enabled).toBe(true); expect(first.intervalSeconds).toBe(60); expect(first.error).toBeNull();
  const mia = (await inboxApi(request, 'student-mia', '?filter=invitations')).items;
  const pickup = mia.find((i: any) => i.invitationKind === 'pickup' && i.projectId === 'p3-old-paused');
  expect(pickup).toBeTruthy();
  expect(pickup.status).toBe('pending');
  expect(pickup.reason).toContain('You shared a finished project about maps');
  expect(pickup.evidence.map((e: any) => e.projectId)).toEqual(['p4-mia-finished']);
  const sarah = (await inboxApi(request, 'mentor-sarah', '?filter=invitations')).items;
  const help = sarah.find((i: any) => i.invitationKind === 'help' && i.questionId === 'p3-old-question');
  expect(help).toBeTruthy();
  expect(help.reason).toBe('You previously replied as a mentor on a maps project.');
  expect((await inboxApi(request, 'student-alex', '?filter=invitations')).items.some((i: any) => i.projectId === 'p3-old-paused')).toBe(false);
  // A later automatic check completes on its own (60 s interval) and sends no duplicates.
  await expect.poll(async () => (await status()).lastCompletedAt, { timeout: 90_000, intervals: [5_000] }).not.toBe(first.lastCompletedAt);
  const again = (await inboxApi(request, 'student-mia', '?filter=invitations')).items.filter((i: any) => i.projectId === 'p3-old-paused');
  expect(again).toHaveLength(1);
});

test('four identities receive the right Activity, can read, open and see removed comments without leaks', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir(evidenceDir, { recursive: true });
  const title = `Inbox journey question ${Date.now()}`;
  const signup = '/projects/project-signup';
  const thread = page.getByRole('article', { name: title, exact: true });
  const latest = async (user: string) => (await inboxApi(page.request, user)).items.filter((i: any) => i.kind === 'activity');
  const countFor = async (user: string) => (await latest(user)).length;
  await page.goto('/');
  const before = Object.fromEntries(await Promise.all(['student-alex', 'student-mia', 'mentor-sarah', 'staff-kevin'].map(async u => [u, await countFor(u)])));

  // Mia asks on Alex's project → Alex.
  await identity(page, 'student-mia');
  await page.goto(signup);
  await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
  await page.getByLabel('Your question').fill(title);
  await page.getByRole('radio', { name: 'Yes, ask Staff to refer a mentor', exact: true }).check();
  await page.getByRole('button', { name: 'Post question', exact: true }).click();
  await expect(thread).toContainText('Waiting for Staff referral');
  expect(await countFor('student-alex')).toBe(before['student-alex'] + 1);
  expect(await countFor('student-mia')).toBe(before['student-mia']);

  await identity(page, 'student-alex');
  await expect(page.getByRole('link', { name: /^Inbox \d+ unread$/ })).toBeVisible();
  await page.getByRole('link', { name: /^Inbox/ }).click();
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  const asked = page.getByRole('listitem', { name: 'Mia Johnson asked a question on your project' }).filter({ hasText: title });
  await expect(asked).toBeVisible();
  await expect(asked.getByText('Activity', { exact: true })).toBeVisible();
  await expect(asked.getByText('Unread', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'inbox-owner-desktop.png'), fullPage: true });
  await asked.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(asked.getByText('Unread', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('listitem', { name: 'Mia Johnson asked a question on your project' }).filter({ hasText: title }).getByText('Unread', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);

  // Kevin refers Sarah → Mia and Sarah.
  await identity(page, 'staff-kevin');
  await page.goto(signup);
  await thread.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await thread.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await thread.getByLabel('Why this mentor fits').fill('Sarah has built confirmation flows for signups.');
  await thread.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(thread).toContainText('Referred to Sarah Patel · waiting for reply');
  const miaReferral = (await latest('student-mia'))[0];
  expect(miaReferral.event).toBe('referral_created'); expect(miaReferral.preview).toBe('Sarah has built confirmation flows for signups.');
  expect((await latest('mentor-sarah'))[0].reasons).toEqual(['assigned_mentor']);

  // Sarah replies → Alex, Mia, Kevin.
  await identity(page, 'mentor-sarah');
  await page.goto('/inbox');
  await expect(page.getByRole('listitem', { name: 'You were referred to a question' }).first()).toBeVisible();
  await page.getByRole('listitem', { name: 'You were referred to a question' }).first().getByRole('link', { name: 'View question' }).click();
  await expect(page).toHaveURL(new RegExp(`${signup}#q-`));
  await thread.getByLabel('Reply as the referred mentor').fill('Start with an in-app confirmation step.');
  await thread.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(thread).toContainText('Sarah Patel replied');
  const kevinBefore = await countFor('staff-kevin');
  expect((await latest('staff-kevin'))[0].reasons).toEqual(['referring_staff']);
  expect((await latest('student-alex'))[0].postKind).toBe('mentor_reply');
  expect((await latest('student-mia'))[0].postKind).toBe('mentor_reply');

  // Mia thanks (owner only) then asks a follow-up (owner + Sarah).
  await identity(page, 'student-mia');
  await page.goto(signup);
  const sarahBefore = await countFor('mentor-sarah');
  await thread.getByLabel('Add a follow-up or comment').fill('Thanks!');
  await thread.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(thread.locator('.post').last()).toContainText('Thanks!');
  expect(await countFor('mentor-sarah')).toBe(sarahBefore);
  expect((await latest('student-alex'))[0].postKind).toBe('comment');
  await thread.getByLabel('Add a follow-up or comment').fill('What should we test first?');
  await thread.getByRole('button', { name: 'Post follow-up', exact: true }).click();
  await expect(thread).toContainText('New follow-up · waiting for Sarah Patel');
  expect((await latest('mentor-sarah'))[0].postKind).toBe('follow_up');
  expect((await inboxApi(page.request, 'student-mia')).items.some((i: any) => i.kind === 'activity' && i.actor.id === 'student-mia')).toBe(false);

  // Sarah replies again → Kevin gets a new message.
  await identity(page, 'mentor-sarah');
  await page.goto(signup);
  await thread.getByLabel('Reply as the referred mentor').fill('Test the in-app step with five students.');
  await thread.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(thread.locator('.post.mentor_reply')).toHaveCount(2);
  expect(await countFor('staff-kevin')).toBe(kevinBefore + 1);
  await identity(page, 'staff-kevin');
  await page.goto('/inbox');
  await expect(page.getByRole('listitem', { name: 'Sarah Patel replied to the question you referred' }).first()).toBeVisible();

  // Alex (project owner) deletes Sarah's first reply: every inbox shows "Comment removed" and no text.
  await identity(page, 'student-alex');
  await page.goto(signup);
  page.once('dialog', dialog => void dialog.accept());
  await thread.getByRole('button', { name: 'Delete referred mentor reply by Sarah Patel' }).first().click();
  await expect(thread.locator('.post.mentor_reply')).toHaveCount(1);
  await identity(page, 'student-mia');
  await page.goto('/inbox');
  await expect(page.getByRole('listitem', { name: 'Comment removed' }).first()).toBeVisible();
  for (const user of ['student-mia', 'student-alex', 'staff-kevin'])
    expect(JSON.stringify(await inboxApi(page.request, user))).not.toContain('Start with an in-app confirmation step.');
  // Privacy: someone else's message cannot be marked read.
  const alexItem = (await latest('student-alex'))[0];
  expect((await page.request.patch(`/api/inbox/${alexItem.id}`, { ...as('student-mia'), data: { read: true } })).status()).toBe(404);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Inbox', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: path.join(evidenceDir, 'inbox-mobile.png'), fullPage: true });
});

test('invitations: accept is only intent, Staff sees interested helpers, settings, empty and failure states', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(evidenceDir, { recursive: true });
  await page.goto('/');
  // Mia accepts the pickup invitation; it only leads to the normal pickup form.
  await identity(page, 'student-mia');
  await page.goto('/inbox');
  await page.getByRole('button', { name: 'Invitations', exact: true }).click();
  const pickup = page.getByRole('listitem', { name: 'A paused project could use your experience' }).filter({ hasText: 'Study Room Finder Pilot' });
  await expect(pickup).toContainText('You shared a finished project about maps');
  await expect(pickup.getByText('Invitation', { exact: true })).toBeVisible();
  await expect(pickup.getByRole('link', { name: 'Campus Map Kiosk' })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'inbox-invitation-desktop.png'), fullPage: true });
  const relationsBefore = (await (await page.request.get('/api/projects/p3-old-paused')).json()).data.successors.length;
  await pickup.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(page.getByText('Invitation accepted. Nothing was created or assigned for you.')).toBeVisible();
  await expect(pickup).toContainText('Status: Accepted');
  expect((await (await page.request.get('/api/projects/p3-old-paused')).json()).data.successors.length).toBe(relationsBefore);
  await pickup.getByRole('link', { name: 'Continue to pickup' }).click();
  await expect(page).toHaveURL('/projects/p3-old-paused/pick-up');
  await expect(page.getByRole('heading', { name: 'Pick up a project', exact: true })).toBeVisible();
  const repeat = await page.request.post(`/api/invitations/${(await inboxApi(page.request, 'student-mia', '?filter=invitations')).items.find((i: any) => i.projectId === 'p3-old-paused').id}/respond`, { ...as('student-mia'), data: { action: 'ignore' } });
  expect(repeat.status()).toBe(409);

  // Settings: turning invitations off keeps Activity; answered invitations stay.
  await page.goto('/inbox');
  const toggle = page.getByRole('checkbox', { name: 'Automatic invitations' });
  await expect(toggle).toBeChecked();
  await expect(page.getByText('Activity updates will still arrive.')).toBeVisible();
  await toggle.uncheck();
  await expect(page.getByText('Automatic invitations are off.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Automatic invitations' })).not.toBeChecked();
  await page.getByRole('checkbox', { name: 'Automatic invitations' }).check();
  await expect(page.getByText('Automatic invitations are on.')).toBeVisible();

  // Sarah accepts the help invitation; Kevin sees her as an interested helper and still refers manually.
  await identity(page, 'mentor-sarah');
  await page.goto('/inbox');
  const help = page.getByRole('listitem', { name: 'A question could use your experience' }).filter({ hasText: 'Study Room Finder Pilot' });
  await help.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(help).toContainText('Only a mentor referred by Staff can post a formal mentor reply.');
  await identity(page, 'staff-kevin');
  await page.goto('/projects/p3-old-paused#q-p3-old-question');
  const thread = page.getByRole('article', { name: 'How fresh must room data be before students trust it?', exact: true });
  const helpers = thread.getByLabel('Interested helpers');
  await expect(helpers).toContainText('Sarah Patel');
  await expect(thread).toContainText('Waiting for Staff referral');
  await helpers.getByRole('button', { name: 'Refer mentor', exact: true }).click();
  await expect(thread.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('mentor-sarah');
  await page.screenshot({ path: path.join(evidenceDir, 'interested-helpers-desktop.png'), fullPage: true });
  await thread.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect((await page.request.get('/api/project-questions/p3-old-question/interested-helpers', as('student-mia'))).status()).toBe(403);

  // Staff Inbox: runner status, empty Invitations, and a failed load with Retry.
  await page.goto('/inbox');
  const runner = page.getByRole('region', { name: 'Automatic invitation checks' });
  await expect(runner).toContainText('Automatic dispatch: On');
  await expect(runner).toContainText('Last successful check:');
  await page.getByRole('button', { name: 'Invitations', exact: true }).click();
  await expect(page.getByText('You’re all caught up').or(page.getByText("You're all caught up"))).toBeVisible();
  await page.route('**/api/inbox?filter=all*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Inbox unavailable."}}' }), { times: 1 });
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t load your inbox.' })).toBeVisible();
  await page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t load your inbox.' })).toHaveCount(0);
  // Identity switch clears the previous identity's messages.
  await identity(page, 'student-alex');
  await page.goto('/inbox');
  await expect(page.getByRole('region', { name: 'Automatic invitation checks' })).toHaveCount(0);
  await expect(page.getByRole('listitem', { name: 'Sarah Patel replied to the question you referred' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
});

// R2 (docs/P4_REVIEW.md): Refresh re-reads the whole loaded window, keeps Load more correct and
// re-validates older loaded messages (deleted previews, Unread removal). Each scenario is independent.
const mia = as('student-mia');
async function alexTotal(page: Page, filter = 'all') {
  let n = 0, cursor = '';
  for (;;) {
    const data = await inboxApi(page.request, 'student-alex', `?filter=${filter}&limit=50${cursor ? `&cursor=${cursor}` : ''}`);
    n += data.items.length;
    if (!data.nextCursor) return n;
    cursor = data.nextCursor;
  }
}
async function miaAsks(page: Page, title: string) {
  return (await (await page.request.post('/api/projects/project-signup/questions', { ...mia, data: { title, body: '', wantsMentor: false, dueAt: null } })).json()).data.question.id as string;
}
async function loadAll(page: Page) {
  while (await page.getByRole('button', { name: 'Load more', exact: true }).isVisible()) {
    const before = await page.locator('.inbox-item').count();
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect.poll(() => page.locator('.inbox-item').count()).toBeGreaterThan(before);
  }
}
async function openAlexInbox(page: Page) {
  await page.goto('/');
  await identity(page, 'student-alex');
  await page.goto('/inbox');
  await expect(page.locator('.inbox-item').first()).toBeVisible();
  await loadAll(page);
}

test('R2 Refresh: new messages beyond the first page stay reachable, and later Load more neither skips nor repeats', async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  await miaAsks(page, `Refresh seed ${stamp}`);
  await openAlexInbox(page);
  const n0 = await alexTotal(page);
  await expect(page.locator('.inbox-item')).toHaveCount(n0);
  for (let i = 0; i < 25; i++) await miaAsks(page, `Refresh burst ${stamp} #${String(i).padStart(2, '0')}`);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.inbox-item').first()).toContainText(`Refresh burst ${stamp} #24`);
  await loadAll(page);
  await expect(page.locator('.inbox-item')).toHaveCount(n0 + 25);
  for (let i = 0; i < 3; i++) await miaAsks(page, `Refresh late ${stamp} #${i}`);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.inbox-item').first()).toContainText(`Refresh late ${stamp} #2`);
  await loadAll(page);
  await expect(page.locator('.inbox-item')).toHaveCount(n0 + 28);
  expect(await alexTotal(page)).toBe(n0 + 28);
});

test('R2 Refresh: a deleted comment far past the first page shows as removed', async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const q0 = await miaAsks(page, `Deleted preview base ${stamp}`);
  const commentBody = `Older comment that will be deleted ${stamp}`;
  const commentId = (await (await page.request.post(`/api/project-questions/${q0}/posts`, { ...mia, data: { body: commentBody, kind: 'comment' } })).json()).data.posts.at(-1).id;
  for (let i = 0; i < 25; i++) await miaAsks(page, `Deleted preview filler ${stamp} #${i}`);
  await openAlexInbox(page);
  await expect(page.locator('.inbox-item').filter({ hasText: commentBody })).toHaveCount(1);
  const count = await page.locator('.inbox-item').count();
  expect((await page.request.delete(`/api/project-posts/${commentId}`, mia)).status()).toBe(200);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.locator('.inbox-item').filter({ hasText: commentBody })).toHaveCount(0);
  await expect(page.getByRole('listitem', { name: 'Comment removed' }).filter({ hasText: `Deleted preview base ${stamp}` })).toHaveCount(1);
  await expect(page.locator('.inbox-item')).toHaveCount(count);
});

test('R2 Refresh: Mark as read removes the message from Unread and the count matches', async ({ page }) => {
  test.setTimeout(120_000);
  await miaAsks(page, `Unread removal ${Date.now()}`);
  await page.goto('/');
  await identity(page, 'student-alex');
  await page.goto('/inbox');
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(page.locator('.inbox-item').first()).toBeVisible();
  await loadAll(page);
  const before = await alexTotal(page, 'unread');
  await expect(page.locator('.inbox-item')).toHaveCount(before);
  const first = page.locator('.inbox-item').first();
  const label = await first.getAttribute('aria-label');
  const context = await first.locator('h3 + p').innerText();
  await first.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(page.locator('.inbox-item')).toHaveCount(before - 1);
  await expect(page.getByText(`${before - 1} unread ·`)).toBeVisible();
  await expect(page.getByRole('listitem', { name: label! }).filter({ hasText: context })).toHaveCount(0);
});

// R2-follow-up (docs/P4_RECHECK.md): a focus/interval refresh while Load more is in flight must release
// its busy state; the stale page must not overwrite the refreshed list or cursor.
for (const outcome of ['succeeds', 'fails'] as const)
  test(`R2 follow-up: a refresh during Load more frees the button when the old request ${outcome}, then loads every item once`, async ({ page }) => {
    test.setTimeout(150_000);
    for (let i = 0; i < 25; i++) await miaAsks(page, `Race filler ${outcome} ${Date.now()} #${i}`);
    const total = await alexTotal(page);
    expect(total).toBeGreaterThan(20);
    await page.goto('/');
    await identity(page, 'student-alex');
    await page.goto('/inbox');
    await expect(page.locator('.inbox-item')).toHaveCount(20);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/api\/inbox\?.*cursor=/, async route => {
      await gate;
      if (outcome === 'fails') await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Inbox unavailable."}}' });
      else await route.continue();
    }, { times: 1 });
    const delayed = page.waitForResponse(r => /\/api\/inbox\?.*cursor=/.test(r.url()));
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Loading…', exact: true })).toBeDisabled();
    // Window regains focus → automatic refresh of the loaded window completes first.
    const refreshed = page.waitForResponse(r => /\/api\/inbox\?filter=all&limit=20$/.test(r.url()));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await refreshed;
    release();
    await (await delayed).finished();
    await expect(page.getByRole('button', { name: 'Loading…', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Load more', exact: true })).toBeEnabled();
    await expect(page.locator('.inbox-item')).toHaveCount(20);
    await expect(page.getByRole('alert').filter({ hasText: /Couldn|unavailable/i })).toHaveCount(0); // a superseded request's failure is not shown as current
    await loadAll(page);
    await expect(page.locator('.inbox-item')).toHaveCount(total);
    const keys = await page.locator('.inbox-item').evaluateAll(els => els.map(e => `${e.getAttribute('aria-label')}|${e.querySelector('h3 + p')?.textContent}|${e.querySelector('.metadata')?.textContent}`));
    expect(new Set(keys).size).toBe(total);
  });

test('R2 follow-up: a Load more response that arrives after switching filters is discarded', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/');
  await identity(page, 'student-alex');
  await page.goto('/inbox');
  await expect(page.locator('.inbox-item')).toHaveCount(20);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(/\/api\/inbox\?filter=all.*cursor=/, async route => { await gate; await route.continue(); }, { times: 1 });
  const delayed = page.waitForResponse(r => /\/api\/inbox\?filter=all.*cursor=/.test(r.url()));
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await page.getByRole('button', { name: 'Invitations', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Invitations', exact: true })).toHaveAttribute('aria-pressed', 'true');
  release();
  await (await delayed).finished();
  const invitations = (await inboxApi(page.request, 'student-alex', '?filter=invitations&limit=50')).items.length;
  await expect(page.locator('.inbox-item.unread, .inbox-item').filter({ has: page.getByText('Activity', { exact: true }) })).toHaveCount(0);
  await expect(page.locator('.inbox-item')).toHaveCount(Math.min(invitations, 20));
  await expect(page.getByRole('button', { name: 'Loading…', exact: true })).toHaveCount(0);
});
