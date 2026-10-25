import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { database, closeDatabase, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { DELETE as deleteRoute } from '../src/app/api/project-posts/[id]/route';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown) {
 const response = await handle(new Request(`http://localhost/api/${resource}`, {
  method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
 }), resource, id);
 return { status: response.status, ...await response.json() };
}

test('project owners and post authors can delete posts without losing history or drifting mentor queues', async () => {
 process.env.DATABASE_MODE = 'pglite';
 process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-post-delete-'));
 try {
  const projectId = 'project-v2-paused'; // Alex owns the project; Mia asks the question.
  const before = (await request('project', projectId)).data.project;
  const asked = await request('projectQuestions', projectId, 'POST', 'student-mia', { title: 'Which consent wording can we reuse?', body: '', wantsMentor: true, dueAt: null });
  const qid = asked.data.question.id;
  const post = async (user: string, kind: string, body: string) => {
   const response = await request('questionPosts', qid, 'POST', user, { kind, body });
   assert.equal(response.status, 201);
   return response.data.posts.find((p: { body: string }) => p.body === body).id as string;
  };
  const remove = (id: string, user?: string) => request('projectPost', id, 'DELETE', user);
  const queueSize = async () => (await request('workbench', undefined, 'GET', 'mentor-sarah')).data.awaitingReply.length;
  const load = async () => (await request('projectQuestions', projectId)).data.find((t: { question: { id: string } }) => t.question.id === qid);
  const staffPost = await post('staff-kevin', 'comment', 'Staff context kept for history.');
  assert.equal((await remove(staffPost)).status, 401);
  assert.equal((await remove(staffPost, 'unknown-user')).status, 401);
  assert.equal((await remove('missing', 'student-alex')).status, 404);
  assert.equal((await remove(staffPost, 'student-mia')).status, 403); // Asking the question does not grant project ownership.
  assert.equal((await remove(staffPost, 'mentor-sarah')).status, 403);
  assert.equal((await load()).posts.length, 1);

  await request('questionReferral', qid, 'POST', 'staff-kevin', { mentorId: 'mentor-sarah', reason: 'Consent experience.' });
  assert.equal(await queueSize(), 1);
  const firstReply = await post('mentor-sarah', 'mentor_reply', 'Use a short opt-in statement.');
  const followUp = await post('student-mia', 'follow_up', 'What should be optional?');
  const secondReply = await post('mentor-sarah', 'mentor_reply', 'Keep notifications optional.');
  assert.equal(await queueSize(), 0);
  // Staff cannot delete another person's reply; the project owner can.
  assert.equal((await remove(secondReply, 'staff-kevin')).status, 403);
  const removedReply = await remove(secondReply, 'student-alex');
  assert.equal(removedReply.status, 200);
  assert.equal(removedReply.data.state, 'awaiting_reply');
  assert.equal(removedReply.data.posts.some((p: { id: string }) => p.id === secondReply), false);
  assert.equal(await queueSize(), 1);
  const db = await database();
  const audit = (await db.query('SELECT * FROM project_posts WHERE id=$1', [secondReply])).rows[0] as Record<string, unknown>;
  assert.equal(audit.body, 'Keep notifications optional.');
  assert.equal(audit.deletedBy, 'student-alex');
  assert.ok(audit.deletedAt);
  assert.equal((await remove(secondReply, 'student-alex')).status, 200); // Safe retry keeps the original audit.
  const retried = (await db.query('SELECT * FROM project_posts WHERE id=$1', [secondReply])).rows[0];
  assert.deepEqual(retried, audit);
  assert.equal((await remove(secondReply, 'staff-kevin')).status, 403);
  assert.ok(!JSON.stringify(removedReply.data).includes('deletedBy'));

  // Deleting the asker's own follow-up restores the earlier replied state.
  const removedFollowUp = await remove(followUp, 'student-mia');
  assert.equal(removedFollowUp.data.state, 'replied');
  assert.equal(await queueSize(), 0);
  // A mentor can delete their own formal reply, returning the question to their queue.
  assert.equal((await remove(firstReply, 'mentor-sarah')).data.state, 'awaiting_reply');
  assert.equal(await queueSize(), 1);
  const staffDelete = await deleteRoute(new Request(`http://localhost/api/project-posts/${staffPost}`, { method: 'DELETE', headers: { 'x-demo-user-id': 'staff-kevin' } }), { params: Promise.resolve({ id: staffPost }) });
  assert.equal(staffDelete.status, 200);
  assert.equal(await queueSize(), 1); // Ordinary comments have no queue effect.
  const ownerPost = await post('student-alex', 'comment', 'Owner comment.');
  assert.equal((await remove(ownerPost, 'student-alex')).status, 200);
  assert.deepEqual((await load()).posts, []);
  assert.ok((await load()).referral); // The question and referral remain.
  const workload = (await request('mentorWorkload', undefined, 'GET', 'staff-kevin')).data;
  assert.equal(workload.items.find((m: { mentor: { id: string } }) => m.mentor.id === 'mentor-sarah').awaitingReply, 1);
  assert.deepEqual((await request('project', projectId)).data.project, before);
  await setup(db); await setup(db); await seed(db); await closeDatabase();
  assert.deepEqual((await load()).posts, []);
  assert.equal((await load()).state, 'awaiting_reply');
  const reopenedDb = await database();
  assert.equal((await reopenedDb.query('SELECT * FROM project_posts WHERE "questionId"=$1', [qid])).rows.length, 5);
 } finally { await closeDatabase(); }
});
