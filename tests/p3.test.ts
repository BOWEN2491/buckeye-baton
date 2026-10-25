import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { setClock } from '../src/server/priority';
import { PATCH as questionPATCH } from '../src/app/api/project-questions/[id]/route';
import { GET as priorityGET } from '../src/app/api/projects/[id]/priority/route';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown, query = '') {
 const req = new Request(`http://localhost/api/${resource}${query}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
// Fixed rule clock (server-side injection only); boundary rows are written relative to it.
const H = 3_600_000, D = 24 * H;
const A = Date.parse('2027-03-01T12:00:00.000Z');
const at = (offset: number) => new Date(A + offset).toISOString();
type Db = Awaited<ReturnType<typeof database>>;
const reflection = JSON.stringify({ progress: '', outcomes: [], problems: [], nextTeam: '', whyPaused: 'Fictional pause.', ifAgain: ['Start smaller.'], reusable: [] });
async function project(db: Db, id: string, status: string, createdOffset: number, owner = 'student-alex', title = `P3 ${id}`) {
 await db.query('INSERT INTO projects (id,"ownerId",title,summary,"courseOrClub",term,tags,status,reflection,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)', [id, owner, title, 'Fictional P3 test project.', 'OSU', 'Spring 2027', '[]', status, reflection, at(createdOffset)]);
}
async function question(db: Db, id: string, projectId: string, createdOffset: number, opts: { due?: number | null; wantsMentor?: boolean; author?: string } = {}) {
 await db.query('INSERT INTO project_questions (id,"projectId","authorId",title,body,"wantsMentor","dueAt","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [id, projectId, opts.author ?? 'student-mia', `Question ${id}`, '', opts.wantsMentor ?? true, opts.due === undefined || opts.due === null ? null : at(opts.due), at(createdOffset)]);
}
async function referral(db: Db, questionId: string, offset: number, mentorId = 'mentor-sarah') {
 await db.query('INSERT INTO project_referrals (id,"questionId","staffId","mentorId",reason,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [`ref-${questionId}`, questionId, 'staff-kevin', mentorId, 'Fits.', at(offset)]);
}
async function post(db: Db, id: string, questionId: string, kind: string, offset: number, author: string) {
 await db.query('INSERT INTO project_posts (id,"questionId","authorId",body,kind,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [id, questionId, author, `${kind} ${id}`, kind, at(offset)]);
}
const detail = async (id: string) => (await request('projectPriority', id)).data;
const qp = async (projectId: string, questionId: string) => (await detail(projectId)).questions.find((q: any) => q.questionId === questionId).priority;
const sum = (reasons: { points: number }[]) => reasons.reduce((s, r) => s + r.points, 0);

test('P3 rules: shared-age pickup boost and age-only waiting points, pendingSince and max aggregation', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p3-rules-'));
 setClock(() => new Date(A));
 try {
  const db = await database();
  // J1: Paused with no successor, by published age (createdAt) only.
  const ages: [string, number, number][] = [['age-6d', -7 * D + 1000, 0], ['age-7d', -7 * D, 5], ['age-13d', -14 * D + 1000, 5], ['age-14d', -14 * D, 10], ['age-28d', -28 * D, 20], ['age-200d', -200 * D, 20], ['age-future', 3 * D, 0]];
  for (const [id, offset] of ages) await project(db, id, 'paused', offset);
  await project(db, 'finished-old', 'finished', -60 * D);
  await project(db, 'ongoing-old', 'ongoing', -60 * D);
  await project(db, 'paused-picked', 'paused', -60 * D);
  await project(db, 'successor', 'finished', -1 * D, 'student-mia', 'Successor of picked');
  await db.query('INSERT INTO project_relations (id,"sourceProjectId","projectId","ownerId","requestId","pickupType",title,goal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['rel-1', 'paused-picked', 'successor', 'student-mia', 'req-1', 'continue', 'Successor of picked', 'Goal']);
  for (const [id, , points] of ages) {
   const p = (await detail(id)).priority;
   assert.equal(p.score, points, id); assert.equal(sum(p.reasons), p.score, id);
   if (points) { assert.equal(p.reasons[0].code, 'no_pickup'); assert.equal(p.reasons[0].questionId, null); }
  }
  assert.equal((await detail('age-14d')).priority.reasons[0].label, 'Shared 14 days ago · no pickup yet');
  assert.ok(!JSON.stringify(await detail('age-28d')).toLowerCase().includes('paused for'));
  for (const id of ['finished-old', 'ongoing-old', 'paused-picked']) assert.equal((await detail(id)).priority.score, 0, id);

  // J2/J3: question points on one ongoing project.
  await project(db, 'qp', 'ongoing', -1 * D);
  const cases: [string, number, number | null, number, string[]][] = [
   ['w-23h', -D + 1000, null, 0, []], ['w-1d', -D, null, 5, ['waiting_for_reply']], ['w-3d', -3 * D, null, 15, ['waiting_for_reply']], ['w-6d', -6 * D, null, 30, ['waiting_for_reply']], ['w-9d', -9 * D, null, 30, ['waiting_for_reply']],
   ['due-now', -H, 0, 0, []], ['due-past', -H, -2 * D, 0, []], ['due-24h', -H, 24 * H, 0, []], ['due-24h+1', -H, 24 * H + 1000, 0, []],
   ['due-72h', -H, 72 * H, 0, []], ['due-72h+1', -H, 72 * H + 1000, 0, []], ['wait-and-due', -4 * D, 2 * H, 20, ['waiting_for_reply']], ['future-created', 2 * H, null, 0, []],
  ];
  for (const [id, created, due] of cases) await question(db, id, 'qp', created, { due });
  for (const [id, , , score, codes] of cases) {
   const p = await qp('qp', id);
   assert.equal(p.score, score, id); assert.deepEqual(p.reasons.map((r: any) => r.code), codes, id); assert.equal(sum(p.reasons), score, id);
   assert.ok(p.reasons.every((r: any) => r.questionId === id), id);
  }
  assert.equal((await qp('qp', 'future-created')).waitingHours, 0);
  assert.equal((await qp('qp', 'w-3d')).reasons[0].label, 'Waiting 3 days for a reply');
  assert.deepEqual((await qp('qp', 'due-past')).reasons, []);
  // Project takes only the single highest question (55), never stacked across questions.
  assert.equal((await detail('qp')).priority.score, 30);
  assert.deepEqual((await detail('qp')).priority.reasons.map((r: any) => r.questionId), ['w-9d']);

  // Non-pending states have no priority even with a passed date; pendingSince across replies and follow-ups.
  await project(db, 'states', 'ongoing', -30 * D);
  await question(db, 'discussion', 'states', -10 * D, { due: -D, wantsMentor: false });
  await question(db, 'replied', 'states', -10 * D, { due: -D }); await referral(db, 'replied', -9 * D); await post(db, 'r-reply', 'replied', 'mentor_reply', -8 * D, 'mentor-sarah');
  await question(db, 'cycle', 'states', -10 * D); await referral(db, 'cycle', -9 * D);
  assert.equal(await qp('states', 'discussion'), null); assert.equal(await qp('states', 'replied'), null);
  assert.equal((await qp('states', 'cycle')).pendingSince, at(-10 * D)); // referral does not reset
  await post(db, 'c-reply', 'cycle', 'mentor_reply', -8 * D, 'mentor-sarah');
  assert.equal(await qp('states', 'cycle'), null);
  await post(db, 'c-thanks', 'cycle', 'comment', -7 * D, 'student-mia');
  assert.equal(await qp('states', 'cycle'), null);
  await post(db, 'c-f1', 'cycle', 'follow_up', -5 * D, 'student-mia');
  await post(db, 'c-note', 'cycle', 'comment', -4 * D, 'staff-kevin');
  await post(db, 'c-f2', 'cycle', 'follow_up', -2 * D, 'student-mia');
  let cycle = await qp('states', 'cycle');
  assert.equal(cycle.pendingSince, at(-5 * D)); assert.equal(cycle.score, 25); // consecutive follow-ups do not reset
  assert.equal((await request('projectPost', 'c-f1', 'DELETE', 'student-mia')).status, 200);
  assert.equal((await qp('states', 'cycle')).pendingSince, at(-2 * D)); // recomputed from remaining posts
  assert.equal((await request('projectPost', 'c-reply', 'DELETE', 'mentor-sarah')).status, 200);
  cycle = await qp('states', 'cycle');
  assert.equal(cycle.pendingSince, at(-10 * D)); assert.equal(cycle.score, 30);

  // Ties: same score → earlier pendingSince → earlier createdAt → id.
  await project(db, 'ties', 'ongoing', -30 * D);
  await question(db, 'tie-b', 'ties', -3 * D); await question(db, 'tie-a', 'ties', -3 * D); await question(db, 'tie-c', 'ties', -3 * D - H);
  assert.equal((await detail('ties')).priority.reasons[0].questionId, 'tie-c');
  await db.query('DELETE FROM project_questions WHERE id=$1', ['tie-c']);
  assert.equal((await detail('ties')).priority.reasons[0].questionId, 'tie-a');
  // Pickup boost plus the best question; capped at 100 by construction (20 + 80).
  await project(db, 'combo', 'paused', -90 * D);
  await question(db, 'combo-q', 'combo', -8 * D, { due: -H });
  assert.equal((await detail('combo')).priority.score, 50);
  assert.deepEqual((await detail('combo')).priority.reasons.map((r: any) => r.code), ['no_pickup', 'waiting_for_reply']);
  assert.equal((await request('projectPriority', 'missing')).status, 404);
  assert.equal((await priorityGET(new Request('http://localhost/api/projects/combo/priority'), { params: Promise.resolve({ id: 'combo' }) })).status, 200);
 } finally { setClock(null); await closeDatabase(); }
});

test('P3 API: Recommended/Newest projects, prioritized workbench, owner advice and author reply-date edits', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p3-api-'));
 setClock(() => new Date(A));
 try {
  const db = await database();
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('mentor-other','Other Mentor','mentor','Fictional test mentor','[]')`);
  await project(db, 'old-paused', 'paused', -30 * D, 'student-alex', 'Zebra Old Paused');
  await project(db, 'same-a', 'ongoing', -2 * D, 'student-alex', 'Tie Alpha'); await project(db, 'same-b', 'ongoing', -2 * D, 'student-alex', 'Tie Beta');
  await project(db, 'picked-src', 'paused', -40 * D, 'student-alex', 'Filtered Source');
  await project(db, 'picked-new', 'ongoing', -D, 'student-mia', 'Hidden Successor');
  await db.query('INSERT INTO project_relations (id,"sourceProjectId","projectId","ownerId","requestId","pickupType",title,goal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['rel-p', 'picked-src', 'picked-new', 'student-mia', 'req-p', 'continue', 'Hidden Successor', 'Goal']);
  await project(db, 'busy', 'ongoing', -10 * D, 'student-alex', 'Busy Ongoing');
  await question(db, 'busy-due', 'busy', -H, { due: 12 * H }); // 35
  await question(db, 'busy-old', 'busy', -8 * D); // 30, older
  await question(db, 'busy-replied', 'busy', -9 * D); await referral(db, 'busy-replied', -9 * D + H); await post(db, 'br-r', 'busy-replied', 'mentor_reply', -8 * D, 'mentor-sarah');
  await question(db, 'busy-other', 'busy', -5 * D); await referral(db, 'busy-other', -5 * D + H, 'mentor-other');
  await question(db, 'busy-awaiting', 'busy', -4 * D, { due: -H }); await referral(db, 'busy-awaiting', -4 * D + H);

  // Default and Newest keep the BrowseProject shape and createdAt desc, id asc.
  const plain = (await request('projects')).data;
  assert.ok(plain.every((p: any) => !('priority' in p) && 'introduction' in p));
  const newest = (await request('projects', undefined, 'GET', undefined, undefined, '?sort=newest')).data;
  assert.deepEqual(newest.map((p: any) => p.id), plain.map((p: any) => p.id));
  const iA = newest.findIndex((p: any) => p.id === 'same-a'), iB = newest.findIndex((p: any) => p.id === 'same-b');
  assert.equal(iB, iA + 1);
  for (const bad of ['?sort=', '?sort=popular', '?sort=Recommended']) assert.equal((await request('projects', undefined, 'GET', undefined, undefined, bad)).status, 400);

  // Recommended: every matching project, score desc then Newest order; reasons sum to score.
  const rec = (await request('projects', undefined, 'GET', undefined, undefined, '?sort=recommended')).data;
  assert.equal(rec.length, plain.length);
  assert.ok(rec.every((p: any) => p.priority && sum(p.priority.reasons) === p.priority.score && 'introduction' in p));
  for (let i = 1; i < rec.length; i++) assert.ok(rec[i - 1].priority.score >= rec[i].priority.score);
  const byId = Object.fromEntries(rec.map((p: any) => [p.id, p.priority.score]));
  assert.equal(byId['busy'], 30); assert.equal(byId['old-paused'], 20); assert.equal(byId['picked-src'], 0); assert.equal(byId['same-a'], 0);
  assert.deepEqual(rec.slice(0, 3).map((p: any) => [p.id, p.priority.score]), [['busy', 30], ['project-events', 30], ['old-paused', 20]]); // tied project scores keep Newest order
  const zeros = rec.filter((p: any) => p.priority.score === 0).map((p: any) => p.id);
  assert.deepEqual(zeros, newest.filter((p: any) => zeros.includes(p.id)).map((p: any) => p.id));
  // Filters apply first, but successor counts use all relations.
  const filtered = (await request('projects', undefined, 'GET', undefined, undefined, '?sort=recommended&q=Filtered&status=paused')).data;
  assert.deepEqual(filtered.map((p: any) => [p.id, p.priority.score]), [['picked-src', 0]]);

  // Workbench Priority: same four keys and groups, Mentor sees only own, pending before replied.
  const oldest = (await request('workbench', undefined, 'GET', 'staff-kevin')).data;
  const staff = (await request('workbench', undefined, 'GET', 'staff-kevin', undefined, '?sort=priority')).data;
  assert.deepEqual(Object.keys(staff).sort(), ['awaitingReply', 'needsReferral', 'referred', 'replied']);
  assert.deepEqual((await request('workbench', undefined, 'GET', 'staff-kevin', undefined, '?sort=oldest')).data, oldest);
  assert.ok(oldest.needsReferral.every((t: any) => !('priority' in t)));
  for (const key of ['needsReferral', 'referred']) assert.deepEqual(staff[key].map((t: any) => t.question.id).sort(), oldest[key].map((t: any) => t.question.id).sort());
  const needIds = staff.needsReferral.map((t: any) => t.question.id);
  assert.ok(needIds.indexOf('busy-old') < needIds.indexOf('busy-due'));
  const referredIds = staff.referred.map((t: any) => t.question.id);
  assert.equal(referredIds[referredIds.length - 1], 'busy-replied');
  assert.equal(staff.referred.find((t: any) => t.question.id === 'busy-replied').priority, null);
  assert.ok(referredIds.indexOf('busy-other') < referredIds.indexOf('busy-awaiting'));
  const sarah = (await request('workbench', undefined, 'GET', 'mentor-sarah', undefined, '?sort=priority')).data;
  assert.deepEqual(sarah.awaitingReply.map((t: any) => t.question.id), ['busy-awaiting']);
  assert.deepEqual(sarah.replied.map((t: any) => t.question.id), ['busy-replied']);
  assert.ok(!JSON.stringify(sarah).includes('busy-other'));
  assert.deepEqual(sarah.needsReferral, []); assert.deepEqual(sarah.referred, []);
  assert.equal((await request('workbench', undefined, 'GET', 'student-mia', undefined, '?sort=priority')).status, 403);
  assert.equal((await request('workbench', undefined, 'GET', undefined, undefined, '?sort=priority')).status, 401);
  assert.equal((await request('workbench', undefined, 'GET', 'staff-kevin', undefined, '?sort=fast')).status, 400);
  const workload = async () => (await request('mentorWorkload', undefined, 'GET', 'staff-kevin')).data.items.map((i: any) => [i.mentor.id, i.awaitingReply]);
  const loadBefore = await workload();
  assert.deepEqual(loadBefore, [['mentor-other', 1], ['mentor-sarah', 1]]);

  // Advice for an old paused project with an old question nearing its date.
  await question(db, 'old-q', 'old-paused', -4 * D, { due: 6 * H });
  const advice = (await detail('old-paused')).advice;
  assert.deepEqual(advice.map((a: any) => [a.code, a.questionId]), [['improve_handoff', null], ['narrow_question', 'old-q']]);
  assert.ok(!/probab|guarantee|likely/i.test(JSON.stringify(advice)));
  assert.deepEqual((await detail('same-a')).advice, []);

  // J6: author-only reply-date edits; the project owner (Alex) cannot change Mia's question.
  const future = new Date(Date.now() + 5 * D).toISOString();
  const snapshot = async () => (await db.query('SELECT id, title, body, "authorId", "wantsMentor", "createdAt" FROM project_questions ORDER BY id')).rows;
  const projectsBefore = (await db.query('SELECT * FROM projects ORDER BY id')).rows;
  const questionsBefore = await snapshot();
  const postsBefore = (await db.query('SELECT * FROM project_posts ORDER BY id')).rows;
  const hashBefore = (await request('introduction', 'busy', 'GET', 'student-alex')).data.sourceHash;
  const priorityBeforeDateEdit = await qp('busy', 'busy-awaiting');
  const projectBeforeDateEdit = (await detail('busy')).priority;
  assert.equal((await request('projectQuestion', 'busy-awaiting', 'PATCH', undefined, { dueAt: future })).status, 401);
  assert.equal((await request('projectQuestion', 'missing', 'PATCH', 'student-mia', { dueAt: future })).status, 404);
  for (const user of ['student-alex', 'staff-kevin', 'mentor-sarah']) assert.equal((await request('projectQuestion', 'busy-awaiting', 'PATCH', user, { dueAt: future })).status, 403, user);
  for (const bad of [{}, { dueAt: future, title: 'x' }, { dueAt: future, wantsMentor: false }, { dueAt: '2020-01-01T00:00:00.000Z' }, { dueAt: new Date().toISOString() }, { dueAt: 'soon' }, { dueAt: '2030-01-01' }])
   assert.equal((await request('projectQuestion', 'busy-awaiting', 'PATCH', 'student-mia', bad)).status, 400, JSON.stringify(bad));
  const updated = await request('projectQuestion', 'busy-awaiting', 'PATCH', 'student-mia', { dueAt: future });
  assert.equal(updated.status, 200); assert.equal(updated.data.question.dueAt, future); assert.equal(updated.data.state, 'awaiting_reply');
  assert.deepEqual(await qp('busy', 'busy-awaiting'), priorityBeforeDateEdit);
  assert.deepEqual((await detail('busy')).priority, projectBeforeDateEdit);
  assert.ok(!('priority' in updated.data));
  assert.equal((await qp('busy', 'busy-awaiting')).pendingSince, at(-4 * D));
  const cleared = await questionPATCH(new Request('http://localhost/api/project-questions/busy-awaiting', { method: 'PATCH', headers: { 'x-demo-user-id': 'student-mia' }, body: JSON.stringify({ dueAt: null }) }), { params: Promise.resolve({ id: 'busy-awaiting' }) });
  assert.equal(cleared.status, 200); assert.equal((await cleared.json()).data.question.dueAt, null);
  assert.deepEqual(await snapshot(), questionsBefore);
  assert.deepEqual((await db.query('SELECT * FROM projects ORDER BY id')).rows, projectsBefore);
  assert.deepEqual((await db.query('SELECT * FROM project_posts ORDER BY id')).rows, postsBefore);
  assert.equal((await request('introduction', 'busy', 'GET', 'student-alex')).data.sourceHash, hashBefore);
  assert.deepEqual(await workload(), loadBefore);
  assert.equal((await qp('busy', 'busy-awaiting')).score, 20);

  // Reads never write; priority recomputes after restart and repeated setup.
  const tables = async () => Promise.all(['projects', 'project_questions', 'project_posts', 'project_referrals', 'project_relations', 'project_introductions'].map(async t => (await db.query(`SELECT * FROM ${t} ORDER BY 1`)).rows));
  const before = await tables();
  for (let i = 0; i < 3; i++) { await request('projects', undefined, 'GET', undefined, undefined, '?sort=recommended'); await detail('busy'); await request('workbench', undefined, 'GET', 'staff-kevin', undefined, '?sort=priority'); }
  assert.deepEqual(await tables(), before);
  const recBefore = (await request('projects', undefined, 'GET', undefined, undefined, '?sort=recommended')).data.map((p: any) => [p.id, p.priority.score]);
  await setup(db); await setup(db); await seed(db); await closeDatabase();
  assert.deepEqual((await request('projects', undefined, 'GET', undefined, undefined, '?sort=recommended')).data.map((p: any) => [p.id, p.priority.score]), recBefore);
 } finally { setClock(null); await closeDatabase(); }
});

