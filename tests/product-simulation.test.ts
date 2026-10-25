import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { closeDatabase, database } from '../src/server/db';
import { handle } from '../src/server/api';
import { threads } from '../src/server/relay';
import { dispatchInvitations } from '../src/server/invitations';
import { importSimulation, mid, pid, qid, batch } from '../scripts/product-simulation';

test('product simulation preserves old rows, builds the exact journey and skips a repeat without overwriting edits', async () => {
 process.env.DATABASE_MODE = 'pglite';
 process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'baton-product-simulation-'));
 const db = await database();
 const call = async (resource: string, user: string, id?: string, method = 'GET', body?: unknown, query = '') => {
  const response = await handle(new Request(`http://localhost/api/${resource}${query}`, { method, headers: { 'x-demo-user-id': user, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }), resource, id);
  return { status: response.status, ...await response.json() };
 };
 try {
  const old = (await db.query('SELECT * FROM projects ORDER BY id')).rows;
  const result = await importSimulation(db);
  assert.equal(result.imported, true);
  assert.equal(result.realModelCalls, 0);
  const publications = (await db.query('SELECT published FROM project_introductions WHERE "projectId" LIKE $1', [`${batch}-%`])).rows;
  assert.equal(publications.length, 20); assert.ok(publications.every((r: any) => r.published.version === 5 && r.published.sources.evidence === 'simulation' && r.published.sources.commit === null && r.published.sources.files.length === 0));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM question_analyses WHERE "questionId" LIKE $1', [`${batch}-%`])).rows[0].n, 24);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM ai_jobs WHERE status IN ('pending','processing') AND id LIKE $1", [`${batch}-%`])).rows[0].n, 0);
  const recommended = await call('questionRecommendations', 'staff-kevin', qid(7)); assert.equal(recommended.data.status, 'ready'); assert.ok(recommended.data.candidates.length > 0); assert.ok(recommended.data.candidates.every((c: any) => c.reason.includes('simulation')));
  assert.deepEqual((await db.query('SELECT * FROM projects WHERE id=ANY($1::text[]) ORDER BY id', [old.map(p => p.id)])).rows, old);
  assert.deepEqual((await db.query('SELECT status,count(*)::int AS n FROM projects WHERE id LIKE $1 GROUP BY status ORDER BY status', [`${batch}-%`])).rows, [{ status: 'finished', n: 6 }, { status: 'ongoing', n: 8 }, { status: 'paused', n: 6 }]);
  assert.deepEqual((await db.query('SELECT "ownerId",count(*)::int AS n FROM projects WHERE id LIKE $1 GROUP BY "ownerId" ORDER BY "ownerId"', [`${batch}-%`])).rows.map(r => r.n), [10,10]);
  const workload = (await call('mentorWorkload', 'staff-kevin')).data.items;
  assert.deepEqual([1,2,3,4].map(n => workload.find((i: any) => i.mentor.id === mid(n)).awaitingReply), [4,2,1,0]);
  assert.equal(workload.find((i: any) => i.mentor.id === 'mentor-sarah').awaitingReply, 1);
  assert.deepEqual((await db.query('SELECT kind,count(*)::int AS n FROM project_posts WHERE id LIKE $1 GROUP BY kind ORDER BY kind', [`${batch}-%`])).rows, [{ kind: 'comment', n: 44 }, { kind: 'follow_up', n: 4 }, { kind: 'mentor_reply', n: 12 }]);
  const events = (await db.query('SELECT * FROM inbox_items WHERE "projectId" LIKE $1', [`${batch}-%`])).rows;
  assert.ok(events.length > 60);
  assert.ok(events.every(i => i.actorId !== i.recipientId && i.kind === 'activity'));
  assert.equal((await call('projects','student-mia',undefined,'GET',undefined,'?q=%5BSimulation%5D&sort=newest')).data.length, 20);
  assert.equal((await call('projects','student-mia',undefined,'GET',undefined,'?q=%5BSimulation%5D&status=paused&sort=recommended')).data.length, 6);
  for (const [parent, child] of [[9,6],[16,7],[11,8]]) {
   assert.equal((await call('project','student-alex',pid(child))).data.source.project.id, pid(parent));
   assert.equal((await call('project','student-alex',pid(parent))).data.successors.length, 1);
  }
  const paged: string[] = []; let cursor = '';
  do {
   const page = (await call('inbox','student-alex',undefined,'GET',undefined,`?limit=7${cursor ? `&cursor=${cursor}` : ''}`)).data;
   paged.push(...page.items.map((i: any) => i.id)); cursor = page.nextCursor;
  } while(cursor);
  assert.equal(paged.length, new Set(paged).size); assert.ok(paged.length > 20);
  await db.query('UPDATE projects SET title=$2 WHERE id=$1', [pid(1), '[Simulation] User edited title']);
  assert.equal((await importSimulation(db)).imported, false);
  assert.equal((await db.query('SELECT title FROM projects WHERE id=$1', [pid(1)])).rows[0].title, '[Simulation] User edited title');
  await dispatchInvitations(db);
  const invites = (await db.query("SELECT * FROM inbox_items WHERE kind='invitation'")).rows;
  assert.ok(invites.length > 0); assert.ok(invites.every(i => i.invitationKind === 'pickup' && !i.questionId));
  // Exercise the normal action handlers only in this disposable database.
  assert.equal((await call('questionReferral','staff-kevin',qid(7),'POST',{ mentorId: mid(4), reason: 'Fictional simulation review of the next milestone.' })).status, 201);
  const reply = await call('questionPosts',mid(4),qid(7),'POST',{ kind: 'mentor_reply', body: 'Use one small reproducible flow for the next test.' });
  assert.equal(reply.status, 201);
  const id = reply.data.posts.at(-1).id;
  const owner = (await db.query('SELECT "ownerId" FROM projects p JOIN project_questions q ON q."projectId"=p.id WHERE q.id=$1', [qid(7)])).rows[0].ownerId as string;
  assert.equal((await call('projectPost',owner,id,'DELETE')).status, 200);
  const authorInbox = (await call('inbox','student-mia')).data;
  assert.ok(authorInbox.items.every((i: any) => i.preview !== 'Use one small reproducible flow for the next test.'));
  await closeDatabase();
  const reopened = await database();
  assert.equal((await importSimulation(reopened)).imported, false);
  assert.equal((await threads(reopened,'id=$1',[qid(15)]))[0].state,'awaiting_reply');
 } finally { await closeDatabase(); }
});

test('simulation rejects partial batches and rolls back a failed import', async () => {
 process.env.DATABASE_MODE = 'pglite';
 process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'baton-simulation-rollback-'));
 const db = await database();
 try {
  await db.query('ALTER TABLE project_posts ADD CONSTRAINT simulation_test_fail CHECK (false) NOT VALID');
  await assert.rejects(importSimulation(db));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM projects WHERE id LIKE $1',[`${batch}-%`])).rows[0].n,0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE id LIKE $1',[`${batch}-%`])).rows[0].n,0);
  await db.query('ALTER TABLE project_posts DROP CONSTRAINT simulation_test_fail');
  await db.query('INSERT INTO users (id,name,role,headline) VALUES ($1,\'Collision\',\'mentor\',\'Test only\')',[mid(1)]);
  await assert.rejects(importSimulation(db),/Partial simulation batch/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM projects WHERE id LIKE $1',[`${batch}-%`])).rows[0].n,0);
 } finally { await closeDatabase(); }
});
