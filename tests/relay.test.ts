import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { GET as workbenchGET } from '../src/app/api/workbench/route';
import { POST as pickupPOST } from '../src/app/api/projects/[id]/pickups/route';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown) {
 const req = new Request(`http://localhost/api/${resource}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
const future = () => new Date(Date.now() + 3 * 86400000).toISOString();
const ids = (list: { question: { id: string } }[]) => list.map(t => t.question.id);

test('pickups create linked Ongoing projects idempotently without changing the source', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p1-pickup-'));
 try {
  const detail = await request('project', 'project-v2-paused');
  assert.deepEqual(Object.keys(detail.data).sort(), ['lessons', 'project', 'source', 'successors']);
  assert.equal(detail.data.source, null); assert.deepEqual(detail.data.successors, []);
  const before = detail.data.project;
  const input = { requestId: randomUUID(), pickupType: 'continue', title: '  Notification pilot  ', goal: 'Deliver one consent-aware reminder for a single event.' };
  assert.equal((await request('pickups', 'project-v2-paused', 'POST', undefined, input)).status, 401);
  assert.equal((await request('pickups', 'project-v2-paused', 'POST', 'mentor-sarah', input)).status, 403);
  assert.equal((await request('pickups', 'project-v2-paused', 'POST', 'staff-kevin', input)).status, 403);
  assert.equal((await request('pickups', 'missing-project', 'POST', 'student-mia', { ...input, requestId: randomUUID() })).status, 404);
  const ongoing = await request('pickups', 'project-events', 'POST', 'student-alex', { ...input, requestId: randomUUID() });
  assert.equal(ongoing.status, 409); assert.equal(ongoing.error.code, 'SOURCE_ONGOING');
  for (const bad of [{ ...input, requestId: 'not-a-uuid' }, { ...input, pickupType: 'fork' }, { ...input, title: '   ' }, { ...input, title: 'x'.repeat(161) }, { ...input, goal: '' }, { ...input, ownerId: 'student-alex' }])
   assert.equal((await request('pickups', 'project-v2-paused', 'POST', 'student-mia', bad)).status, 400);

  const created = await request('pickups', 'project-v2-paused', 'POST', 'student-mia', input);
  assert.equal(created.status, 201);
  const p = created.data.project;
  assert.equal(p.ownerId, 'student-mia'); assert.equal(p.status, 'ongoing'); assert.equal(p.title, 'Notification pilot');
  assert.equal(p.summary, input.goal); assert.equal(p.courseOrClub, before.courseOrClub); assert.deepEqual(p.tags, before.tags);
  assert.equal(p.codeUrl, null); assert.equal(p.demoUrl, null);
  assert.deepEqual(p.reflection, { progress: '', outcomes: [], problems: [], nextTeam: '', whyPaused: '', ifAgain: [], reusable: [] });
  assert.equal(created.data.source.project.id, 'project-v2-paused'); assert.equal(created.data.source.owner.id, 'student-alex');
  assert.equal(created.data.source.pickupType, 'continue'); assert.equal(created.data.source.goal, input.goal);

  // Retry with the same key returns the same project; a changed input with the same key conflicts.
  const retry = await request('pickups', 'project-v2-paused', 'POST', 'student-mia', input);
  assert.equal(retry.status, 200); assert.equal(retry.data.project.id, p.id);
  for (const changed of [{ ...input, goal: 'A different goal' }, { ...input, pickupType: 'improve' }, { ...input, title: 'Other title' }]) {
   const conflict = await request('pickups', 'project-v2-paused', 'POST', 'student-mia', changed);
   assert.equal(conflict.status, 409); assert.equal(conflict.error.code, 'REQUEST_CONFLICT');
  }
  assert.equal((await request('pickups', 'project-v2-finished', 'POST', 'student-mia', input)).status, 409);
  // Keys are scoped to the owner, so another student can use the same key independently.
  const alexOwn = await request('pickups', 'project-v2-paused', 'POST', 'student-alex', { ...input, pickupType: 'reproduce', title: 'Alex restarts', goal: 'Rebuild the signup screen.' });
  assert.equal(alexOwn.status, 201); assert.equal(alexOwn.data.project.ownerId, 'student-alex');

  // Concurrent duplicates create one project.
  const concurrentInput = { requestId: randomUUID(), pickupType: 'improve', title: 'Check-in improvements', goal: 'Improve focus styles.' };
  const concurrent = await Promise.all([1, 2, 3].map(() => request('pickups', 'project-v2-finished', 'POST', 'student-mia', concurrentInput)));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 200, 201]);
  assert.equal(new Set(concurrent.map(r => r.data.project.id)).size, 1);
  const wrapped = await pickupPOST(new Request('http://localhost/api/projects/project-signup/pickups', { method: 'POST', headers: { 'x-demo-user-id': 'student-mia' }, body: JSON.stringify({ ...input, requestId: randomUUID(), pickupType: 'reproduce' }) }), { params: Promise.resolve({ id: 'project-signup' }) });
  assert.equal(wrapped.status, 201);

  const db = await database();
  assert.equal((await db.query('SELECT * FROM project_relations WHERE "requestId"=$1', [concurrentInput.requestId])).rows.length, 1);
  const source = await request('project', 'project-v2-paused');
  assert.deepEqual(source.data.project, before);
  assert.deepEqual(source.data.successors.map((s: { project: { id: string } }) => s.project.id), [p.id, alexOwn.data.project.id]);
  assert.equal(source.data.successors[0].owner.id, 'student-mia'); assert.equal(source.data.successors[0].pickupType, 'continue');

  // The relation keeps the goal at pickup time even after the successor is edited and finished.
  assert.equal((await request('project', p.id, 'PATCH', 'student-alex', { title: 'Not mine' })).status, 403);
  assert.equal((await request('project', p.id, 'PATCH', 'student-mia', { summary: 'Updated summary', status: 'finished', reflection: { outcomes: ['Sent one reminder'], nextTeam: 'Review consent wording.' } })).status, 200);
  const after = await request('project', 'project-v2-paused');
  assert.equal(after.data.successors[0].goal, input.goal); assert.equal(after.data.successors[0].project.status, 'finished');
  assert.equal(after.data.project.status, 'paused');
  await setup(db); await setup(db); await seed(db); await closeDatabase();
  const restarted = await request('project', p.id);
  assert.equal(restarted.data.source.project.id, 'project-v2-paused'); assert.equal(restarted.data.project.summary, 'Updated summary');
 } finally { await closeDatabase(); }
});

test('project questions, referrals, mentor replies and workbench queues follow the contract', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p1-questions-'));
 try {
  const db = await database();
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('mentor-other','Other Mentor','mentor','Fictional test mentor','[]')`);
  const seeded = await request('projectQuestions', 'project-events');
  assert.equal(seeded.status, 200); assert.equal(seeded.data[0].question.id, 'question-events-shifts'); assert.equal(seeded.data[0].state, 'needs_referral');
  assert.equal((await request('projectQuestions', 'missing-project')).status, 404);
  const q = { title: 'Should we send email or in-app confirmations first?', body: 'We can only build one this week.', wantsMentor: true, dueAt: future() };
  assert.equal((await request('projectQuestions', 'project-events', 'POST', undefined, q)).status, 401);
  assert.equal((await request('projectQuestions', 'project-events', 'POST', 'staff-kevin', q)).status, 403);
  assert.equal((await request('projectQuestions', 'project-events', 'POST', 'mentor-sarah', q)).status, 403);
  assert.equal((await request('projectQuestions', 'missing-project', 'POST', 'student-mia', q)).status, 404);
  for (const bad of [{ ...q, dueAt: '2020-01-01T00:00:00.000Z' }, { ...q, dueAt: 'tomorrow' }, { ...q, dueAt: '2030-01-01' }, { ...q, title: '' }, { ...q, title: 'x'.repeat(161) }, { ...q, wantsMentor: 'yes' }, { ...q, projectId: 'other' }])
   assert.equal((await request('projectQuestions', 'project-events', 'POST', 'student-mia', bad)).status, 400);
  const asked = await request('projectQuestions', 'project-events', 'POST', 'student-mia', q);
  assert.equal(asked.status, 201); assert.equal(asked.data.state, 'needs_referral'); assert.equal(asked.data.question.dueAt, q.dueAt);
  assert.equal(asked.data.author.id, 'student-mia'); assert.deepEqual(asked.data.posts, []); assert.equal(asked.data.referral, null);
  const qid = asked.data.question.id;
  // Any student may ask on any project, in any state; body may be empty; discussions skip the Staff queue.
  const discussion = await request('projectQuestions', 'project-v2-paused', 'POST', 'student-alex', { title: 'Open thoughts on consent copy?', body: '', wantsMentor: false, dueAt: null });
  assert.equal(discussion.status, 201); assert.equal(discussion.data.state, 'discussion');
  const did = discussion.data.question.id;

  const staffBench = await request('workbench', undefined, 'GET', 'staff-kevin');
  assert.deepEqual(ids(staffBench.data.needsReferral), ['question-events-shifts', qid]);
  assert.ok(!ids(staffBench.data.needsReferral).includes(did)); assert.ok(!ids(staffBench.data.needsReferral).includes('question-checkin-reuse'));
  assert.deepEqual(staffBench.data.awaitingReply, []); assert.deepEqual(staffBench.data.replied, []);
  assert.equal((await request('workbench', undefined, 'GET', 'student-mia')).status, 403);
  assert.equal((await request('workbench')).status, 401);
  assert.equal((await workbenchGET(new Request('http://localhost/api/workbench', { headers: { 'x-demo-user-id': 'mentor-sarah' } }))).status, 200);

  // Posting permissions.
  assert.equal((await request('questionPosts', 'missing', 'POST', 'student-mia', { body: 'Hi', kind: 'comment' })).status, 404);
  assert.equal((await request('questionPosts', qid, 'POST', undefined, { body: 'Hi', kind: 'comment' })).status, 401);
  assert.equal((await request('questionPosts', qid, 'POST', 'student-mia', { body: '  ', kind: 'comment' })).status, 400);
  assert.equal((await request('questionPosts', qid, 'POST', 'student-mia', { body: 'Hi', kind: 'reply' })).status, 400);
  assert.equal((await request('questionPosts', qid, 'POST', 'student-alex', { body: 'Not my question', kind: 'follow_up' })).status, 403);
  assert.equal((await request('questionPosts', qid, 'POST', 'mentor-sarah', { body: 'Not referred yet', kind: 'mentor_reply' })).status, 403);
  for (const user of ['student-alex', 'mentor-sarah', 'staff-kevin', 'student-mia'])
   assert.equal((await request('questionPosts', qid, 'POST', user, { body: `Comment from ${user}`, kind: 'comment' })).status, 201);

  // Referral rules.
  const referral = { mentorId: 'mentor-sarah', reason: 'Sarah has built confirmation flows.' };
  assert.equal((await request('questionReferral', qid, 'POST', 'student-mia', referral)).status, 403);
  assert.equal((await request('questionReferral', qid, 'POST', 'mentor-sarah', referral)).status, 403);
  assert.equal((await request('questionReferral', 'missing', 'POST', 'staff-kevin', referral)).status, 404);
  assert.equal((await request('questionReferral', qid, 'POST', 'staff-kevin', { ...referral, mentorId: 'student-alex' })).status, 400);
  assert.equal((await request('questionReferral', qid, 'POST', 'staff-kevin', { ...referral, reason: 'x'.repeat(301) })).status, 400);
  assert.equal((await request('questionReferral', qid, 'POST', 'staff-kevin', { ...referral, reason: '' })).status, 400);
  const notRequested = await request('questionReferral', did, 'POST', 'staff-kevin', referral);
  assert.equal(notRequested.status, 409); assert.equal(notRequested.error.code, 'MENTOR_NOT_REQUESTED');
  const raced = await Promise.all([request('questionReferral', qid, 'POST', 'staff-kevin', referral), request('questionReferral', qid, 'POST', 'staff-kevin', { mentorId: 'mentor-other', reason: 'Concurrent' })]);
  assert.deepEqual(raced.map(r => r.status).sort(), [201, 409]);
  assert.equal((await request('questionReferral', qid, 'POST', 'staff-kevin', referral)).status, 409);
  assert.equal((await db.query('SELECT * FROM project_referrals WHERE "questionId"=$1', [qid])).rows.length, 1);
  // Make the stored mentor deterministic for the rest of the journey.
  await db.query('UPDATE project_referrals SET "mentorId"=$1, reason=$2 WHERE "questionId"=$3', ['mentor-sarah', referral.reason, qid]);
  let threadNow = (await request('projectQuestions', 'project-events')).data.find((t: { question: { id: string } }) => t.question.id === qid);
  assert.equal(threadNow.state, 'awaiting_reply'); assert.equal(threadNow.referral.mentor.id, 'mentor-sarah'); assert.equal(threadNow.referral.staff.id, 'staff-kevin');
  assert.deepEqual(ids((await request('workbench', undefined, 'GET', 'mentor-sarah')).data.awaitingReply), [qid]);
  assert.deepEqual((await request('workbench', undefined, 'GET', 'mentor-other')).data.awaitingReply, []);
  assert.ok(ids((await request('workbench', undefined, 'GET', 'staff-kevin')).data.referred).includes(qid));
  assert.ok(!ids((await request('workbench', undefined, 'GET', 'staff-kevin')).data.needsReferral).includes(qid));

  // Mentor replies, comments and follow-ups drive the queue.
  assert.equal((await request('questionPosts', qid, 'POST', 'mentor-other', { body: 'Pretend reply', kind: 'mentor_reply' })).status, 403);
  const reply = await request('questionPosts', qid, 'POST', 'mentor-sarah', { body: 'Start with in-app confirmation.', kind: 'mentor_reply' });
  assert.equal(reply.status, 201); assert.equal(reply.data.state, 'replied');
  let sarah = (await request('workbench', undefined, 'GET', 'mentor-sarah')).data;
  assert.deepEqual(sarah.awaitingReply, []); assert.deepEqual(ids(sarah.replied), [qid]);
  for (const [user, body] of [['student-mia', 'Thanks!'], ['staff-kevin', 'Glad this helped.'], ['student-alex', 'We saw the same thing.'], ['mentor-other', 'Agree.']])
   assert.equal((await request('questionPosts', qid, 'POST', user, { body, kind: 'comment' })).data.state, 'replied');
  const followUp = await request('questionPosts', qid, 'POST', 'student-mia', { body: 'What should we test first?', kind: 'follow_up' });
  assert.equal(followUp.data.state, 'awaiting_reply');
  sarah = (await request('workbench', undefined, 'GET', 'mentor-sarah')).data;
  assert.deepEqual(ids(sarah.awaitingReply), [qid]); assert.deepEqual(sarah.replied, []);
  assert.equal((await request('questionPosts', qid, 'POST', 'mentor-sarah', { body: 'A comment is not a reply.', kind: 'comment' })).data.state, 'awaiting_reply');
  const second = await request('questionPosts', qid, 'POST', 'mentor-sarah', { body: 'Test with five students first.', kind: 'mentor_reply' });
  assert.equal(second.data.state, 'replied');
  const kinds = second.data.posts.map((p: { kind: string }) => p.kind);
  assert.deepEqual(kinds.filter((k: string) => k !== 'comment'), ['mentor_reply', 'follow_up', 'mentor_reply']);
  const times = second.data.posts.map((p: { createdAt: string }) => p.createdAt);
  assert.deepEqual([...times].sort(), times);
  assert.ok(second.data.posts.every((p: { questionId: string }) => p.questionId === qid));

  // Threads do not leak across questions or projects; status changes keep questions open.
  const otherThread = (await request('projectQuestions', 'project-events')).data.find((t: { question: { id: string } }) => t.question.id === 'question-events-shifts');
  assert.deepEqual(otherThread.posts, []); assert.equal(otherThread.referral, null);
  assert.equal((await request('projectQuestions', 'project-v2-paused')).data.length, 1);
  assert.equal((await request('project', 'project-events', 'PATCH', 'student-mia', { status: 'paused', reflection: { whyPaused: 'Waiting for advice.', ifAgain: ['Ask earlier.'] } })).status, 200);
  assert.equal((await request('questionPosts', qid, 'POST', 'student-mia', { body: 'Still open after pausing?', kind: 'follow_up' })).data.state, 'awaiting_reply');
  assert.deepEqual(ids((await request('workbench', undefined, 'GET', 'mentor-sarah')).data.awaitingReply), [qid]);

  // Persistence across repeated migrations and restart.
  await setup(db); await setup(db); await seed(db); await closeDatabase();
  const restarted = (await request('projectQuestions', 'project-events')).data.find((t: { question: { id: string } }) => t.question.id === qid);
  assert.equal(restarted.state, 'awaiting_reply'); assert.equal(restarted.posts.length, second.data.posts.length + 1); assert.equal(restarted.question.dueAt, q.dueAt);
  assert.equal((await request('comments', 'lesson-fields')).status, 200);
  assert.equal((await request('adoptions', 'lesson-fields', 'POST', 'student-mia')).status, 410);
 } finally { await closeDatabase(); }
});
