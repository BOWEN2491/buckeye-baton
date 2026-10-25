import { expect, test, type Page } from '@playwright/test';

async function identity(page: Page, id: string) {
 await page.getByLabel('Exploring as').selectOption(id);
 await expect(page).toHaveURL('/');
}

test('comment authors and project owners delete with confirmation, failure recovery and queue updates', async ({ page }) => {
 const errors: string[] = [];
 page.on('pageerror', e => errors.push(e.message));
 const stamp = Date.now();
 const title = `Delete permissions ${stamp}`;
 const project = '/projects/project-v2-paused';
 const asked = await page.request.post(`/api${project}/questions`, { headers: { 'x-demo-user-id': 'student-mia' }, data: { title, body: '', wantsMentor: true, dueAt: null } });
 expect(asked.status()).toBe(201);
 const qid = (await asked.json()).data.question.id;
 const post = async (user: string, kind: string, body: string) => {
  const r = await page.request.post(`/api/project-questions/${qid}/posts`, { headers: { 'x-demo-user-id': user }, data: { kind, body } });
  expect(r.status()).toBe(201);
 };
 await post('student-mia', 'comment', 'Mia can delete this.');
 await post('staff-kevin', 'comment', 'Kevin can delete this.');
 await page.request.post(`/api/project-questions/${qid}/referral`, { headers: { 'x-demo-user-id': 'staff-kevin' }, data: { mentorId: 'mentor-sarah', reason: 'Relevant experience.' } });
 await post('mentor-sarah', 'mentor_reply', 'A formal reply for deletion.');
 await page.goto('/');
 await identity(page, 'student-mia');
 await page.goto(project);
 const thread = page.getByRole('article', { name: title, exact: true });
 const mine = thread.getByRole('button', { name: 'Delete comment by Mia Johnson', exact: true });
 await expect(mine).toBeVisible();
 await expect(thread.getByRole('button', { name: 'Delete comment by Kevin Brooks', exact: true })).toHaveCount(0);
 await expect(thread.getByRole('button', { name: 'Delete referred mentor reply by Sarah Patel', exact: true })).toHaveCount(0);
 page.once('dialog', dialog => dialog.dismiss());
 await mine.click();
 await expect(thread.getByText('Mia can delete this.', { exact: true })).toBeVisible();
 await page.route('**/api/project-posts/*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"UNAVAILABLE","message":"Try later."}}' }), { times: 1 });
 page.once('dialog', dialog => dialog.accept());
 await mine.click();
 await expect(thread.getByRole('alert')).toContainText('Couldn’t delete this comment.');
 await expect(thread.getByText('Mia can delete this.', { exact: true })).toBeVisible();
 page.once('dialog', dialog => dialog.accept());
 await mine.click();
 await expect(thread.getByText('Mia can delete this.', { exact: true })).toHaveCount(0);
 await page.reload();
 await expect(thread.getByText('Mia can delete this.', { exact: true })).toHaveCount(0);

 await identity(page, 'staff-kevin');
 await page.goto(project);
 await expect(thread.getByRole('button', { name: 'Delete comment by Kevin Brooks', exact: true })).toBeVisible();
 await expect(thread.getByRole('button', { name: 'Delete referred mentor reply by Sarah Patel', exact: true })).toHaveCount(0);
 await identity(page, 'student-alex'); // The project owner can delete every post.
 await page.goto(project);
 const queue = async () => (await (await page.request.get('/api/workbench', { headers: { 'x-demo-user-id': 'mentor-sarah' } })).json()).data.awaitingReply.length;
 const n = await queue();
 await page.setViewportSize({ width: 390, height: 844 });
 await expect(thread.getByRole('button', { name: 'Delete comment by Kevin Brooks', exact: true })).toBeVisible();
 page.once('dialog', dialog => { expect(dialog.message()).toContain('Awaiting reply'); return dialog.accept(); });
 await thread.getByRole('button', { name: 'Delete referred mentor reply by Sarah Patel', exact: true }).click();
 await expect(thread.getByText('A formal reply for deletion.', { exact: true })).toHaveCount(0);
 await expect(thread).toContainText('waiting for reply');
 await expect.poll(queue).toBe(n + 1);
 page.once('dialog', dialog => dialog.accept());
 await thread.getByRole('button', { name: 'Delete comment by Kevin Brooks', exact: true }).click();
 await expect(thread.getByText('Kevin can delete this.', { exact: true })).toHaveCount(0);
 await expect.poll(queue).toBe(n + 1);
 await expect(thread.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 expect(errors).toEqual([]);
 // Restore the baseline queue for other journeys sharing this isolated test database.
 await post('mentor-sarah', 'mentor_reply', 'Test cleanup: restore the replied state.');
 await expect.poll(queue).toBe(n);
});