// R1 (P3_REVIEW.md): ties across questions compare exact database microseconds, not millisecond ISO.
test('P3 R1 scenario A: never-replied questions 100 µs apart order by exact createdAt', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p3-r1-'));
 setClock(() => new Date(A));
 try {
  const db = await database();
  const insertQuestion = (id: string, projectId: string, createdAt: string) => db.query('INSERT INTO project_questions (id,"projectId","authorId",title,body,"wantsMentor","dueAt","createdAt") VALUES ($1,$2,$3,$4,$5,true,NULL,$6)', [id, projectId, 'student-mia', `Question ${id}`, '', createdAt]);
  const insertPost = (id: string, questionId: string, kind: string, author: string, createdAt: string) => db.query('INSERT INTO project_posts (id,"questionId","authorId",body,kind,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [id, questionId, author, kind, kind, createdAt]);
  const ids = (list: any[], only: string[]) => list.map(t => t.question.id).filter(id => only.includes(id));
  const staffQueue = async (sort: string) => (await request('workbench', undefined, 'GET', 'staff-kevin', undefined, `?sort=${sort}`)).data;
  const reasonQuestion = async (projectId: string) => [...new Set((await detail(projectId)).priority.reasons.map((r: any) => r.questionId))];

  // Scenario A: never-replied questions created 100 µs apart; both score 30.
  await project(db, 'r1-a', 'ongoing', -30 * D);
  await insertQuestion('z-earlier', 'r1-a', '2027-02-20T12:00:00.000100Z');
  await insertQuestion('a-later', 'r1-a', '2027-02-20T12:00:00.000200Z');
  assert.equal((await qp('r1-a', 'z-earlier')).score, 30); assert.equal((await qp('r1-a', 'a-later')).score, 30);
  assert.deepEqual(ids((await staffQueue('oldest')).needsReferral, ['z-earlier', 'a-later']), ['z-earlier', 'a-later']);
  assert.deepEqual(ids((await staffQueue('priority')).needsReferral, ['z-earlier', 'a-later']), ['z-earlier', 'a-later']);
  assert.deepEqual(await reasonQuestion('r1-a'), ['z-earlier']);
  // Public dates keep the millisecond ISO format and no internal key leaks.
  const listed = (await request('projectQuestions', 'r1-a')).data;
  assert.deepEqual(listed.map((t: any) => t.question.createdAt), ['2027-02-20T12:00:00.000Z', '2027-02-20T12:00:00.000Z']);
  assert.ok(!JSON.stringify(listed).includes('createdAtUs'));

 } finally { setClock(null); await closeDatabase(); }
});

