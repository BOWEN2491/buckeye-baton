import { expect, test } from '@playwright/test';

test('Mentor manages expertise and Staff explicitly chooses from three scored, loaded candidates', async ({ page, request }) => {
 test.setTimeout(150_000);
 const as = (id: string) => ({ headers: { 'x-demo-user-id': id } });
 for (const [id, expertise] of [['p5-mentor-ava', ['database']], ['p5-mentor-ben', ['back-end']], ['p5-mentor-chloe', ['brainstorming']]] as const) {
  expect((await request.patch('/api/mentors/me/expertise', { ...as(id), data: { expertise } })).status()).toBe(200);
 }
 await page.goto('/'); await page.getByLabel('Exploring as').selectOption('mentor-sarah');
 await page.getByRole('link', { name: 'My expertise', exact: true }).click();
 await expect(page.getByRole('heading', { name: 'My expertise', exact: true })).toBeVisible();
 await page.getByRole('checkbox', { name: 'front-end', exact: true }).check();
 await page.getByRole('button', { name: 'Save expertise' }).click();
 await expect(page.getByText(/^Expertise saved/)).toBeVisible();
 await page.reload(); await expect(page.getByRole('checkbox', { name: 'front-end', exact: true })).toBeChecked();
 const title = `P5 SQL result interface ${Date.now()}`;
 const posted = await request.post('/api/projects/project-events/questions', { ...as('student-mia'), data: { title, body: 'How should a React interface display PostgreSQL query results?', wantsMentor: true, dueAt: null } });
 expect(posted.status()).toBe(201); const id = (await posted.json()).data.question.id;
 const rec = async () => (await (await request.get(`/api/project-questions/${id}/recommendations`, as('staff-kevin'))).json()).data;
 await expect.poll(async () => (await rec()).status, { timeout: 45000 }).toBe('ready');
 expect((await rec()).candidates).toHaveLength(3);
 await page.getByLabel('Exploring as').selectOption('staff-kevin'); await page.goto('/projects/project-events');
 const thread = page.getByRole('article', { name: title, exact: true });
 await thread.getByRole('button', { name: 'Refer a mentor', exact: true }).click();
 const suggested = thread.getByRole('region', { name: 'Suggested mentors' });
 await expect(suggested.locator('.mentor-candidate')).toHaveCount(3);
 await expect(suggested).toContainText('Relevance: 90/100'); await expect(suggested).toContainText('Awaiting reply:');
 await expect(thread.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('');
 await suggested.getByText('Question expertise scores', { exact: true }).click();
 await expect(suggested).toContainText('not probabilities');
 await expect(suggested.getByRole('link', { name: 'View all mentors', exact: true })).toBeVisible();
 await suggested.getByRole('button', { name: 'Choose Ava Mock', exact: true }).click();
 await expect(thread.getByRole('combobox', { name: 'Mentor', exact: true })).toHaveValue('p5-mentor-ava');
 await expect(thread.getByLabel('Why this mentor fits')).toHaveValue('');
 await thread.getByLabel('Why this mentor fits').fill('I chose Ava after checking database experience and workload.');
 await thread.getByRole('button', { name: 'Send referral', exact: true }).click();
 await expect(thread).toContainText('Referred to Ava Mock');
 // AI does not replace the human referral after a profile update.
 await request.patch('/api/mentors/me/expertise', { ...as('p5-mentor-ava'), data: { expertise: [] } });
 const referral = (await (await request.get('/api/projects/project-events/questions')).json()).data.find((t: any) => t.question.id === id).referral;
 expect(referral.mentorId).toBe('p5-mentor-ava');
 await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
 expect((await request.get(`/api/project-questions/${id}/recommendations`, as('student-mia'))).status()).toBe(403);
});
