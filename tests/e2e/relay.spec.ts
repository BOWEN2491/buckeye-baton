import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

// P1 relay journey on the isolated production database started by playwright.config.ts.
const evidenceDir = process.env.QA_SCREENSHOT_DIR || path.join(tmpdir(), 'buckeye-baton-p1-qa');
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
const unavailable = { status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'UNAVAILABLE', message: 'Storage is temporarily unavailable.' } }) };
function localDay(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const thread = (page: Page, title: string) => page.getByRole('article', { name: title, exact: true });

test('four identities complete pickup, question, referral, replies, follow-up and status update', async ({ page }) => {
  test.setTimeout(240_000);
  await mkdir(evidenceDir, { recursive: true });
  const stamp = Date.now();
  const newTitle = `Notification pilot ${stamp}`;
  const goal = 'Deliver one consent-aware reminder for a single campus event.';
  const questionTitle = `Email or in-app confirmation first? ${stamp}`;
  const discussionTitle = `Open discussion on consent copy ${stamp}`;
  const source = '/projects/project-v2-paused';

  // Alex's paused source has no successors yet.
  await page.goto('/');
  await identity(page, 'student-alex');
  await page.goto(source);
  await expect(page.getByRole('heading', { name: 'Picked up by (0)', exact: true })).toBeVisible();
  await expect(page.getByText('No one has picked up this project yet.', { exact: true })).toBeVisible();

  // Mia opens the pickup form; empty submissions send nothing.
  await identity(page, 'student-mia');
  await page.goto(source);
  await page.getByRole('link', { name: 'Pick up this project', exact: true }).click();
  await expect(page).toHaveURL(`${source}/pick-up`);
  await expect(page.getByText('Reference: Campus Notification Prototype')).toBeVisible();
  const pickupBodies: { requestId: string }[] = [];
  page.on('request', request => { if (request.url().endsWith('/pickups') && request.method() === 'POST') pickupBodies.push(request.postDataJSON()); });
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByText('Choose how you’re picking it up.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter a project name.', { exact: true })).toBeVisible();
  expect(pickupBodies).toHaveLength(0);
  await page.getByRole('radio', { name: /^Continue/ }).check();
  await page.getByLabel('New project name').fill(newTitle);
  await page.getByLabel('Your team’s goal').fill(goal);
  await page.screenshot({ path: path.join(evidenceDir, 'pickup-form-desktop.png'), fullPage: true });

  // A failed request keeps the input; the retry reuses the same requestId.
  await page.route('**/api/projects/project-v2-paused/pickups', route => route.fulfill(unavailable), { times: 1 });
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'We couldn’t create your project.' })).toBeVisible();
  await expect(page.getByLabel('New project name')).toHaveValue(newTitle);
  await expect(page.getByLabel('Your team’s goal')).toHaveValue(goal);
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(page.getByRole('heading', { name: newTitle, exact: true })).toBeVisible();
  expect(pickupBodies).toHaveLength(2);
  expect(pickupBodies[1].requestId).toBe(pickupBodies[0].requestId);
  await expect(page.getByText('Project created. You picked up Campus Notification Prototype (Continue).')).toBeVisible();
  const projectPath = new URL(page.url()).pathname;
  const projectId = projectPath.split('/').pop()!;
  await expect(page.getByRole('region', { name: 'Project source' })).toContainText('Picked up from Campus Notification Prototype');
  await expect(page.getByRole('region', { name: 'Project source' })).toContainText(goal);
  await expect(page.locator('.project-title-row .status.ongoing')).toBeVisible();
  // The same request ID returns the same project instead of creating another one.
  const replay = await page.request.post(`/api${source}/pickups`, { headers: { 'x-demo-user-id': 'student-mia' }, data: { requestId: pickupBodies[0].requestId, pickupType: 'continue', title: newTitle, goal } });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).data.project.id).toBe(projectId);

  // Source shows the successor and stays unchanged.
  await page.goto(source);
  await expect(page.getByRole('heading', { name: 'Picked up by (1)', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: newTitle, exact: true })).toBeVisible();
  await expect(page.locator('.project-title-row .status.paused')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0);

  // Mia asks a mentor question (with a failed first attempt) and an open discussion.
  await page.goto(projectPath);
  await expect(page.getByText('No questions yet.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
  await page.getByLabel('Your question').fill(questionTitle);
  await page.getByLabel(/^Details/).fill('We can only build one confirmation channel this week. How should we decide?');
  await page.getByRole('radio', { name: 'Yes, ask Staff to refer a mentor', exact: true }).check();
  await expect(page.locator('.ask-form input[type=date]')).toHaveCount(0);
  await page.route(`**/api/projects/${projectId}/questions`, route => route.request().method() === 'POST' ? route.fulfill(unavailable) : route.fallback(), { times: 1 });
  await page.getByRole('button', { name: 'Post question', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Couldn’t post your question.' })).toBeVisible();
  await expect(page.getByLabel('Your question')).toHaveValue(questionTitle);
  await page.getByRole('button', { name: 'Post question', exact: true }).click();
  await expect(thread(page, questionTitle)).toContainText('Waiting for Staff referral');
  await expect(thread(page, questionTitle)).not.toContainText('Hoping for a reply by');
  await page.getByRole('button', { name: 'Ask a question', exact: true }).click();
  await page.getByLabel('Your question').fill(discussionTitle);
  await page.getByRole('radio', { name: 'No, just open discussion', exact: true }).check();
  await page.getByRole('button', { name: 'Post question', exact: true }).click();
  await expect(thread(page, discussionTitle)).toContainText('Open discussion · no mentor requested');
  await page.reload();
  await expect(thread(page, questionTitle)).toContainText('Waiting for Staff referral');

  // Kevin refers Sarah from the Staff workbench; the discussion is not listed.
  await identity(page, 'staff-kevin');
  await page.getByRole('link', { name: 'My workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Staff workbench', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Needs referral \(\d+\)$/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: discussionTitle })).toHaveCount(0);
  await page.screenshot({ path: path.join(evidenceDir, 'staff-workbench-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: questionTitle, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${projectPath}#q-`));
  await expect(thread(page, questionTitle)).toHaveClass(/highlighted/);
  await expect(thread(page, discussionTitle)).toContainText('The asker didn’t request a mentor');
  const question = thread(page, questionTitle);
  await question.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await question.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(question.getByText('Choose a mentor.', { exact: true })).toBeVisible();
  await question.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await question.getByLabel('Why this mentor fits').fill('Sarah has built confirmation flows for event signups.');
  await question.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(question.getByText('Referral sent. Sarah Patel will see this question in their workbench.')).toBeVisible();
  await expect(question).toContainText('Referred to Sarah Patel · waiting for reply');
  await expect(question.locator('.referral-row')).toContainText('Sarah has built confirmation flows for event signups.');
  await expect(question.getByRole('button', { name: 'Referred', exact: true })).toBeDisabled();
  await question.getByLabel('Add a comment').fill('Staff note: thanks for the clear question.');
  await question.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(question.locator('.post.comment')).toContainText('Staff note: thanks for the clear question.');

  // A concurrent referral on another question shows a clear conflict and sends nothing more.
  await page.goto('/projects/project-events#q-question-events-shifts');
  const seeded = page.locator('#q-question-events-shifts');
  await seeded.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
  await seeded.getByRole('combobox', { name: 'Mentor', exact: true }).selectOption('mentor-sarah');
  await seeded.getByLabel('Why this mentor fits').fill('Second Staff tab.');
  const first = await page.request.post('/api/project-questions/question-events-shifts/referral', { headers: { 'x-demo-user-id': 'staff-kevin' }, data: { mentorId: 'mentor-sarah', reason: 'First Staff tab.' } });
  expect(first.status()).toBe(201);
  await seeded.getByRole('button', { name: 'Send referral', exact: true }).click();
  await expect(seeded.getByRole('alert')).toContainText('Already referred.');
  await expect(seeded.getByRole('button', { name: 'Send referral', exact: true })).toBeDisabled();
  await seeded.getByRole('button', { name: 'Refresh question', exact: true }).click();
  await expect(seeded.locator('.referral-row')).toContainText('First Staff tab.');

  // Sarah replies from her workbench.
  await identity(page, 'mentor-sarah');
  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: 'Mentor workbench', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Awaiting reply (2)', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDir, 'mentor-workbench-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: questionTitle, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${projectPath}#q-`));
  await expect(question.getByRole('button', { name: 'Post mentor reply', exact: true })).toBeVisible();
  await question.getByLabel('Reply as the referred mentor').fill('Start with in-app confirmation, then test email with five students.');
  await question.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(question.locator('.post.mentor_reply')).toHaveCount(1);
  await expect(question.locator('.kind-badge.mentor_reply')).toHaveText('Referred mentor reply');
  await expect(question).toContainText('Sarah Patel replied');
  // Sarah is not referred on the discussion, so she can only comment there.
  await expect(thread(page, discussionTitle).getByRole('button', { name: 'Post mentor reply' })).toHaveCount(0);

  // Mia's thanks keeps the state; her explicit follow-up reopens Sarah's queue.
  await identity(page, 'student-mia');
  await page.goto(projectPath);
  await question.getByLabel('Add a follow-up or comment').fill('Thanks, this helps!');
  await question.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(question.locator('.post.comment').last()).toContainText('Thanks, this helps!');
  await expect(question).toContainText('Sarah Patel replied');
  // A failed post keeps the draft.
  await page.route(`**/api/project-questions/*/posts`, route => route.fulfill(unavailable), { times: 1 });
  await question.getByLabel('Add a follow-up or comment').fill('Should a booked but empty slot count as open?');
  await question.getByRole('button', { name: 'Post follow-up', exact: true }).click();
  await expect(question.getByRole('alert')).toContainText('Couldn’t post.');
  await expect(question.getByLabel('Add a follow-up or comment')).toHaveValue('Should a booked but empty slot count as open?');
  await question.getByRole('button', { name: 'Post follow-up', exact: true }).click();
  await expect(question.locator('.post.follow_up')).toContainText('Should a booked but empty slot count as open?');
  await expect(question).toContainText('New follow-up · waiting for Sarah Patel');

  await identity(page, 'mentor-sarah');
  await page.goto('/workspace');
  const awaiting = page.locator('.workbench-item', { hasText: questionTitle });
  await expect(awaiting.getByText('New follow-up', { exact: true })).toBeVisible();
  await awaiting.getByRole('link', { name: questionTitle, exact: true }).click();
  await question.getByLabel('Reply as the referred mentor').fill('Show it as possibly free after 15 minutes, and label it clearly.');
  await question.getByRole('button', { name: 'Post mentor reply', exact: true }).click();
  await expect(question.locator('.post.mentor_reply')).toHaveCount(2);
  await expect(question).toContainText('Sarah Patel replied');
  await page.goto('/workspace');
  await page.getByRole('button', { name: /^Replied \(\d+\)$/ }).click();
  await expect(page.getByRole('link', { name: questionTitle, exact: true })).toBeVisible();

  // Another student only gets the comment box.
  await identity(page, 'student-alex');
  await page.goto(projectPath);
  await expect(question.getByLabel('Add a comment')).toBeVisible();
  await expect(question.getByRole('button', { name: 'Post follow-up' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toHaveCount(0);

  // Mia finishes the project; questions stay open and the source sees the new status.
  await identity(page, 'student-mia');
  await page.goto(projectPath);
  await page.getByRole('button', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Current progress', { exact: true }).fill('Built the in-app confirmation.');
  await page.getByLabel('Project status', { exact: true }).selectOption('finished');
  await page.getByRole('button', { name: 'Add outcome', exact: true }).click();
  await page.getByLabel('Outcome 1', { exact: true }).fill('A fictional in-app confirmation for one event.');
  await page.getByLabel('For the next team', { exact: true }).fill('Test the email channel next.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit project', exact: true })).toBeVisible();
  await expect(page.getByText('This project is Finished. Questions, referrals and replies below stay open for discussion.')).toBeVisible();
  await expect(question).toContainText('Sarah Patel replied');
  await expect(question.locator('.post.mentor_reply')).toHaveCount(2);
  await identity(page, 'student-alex');
  await page.goto(source);
  const successor = page.getByRole('region', { name: 'Picked up by' }).getByRole('listitem').filter({ hasText: newTitle });
  await expect(successor.locator('.status.finished')).toBeVisible();
  await expect(successor).toContainText('Mia Johnson · Continue');
  await successor.getByRole('link', { name: newTitle, exact: true }).click();
  await expect(page.getByText('A fictional in-app confirmation for one event.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(question.locator('.post')).toHaveCount(5);
  await page.screenshot({ path: path.join(evidenceDir, 'relay-project-desktop.png'), fullPage: true });

  // 390px layouts.
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [projectPath, source, `/projects/project-v2-finished/pick-up`]) {
    await page.goto(route);
    await expect(page.getByLabel('Exploring as')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, `mobile-${route.split('/').filter(Boolean).join('-')}.png`), fullPage: true });
  }
  for (const id of ['staff-kevin', 'mentor-sarah']) {
    await identity(page, id);
    await page.goto('/workspace');
    await expect(page.locator('.workbench-tabs')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await noOverflow(page);
    await page.screenshot({ path: path.join(evidenceDir, `mobile-workbench-${id}.png`), fullPage: true });
  }
});

test('pickup is limited to students and Finished or Paused sources', async ({ page }) => {
  await page.goto('/');
  await identity(page, 'student-mia');
  await page.goto('/projects/project-events');
  await expect(page.getByRole('link', { name: 'Pick up this project' })).toHaveCount(0);
  await page.goto('/projects/project-events/pick-up');
  await expect(page.getByRole('alert').filter({ hasText: 'Ongoing projects can’t be picked up.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create project' })).toHaveCount(0);
  await page.goto('/projects/project-v2-finished/pick-up');
  await page.getByRole('link', { name: '← Back to Club Check-in Prototype' }).click();
  await expect(page).toHaveURL('/projects/project-v2-finished');
  await page.getByRole('link', { name: 'Pick up this project', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL('/projects/project-v2-finished');
  await identity(page, 'mentor-sarah');
  await page.goto('/projects/project-v2-finished');
  await expect(page.getByRole('link', { name: 'Pick up this project' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Open my workbench', exact: true })).toBeVisible();
  await page.goto('/projects/project-v2-finished/pick-up');
  await expect(page.getByRole('alert').filter({ hasText: 'Only students can pick up a project.' })).toBeVisible();
  await identity(page, 'staff-kevin');
  await page.goto('/projects/project-v2-finished');
  await expect(page.getByRole('link', { name: 'Open my workbench', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask a question' })).toHaveCount(0);
});