test('P3 R1 scenario B and exact ties: follow-ups 100 µs apart order by exact pendingSince, then createdAt, then id', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p3-r1b-'));
 setClock(() => new Date(A));
 try {
  const db = await database();
  const insertQuestion = (id: string, projectId: string, createdAt: string) => db.query('INSERT INTO project_questions (id,"projectId","authorId",title,body,"wantsMentor","dueAt","createdAt") VALUES ($1,$2,$3,$4,$5,true,NULL,$6)', [id, projectId, 'student-mia', `Question ${id}`, '', createdAt]);
  const insertPost = (id: string, questionId: string, kind: string, author: string, createdAt: string) => db.query('INSERT INTO project_posts (id,"questionId","authorId",body,kind,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [id, questionId, author, kind, kind, createdAt]);
  const ids = (list: any[], only: string[]) => list.map(t => t.question.id).filter(id => only.includes(id));
  const staffQueue = async (sort: string) => (await request('workbench', undefined, 'GET', 'staff-kevin', undefined, `?sort=${sort}`)).data;
  const reasonQuestion = async (projectId: string) => [...new Set((await detail(projectId)).priority.reasons.map((r: any) => r.questionId))];

  // Scenario B: creation order opposite to wait order; first unanswered follow-ups 100 µs apart.
  await project(db, 'r1-b', 'ongoing', -30 * D);
  await insertQuestion('b-z-earlier', 'r1-b', '2027-02-19T12:00:00.000000Z');
  await insertQuestion('b-a-later', 'r1-b', '2027-02-20T12:00:00.000000Z');
  for (const q of ['b-z-earlier', 'b-a-later']) {
   await db.query('INSERT INTO project_referrals (id,"questionId","staffId","mentorId",reason,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [`ref-${q}`, q, 'staff-kevin', 'mentor-sarah', 'Fits.', '2027-02-20T13:00:00.000000Z']);
   await insertPost(`${q}-reply`, q, 'mentor_reply', 'mentor-sarah', '2027-02-21T12:00:00.000000Z');
  }
  await insertPost('b-z-earlier-f', 'b-z-earlier', 'follow_up', 'student-mia', '2027-02-22T12:00:00.000200Z');
  await insertPost('b-a-later-f', 'b-a-later', 'follow_up', 'student-mia', '2027-02-22T12:00:00.000100Z');
  assert.equal((await qp('r1-b', 'b-z-earlier')).score, 30); assert.equal((await qp('r1-b', 'b-a-later')).score, 30);
  assert.deepEqual(ids((await request('workbench', undefined, 'GET', 'mentor-sarah', undefined, '?sort=priority')).data.awaitingReply, ['b-z-earlier', 'b-a-later']), ['b-a-later', 'b-z-earlier']);
  assert.deepEqual(ids((await staffQueue('priority')).referred, ['b-z-earlier', 'b-a-later']), ['b-a-later', 'b-z-earlier']);
  assert.deepEqual(ids((await staffQueue('oldest')).referred, ['b-z-earlier', 'b-a-later']), ['b-z-earlier', 'b-a-later']);
  assert.deepEqual(await reasonQuestion('r1-b'), ['b-a-later']);

  // Same exact pendingSince, different exact createdAt → createdAt decides (both waits start at follow-ups).
  await project(db, 'r1-c', 'ongoing', -30 * D);
  await insertQuestion('c-b', 'r1-c', '2027-02-19T12:00:00.000300Z');
  await insertQuestion('c-a', 'r1-c', '2027-02-19T12:00:00.000400Z');
  for (const q of ['c-a', 'c-b']) {
   await db.query('INSERT INTO project_referrals (id,"questionId","staffId","mentorId",reason,"createdAt") VALUES ($1,$2,$3,$4,$5,$6)', [`ref-${q}`, q, 'staff-kevin', 'mentor-sarah', 'Fits.', '2027-02-20T13:00:00.000000Z']);
   await insertPost(`${q}-reply`, q, 'mentor_reply', 'mentor-sarah', '2027-02-21T12:00:00.000000Z');
   await insertPost(`${q}-f`, q, 'follow_up', 'student-mia', '2027-02-22T12:00:00.000500Z');
  }
  assert.deepEqual(await reasonQuestion('r1-c'), ['c-b']);
  // Fully identical exact times → id ascending.
  await project(db, 'r1-d', 'ongoing', -30 * D);
  await insertQuestion('d-b', 'r1-d', '2027-02-20T12:00:00.000700Z');
  await insertQuestion('d-a', 'r1-d', '2027-02-20T12:00:00.000700Z');
  assert.deepEqual(await reasonQuestion('r1-d'), ['d-a']);
  assert.deepEqual(ids((await staffQueue('priority')).needsReferral, ['d-a', 'd-b']), ['d-a', 'd-b']);
 } finally { setClock(null); await closeDatabase(); }
});
