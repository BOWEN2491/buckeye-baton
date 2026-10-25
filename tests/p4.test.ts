import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { setInvitationClock, dispatchInvitations } from '../src/server/invitations';
import { runInvitationCheck, startInvitationRunner, stopInvitationRunner } from '../src/server/invitation-runner';
import { register } from '../src/instrumentation';
import { GET as inboxGET } from '../src/app/api/inbox/route';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown, query = '') {
 const req = new Request(`http://localhost/api/${resource}${query}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
const inbox = async (user: string, query = '?limit=50') => (await request('inbox', undefined, 'GET', user, undefined, query)).data;
const activity = async (user: string) => (await inbox(user)).items.filter((i: any) => i.kind === 'activity');
const invitations = async (user: string) => (await inbox(user, '?filter=invitations&limit=50')).items;
type Db = Awaited<ReturnType<typeof database>>;
const H = 3_600_000, D = 24 * H;
const A = Date.parse('2027-03-01T12:00:00.000Z');
const at = (offset: number) => new Date(A + offset).toISOString();
const lone = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
async function fresh(name: string) { process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), `buckeye-baton-p4-${name}-`)); return database(); }
async function project(db: Db, id: string, owner: string, status: string, tags: string[], createdOffset: number, reflection: Record<string, unknown> | null = null) {
 const r = { progress: '', outcomes: [], problems: [], nextTeam: '', whyPaused: status === 'paused' ? 'Fictional pause.' : '', ifAgain: status === 'paused' ? ['Start smaller.'] : [], reusable: [], ...(reflection ?? {}) };
 await db.query('INSERT INTO projects (id,"ownerId",title,summary,"courseOrClub",term,tags,status,reflection,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)', [id, owner, `Project ${id}`, 'Fictional P4 test project.', 'OSU', 'Spring 2027', JSON.stringify(tags), status, JSON.stringify(r), at(createdOffset)]);
}
async function question(db: Db, id: string, projectId: string, author: string, createdOffset: number) {
 await db.query('INSERT INTO project_questions (id,"projectId","authorId",title,body,"wantsMentor","dueAt","createdAt") VALUES ($1,$2,$3,$4,$5,true,NULL,$6)', [id, projectId, author, `Question ${id}`, 'Fictional.', at(createdOffset)]);
}

test('P4 Activity: recipient matrix, de-duplication, self-exclusion, atomic rollback, removed previews, privacy and pagination', async () => {
 const db = await fresh('activity');
 try {
  const ask = async (user: string, projectId: string, title: string) => (await request('projectQuestions', projectId, 'POST', user, { title, body: 'Fictional details.', wantsMentor: true, dueAt: null })).data.question.id;
  const post = async (user: string, qid: string, kind: string, body: string) => request('questionPosts', qid, 'POST', user, { body, kind });
  const counts = async () => Object.fromEntries(await Promise.all(['student-alex', 'student-mia', 'mentor-sarah', 'staff-kevin'].map(async u => [u, (await activity(u)).length])));
  // Mia asks on Alex's project → Alex only.
  const q = await ask('student-mia', 'project-signup', 'How should we confirm shifts?');
  let a = await activity('student-alex');
  assert.equal(a.length, 1); assert.equal(a[0].event, 'question_created'); assert.deepEqual(a[0].reasons, ['project_owner']); assert.equal(a[0].actor.id, 'student-mia');
  assert.equal(a[0].href, `/projects/project-signup#q-${q}`); assert.equal(a[0].questionTitle, 'How should we confirm shifts?');
  assert.deepEqual(await counts(), { 'student-alex': 1, 'student-mia': 0, 'mentor-sarah': 0, 'staff-kevin': 0 });
  // Referral → Mia (author) and Sarah (assigned mentor); preview is the reason.
  assert.equal((await request('questionReferral', q, 'POST', 'staff-kevin', { mentorId: 'mentor-sarah', reason: 'Sarah has built confirmation flows.' })).status, 201);
  assert.deepEqual((await activity('student-mia'))[0].reasons, ['question_author']);
  assert.equal((await activity('student-mia'))[0].preview, 'Sarah has built confirmation flows.');
  assert.deepEqual((await activity('mentor-sarah'))[0].reasons, ['assigned_mentor']);
  assert.deepEqual(await counts(), { 'student-alex': 1, 'student-mia': 1, 'mentor-sarah': 1, 'staff-kevin': 0 });
  // Rejected writes add nothing.
  assert.equal((await request('questionReferral', q, 'POST', 'staff-kevin', { mentorId: 'mentor-sarah', reason: 'Again.' })).status, 409);
  assert.equal((await post('student-alex', q, 'follow_up', 'Not my question.')).status, 403);
  assert.equal((await post('student-mia', q, 'mentor_reply', 'Fake reply.')).status, 403);
  assert.deepEqual(await counts(), { 'student-alex': 1, 'student-mia': 1, 'mentor-sarah': 1, 'staff-kevin': 0 });
  // Mentor reply → owner, author, referring staff.
  const reply = await post('mentor-sarah', q, 'mentor_reply', 'Start with in-app confirmation.');
  assert.equal(reply.status, 201);
  const replyId = reply.data.posts.at(-1).id;
  assert.deepEqual(await counts(), { 'student-alex': 2, 'student-mia': 2, 'mentor-sarah': 1, 'staff-kevin': 1 });
  assert.deepEqual((await activity('staff-kevin'))[0].reasons, ['referring_staff']);
  assert.equal((await activity('staff-kevin'))[0].postKind, 'mentor_reply');
  // Thanks comment → owner only (author is the actor; Sarah is not notified of comments).
  await post('student-mia', q, 'comment', 'Thanks!');
  assert.deepEqual(await counts(), { 'student-alex': 3, 'student-mia': 2, 'mentor-sarah': 1, 'staff-kevin': 1 });
  // Follow-up → owner and assigned mentor.
  await post('student-mia', q, 'follow_up', 'What should we test first?');
  assert.deepEqual(await counts(), { 'student-alex': 4, 'student-mia': 2, 'mentor-sarah': 2, 'staff-kevin': 1 });
  assert.deepEqual((await activity('mentor-sarah'))[0].reasons, ['assigned_mentor']); assert.equal((await activity('mentor-sarah'))[0].postKind, 'follow_up');
  await post('mentor-sarah', q, 'mentor_reply', 'Test with five students.');
  assert.deepEqual(await counts(), { 'student-alex': 5, 'student-mia': 3, 'mentor-sarah': 2, 'staff-kevin': 2 });
  // Owner who is also the asker gets one item with both reasons; self-actions never notify.
  const own = await ask('student-alex', 'project-signup', 'Alex asks on his own project');
  assert.equal((await activity('student-alex')).length, 5);
  await post('student-mia', own, 'comment', 'A comment from Mia.');
  const merged = (await activity('student-alex'))[0];
  assert.deepEqual(merged.reasons.sort(), ['project_owner', 'question_author']);
  assert.equal((await activity('student-alex')).length, 6);

  // Preview: 160 code points, no split surrogate, plain text.
  const long = '🎓'.repeat(200);
  await post('student-mia', q, 'comment', long);
  const preview = (await activity('student-alex'))[0].preview;
  assert.ok(Array.from(preview).length <= 160); assert.ok(!lone.test(preview)); assert.ok(preview.endsWith('…'));
  // Deleted post: event kept, text gone everywhere.
  assert.equal((await request('projectPost', replyId, 'DELETE', 'student-alex')).status, 200);
  for (const user of ['student-mia', 'staff-kevin', 'student-alex']) {
   const item = (await activity(user)).find((i: any) => i.preview === null && i.removed);
   assert.ok(item, user);
   assert.ok(!JSON.stringify(await inbox(user)).includes('Start with in-app confirmation.'), user);
  }

  // Atomicity: a failing notification insert rolls back the business write too.
  const postsBefore = (await db.query('SELECT count(*)::int AS n FROM project_posts')).rows[0];
  await db.query('ALTER TABLE inbox_items ADD CONSTRAINT p4_test_block CHECK (false) NOT VALID');
  assert.equal((await post('student-mia', q, 'comment', 'Must not persist.')).status, 500);
  assert.equal((await request('projectQuestions', 'project-signup', 'POST', 'student-mia', { title: 'Must not persist either', body: '', wantsMentor: true, dueAt: null })).status, 500);
  await db.query('ALTER TABLE inbox_items DROP CONSTRAINT p4_test_block');
  assert.deepEqual((await db.query('SELECT count(*)::int AS n FROM project_posts')).rows[0], postsBefore);
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM project_questions WHERE title='Must not persist either'`)).rows[0].n, 0);

  // Privacy and input validation.
  const alexItem = (await activity('student-alex'))[0];
  assert.equal((await request('inbox')).status, 401);
  assert.equal((await request('inboxItem', alexItem.id, 'PATCH', 'student-mia', { read: true })).status, 404);
  assert.equal((await request('inbox', undefined, 'GET', 'student-mia', undefined, `?cursor=${alexItem.id}`)).status, 400);
  for (const query of ['?filter=archived', '?limit=0', '?limit=51', '?limit=abc', '?cursor=missing']) assert.equal((await request('inbox', undefined, 'GET', 'student-alex', undefined, query)).status, 400, query);
  for (const body of [{ read: false }, { read: true, recipientId: 'student-mia' }, {}]) assert.equal((await request('inboxItem', alexItem.id, 'PATCH', 'student-alex', body)).status, 400);
  // GET never writes; reading is explicit and idempotent.
  const snapshot = async () => (await db.query('SELECT * FROM inbox_items ORDER BY id')).rows;
  const before = await snapshot();
  await inbox('student-alex'); await inbox('student-alex', '?filter=unread'); await inboxGET(new Request('http://localhost/api/inbox', { headers: { 'x-demo-user-id': 'student-alex' } }));
  assert.deepEqual(await snapshot(), before);
  const unread = (await inbox('student-alex')).unreadCount;
  const read = await request('inboxItem', alexItem.id, 'PATCH', 'student-alex', { read: true });
  assert.equal(read.status, 200); assert.ok(read.data.readAt);
  assert.equal((await request('inboxItem', alexItem.id, 'PATCH', 'student-alex', { read: true })).data.readAt, read.data.readAt);
  assert.equal((await inbox('student-alex')).unreadCount, unread - 1);
  assert.ok(!(await inbox('student-alex', '?filter=unread&limit=50')).items.some((i: any) => i.id === alexItem.id));
  // Activity is not affected by turning automatic invitations off.
  assert.equal((await request('inboxPreferences', undefined, 'GET', 'student-alex')).data.automaticInvitations, true);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM inbox_preferences')).rows[0].n, 0);
  assert.equal((await request('inboxPreferences', undefined, 'PATCH', 'student-alex', { automaticInvitations: false })).data.automaticInvitations, false);
  assert.equal((await request('inboxPreferences', undefined, 'PATCH', 'student-alex', { automaticInvitations: 'no' })).status, 400);
  const n = (await activity('student-alex')).length;
  await ask('student-mia', 'project-signup', 'Still notifies the owner');
  assert.equal((await activity('student-alex')).length, n + 1);

  // Same-microsecond pagination: no gaps, no duplicates.
  for (const id of ['pg-e', 'pg-a', 'pg-c', 'pg-b', 'pg-d'])
   await db.query(`INSERT INTO inbox_items (id,"recipientId",kind,"eventKey",event,"actorId","projectId","questionId","createdAt") VALUES ($1,'mentor-sarah','activity',$2,'question_created','student-mia','project-signup',$3,'2030-01-01T00:00:00.123456Z')`, [id, `question:test-${id}`, q]);
  const seen: string[] = []; let cursor = '';
  for (let i = 0; i < 10; i++) {
   const page = (await request('inbox', undefined, 'GET', 'mentor-sarah', undefined, `?limit=2${cursor ? `&cursor=${cursor}` : ''}`)).data;
   seen.push(...page.items.map((x: any) => x.id));
   if (!page.nextCursor) break; cursor = page.nextCursor;
  }
  assert.deepEqual(seen.slice(0, 5), ['pg-e', 'pg-d', 'pg-c', 'pg-b', 'pg-a']);
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(seen.length, 5 + 2);

  // Migrations rerun and restart keep messages without backfilling.
  const total = (await db.query('SELECT count(*)::int AS n FROM inbox_items')).rows[0].n;
  await setup(db); await setup(db); await seed(db); await closeDatabase();
  assert.equal((await (await database()).query('SELECT count(*)::int AS n FROM inbox_items')).rows[0].n, total);
  assert.equal((await activity('student-mia')).length, 3);
 } finally { await closeDatabase(); }
});

test('P4 invitations: eligibility boundaries, evidence matching, limits, permanent de-duplication, responses and settlement', async () => {
 const db = await fresh('invite');
 let now = A;
 setInvitationClock(() => new Date(now));
 try {
  // On the fixed clock the seeded demo projects are months old; clearing their tags keeps them from matching here.
  await db.query(`UPDATE projects SET tags='[]'::jsonb`);
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('student-zoe','Zoe Test','student','Fictional test student','[]')`);
  // Evidence: Zoe and Mia have finished projects with real content; an empty finished project is not evidence.
  await project(db, 'zoe-done', 'student-zoe', 'finished', ['MAPS', 'web'], -90 * D, { outcomes: ['A fictional map.'], nextTeam: 'Check the data.' });
  await project(db, 'mia-done', 'student-mia', 'finished', ['maps'], -90 * D, { progress: 'A fictional prototype exists.' });
  await project(db, 'mia-empty', 'student-mia', 'finished', ['web', 'transit'], -90 * D);
  // Sarah's mentor evidence: a formal reply on someone else's 'transit' project.
  await project(db, 'transit-history', 'student-zoe', 'finished', ['transit'], -80 * D, { outcomes: ['Fictional.'] });
  await question(db, 'transit-q', 'transit-history', 'student-zoe', -70 * D);
  await db.query(`INSERT INTO project_referrals (id,"questionId","staffId","mentorId",reason,"createdAt") VALUES ('ref-transit','transit-q','staff-kevin','mentor-sarah','Fits.',$1)`, [at(-69 * D)]);
  await db.query(`INSERT INTO project_posts (id,"questionId","authorId",body,kind,"createdAt") VALUES ('transit-reply','transit-q','mentor-sarah','Fictional reply.','mentor_reply',$1)`, [at(-68 * D)]);
  // Targets: one paused exactly 14 days old, one a second short.
  await project(db, 'old-paused', 'student-alex', 'paused', [' Maps ', 'web', 'WEB'], -14 * D);
  await project(db, 'young-paused', 'student-alex', 'paused', ['maps'], -14 * D + 1000);

  let run = await dispatchInvitations(db);
  assert.equal(run.created, 1);
  let zoe = await invitations('student-zoe');
  assert.equal(zoe.length, 1);
  assert.equal(zoe[0].invitationKind, 'pickup'); assert.equal(zoe[0].projectId, 'old-paused'); assert.equal(zoe[0].status, 'pending'); assert.equal(zoe[0].actionable, true);
  assert.deepEqual(zoe[0].matchedTags, ['maps', 'web']);
  assert.equal(zoe[0].reason, 'You shared a finished project about maps, web. This project uses maps, web too.');
  assert.deepEqual(zoe[0].evidence.map((e: any) => [e.projectId, e.kind]), [['zoe-done', 'shared_experience']]);
  assert.equal(zoe[0].expiresAt, at(7 * D));
  assert.ok(!/solved|expert|probab|likely/i.test(JSON.stringify(zoe)));
  assert.deepEqual(await invitations('student-mia'), []); // per-target 24h limit
  assert.deepEqual(await invitations('student-alex'), []); // owner excluded
  assert.ok(!(await db.query(`SELECT 1 FROM inbox_items WHERE "eventKey"='invite:pickup:young-paused'`)).rows.length); // 1 s short of 14 days
  assert.equal((await inbox('student-zoe')).unreadCount, 1);
  await db.query(`DELETE FROM projects WHERE id='young-paused'`);
  // Per-target 24 h sliding window, then the next best candidate; permanent per person + target.
  now = A + D - 1000; assert.equal((await dispatchInvitations(db)).created, 0);
  now = A + D; assert.equal((await dispatchInvitations(db)).created, 1);
  assert.equal((await invitations('student-mia'))[0].projectId, 'old-paused');
  now = A + 2 * D; assert.equal((await dispatchInvitations(db)).created, 0); // both candidates already invited to this target
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM inbox_items WHERE "eventKey"='invite:pickup:old-paused'`)).rows[0].n, 2);

  // Responses.
  const zoeInvite = zoe[0].id;
  assert.equal((await request('invitationRespond', zoeInvite, 'POST', 'student-mia', { action: 'accept' })).status, 404);
  assert.equal((await request('invitationRespond', zoeInvite, 'POST', 'student-zoe', { action: 'maybe' })).status, 400);
  const accepted = await request('invitationRespond', zoeInvite, 'POST', 'student-zoe', { action: 'accept' });
  assert.equal(accepted.status, 200); assert.equal(accepted.data.status, 'accepted'); assert.ok(accepted.data.readAt); assert.equal(accepted.data.actionable, true);
  assert.equal((await request('invitationRespond', zoeInvite, 'POST', 'student-zoe', { action: 'accept' })).data.status, 'accepted');
  const conflict = await request('invitationRespond', zoeInvite, 'POST', 'student-zoe', { action: 'ignore' });
  assert.equal(conflict.status, 409); assert.equal(conflict.error.code, 'INVITATION_UNAVAILABLE');
  // Accepting is only intent: no project, relation or referral is created.
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM project_relations`)).rows[0].n, 0);
  // Mia ignores; a real pickup later makes the accepted invitation non-actionable without rewriting the choice.
  const miaInvite = (await invitations('student-mia'))[0].id;
  assert.equal((await request('invitationRespond', miaInvite, 'POST', 'student-mia', { action: 'ignore' })).data.status, 'ignored');
  assert.equal((await request('pickups', 'old-paused', 'POST', 'student-zoe', { requestId: '00000000-0000-4000-8000-000000000001', pickupType: 'continue', title: 'Zoe continues', goal: 'Fictional goal.' })).status, 201);
  zoe = await invitations('student-zoe');
  assert.equal(zoe[0].status, 'accepted'); assert.equal(zoe[0].actionable, false);
  assert.equal((await invitations('student-mia'))[0].status, 'ignored');

  // Help target: waiting exactly 3 days; Sarah matches via her real formal reply; assigned mentor excluded later.
  await project(db, 'transit-now', 'student-alex', 'ongoing', ['transit'], -30 * D);
  now = A + 10 * D;
  await question(db, 'help-q', 'transit-now', 'student-alex', 10 * D - 3 * D);
  await question(db, 'help-young', 'transit-now', 'student-alex', 10 * D - 3 * D + 1000);
  run = await dispatchInvitations(db);
  const sarah = await invitations('mentor-sarah');
  assert.equal(sarah.length, 1); assert.equal(sarah[0].questionId, 'help-q'); assert.equal(sarah[0].invitationKind, 'help');
  assert.equal(sarah[0].reason, 'You previously replied as a mentor on a transit project.');
  assert.deepEqual(sarah[0].evidence.map((e: any) => e.projectId), ['transit-history']);
  assert.equal(sarah[0].href, '/projects/transit-now#q-help-q');
  // Mia's empty finished 'transit' project is not evidence, so the young question (once eligible) gets nobody but Zoe.
  assert.ok(!(await invitations('student-mia')).some((i: any) => i.questionId === 'help-q'));
  // Interested helpers: Staff only, after acceptance, for the current round only.
  assert.deepEqual((await request('interestedHelpers', 'help-q', 'GET', 'staff-kevin')).data, []);
  assert.equal((await request('invitationRespond', sarah[0].id, 'POST', 'mentor-sarah', { action: 'accept' })).status, 200);
  const helpers = (await request('interestedHelpers', 'help-q', 'GET', 'staff-kevin')).data;
  assert.deepEqual(helpers.map((h: any) => [h.user.id, h.matchedTags]), [['mentor-sarah', ['transit']]]);
  for (const user of ['student-mia', 'mentor-sarah', 'student-alex']) assert.equal((await request('interestedHelpers', 'help-q', 'GET', user)).status, 403);
  assert.equal((await request('interestedHelpers', 'missing', 'GET', 'staff-kevin')).status, 404);
  // Accepting does not change the queue, workload or referral; Staff still refers manually.
  const sw = (await request('workbench', undefined, 'GET', 'staff-kevin')).data;
  assert.ok(sw.needsReferral.some((t: any) => t.question.id === 'help-q'));
  assert.equal((await request('mentorWorkload', undefined, 'GET', 'staff-kevin')).data.items.find((i: any) => i.mentor.id === 'mentor-sarah').awaitingReply, 0);
  assert.equal((await request('questionPosts', 'help-q', 'POST', 'mentor-sarah', { body: 'Formal?', kind: 'mentor_reply' })).status, 403);
  assert.equal((await request('questionReferral', 'help-q', 'POST', 'staff-kevin', { mentorId: 'mentor-sarah', reason: 'She accepted and fits.' })).status, 201);
  // A formal reply ends the round: helpers list empties; new follow-up starts a new round without re-inviting Sarah.
  assert.equal((await request('questionPosts', 'help-q', 'POST', 'mentor-sarah', { body: 'Fictional answer.', kind: 'mentor_reply' })).status, 201);
  assert.deepEqual((await request('interestedHelpers', 'help-q', 'GET', 'staff-kevin')).data, []);
  assert.equal((await invitations('mentor-sarah'))[0].actionable, false);

  // Expiry: computed on read without writing; a response persists it and returns 409.
  now = A + 11 * D;
  await project(db, 'expiring', 'student-alex', 'paused', ['maps'], 11 * D - 20 * D);
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('student-lee','Lee Test','student','Fictional test student','[]')`);
  await project(db, 'lee-done', 'student-lee', 'finished', ['maps'], -90 * D, { outcomes: ['Fictional.'] });
  await dispatchInvitations(db);
  const lee = (await invitations('student-lee')).find((i: any) => i.projectId === 'expiring');
  assert.ok(lee);
  now = A + 18 * D;
  assert.equal((await invitations('student-lee')).find((i: any) => i.id === lee.id).status, 'expired');
  assert.equal((await db.query('SELECT status FROM inbox_items WHERE id=$1', [lee.id])).rows[0].status, 'pending');
  assert.equal((await request('invitationRespond', lee.id, 'POST', 'student-lee', { action: 'accept' })).status, 409);
  assert.equal((await db.query('SELECT status FROM inbox_items WHERE id=$1', [lee.id])).rows[0].status, 'expired');

  // Turning invitations off cancels pending ones and stops new ones; turning on does not resend.
  await project(db, 'pref-target', 'student-alex', 'paused', ['maps'], 18 * D - 40 * D); // older than 'expiring', so it ranks first
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('student-kai','Kai Test','student','Fictional test student','[]')`);
  await project(db, 'kai-done', 'student-kai', 'finished', ['maps'], -90 * D, { outcomes: ['Fictional.'] });
  await dispatchInvitations(db);
  const kai = (await invitations('student-kai'))[0];
  assert.equal(kai.projectId, 'pref-target');
  await request('inboxPreferences', undefined, 'PATCH', 'student-kai', { automaticInvitations: false });
  assert.equal((await invitations('student-kai'))[0].status, 'cancelled');
  assert.equal((await db.query('SELECT status FROM inbox_items WHERE id=$1', [kai.id])).rows[0].status, 'cancelled');
  assert.equal((await inbox('student-kai')).unreadCount, 0);
  await request('inboxPreferences', undefined, 'PATCH', 'student-kai', { automaticInvitations: true });
  now = A + 30 * D; await dispatchInvitations(db);
  assert.equal((await invitations('student-kai')).filter((i: any) => i.projectId === 'pref-target').length, 1);

  // Runner status (Staff only) and failure recovery with rollback.
  const status = await request('invitationStatus', undefined, 'GET', 'staff-kevin');
  assert.equal(status.data.lastCompletedAt, at(30 * D)); assert.equal(status.data.intervalSeconds, 60); assert.equal(status.data.error, null);
  assert.equal((await request('invitationStatus', undefined, 'GET', 'student-mia')).status, 403);
  await project(db, 'fail-target', 'student-alex', 'paused', ['maps'], 30 * D - 15 * D);
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('student-fay','Fay Test','student','Fictional test student','[]')`);
  await project(db, 'fay-done', 'student-fay', 'finished', ['maps'], -90 * D, { outcomes: ['Fictional.'] });
  const invitesBefore = (await db.query(`SELECT count(*)::int AS n FROM inbox_items WHERE kind='invitation'`)).rows[0].n;
  now = A + 31 * D;
  await db.query('ALTER TABLE inbox_items ADD CONSTRAINT p4_test_block CHECK (false) NOT VALID');
  await runInvitationCheck();
  let failed = (await request('invitationStatus', undefined, 'GET', 'staff-kevin')).data;
  assert.equal(failed.error, 'DISPATCH_FAILED'); assert.equal(failed.lastFailureAt, at(31 * D)); assert.equal(failed.lastCompletedAt, at(30 * D));
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM inbox_items WHERE kind='invitation'`)).rows[0].n, invitesBefore);
  await db.query('ALTER TABLE inbox_items DROP CONSTRAINT p4_test_block');
  now = A + 31 * D + 60_000;
  await runInvitationCheck();
  failed = (await request('invitationStatus', undefined, 'GET', 'staff-kevin')).data;
  assert.equal(failed.error, null); assert.equal(failed.lastCompletedAt, at(31 * D + 60_000));
  assert.equal((await invitations('student-fay')).length, 1); // the recovered check sent the invitation the failed one could not

  // Restart and repeated migrations never duplicate invitations.
  const all = (await db.query(`SELECT id FROM inbox_items WHERE kind='invitation' ORDER BY id`)).rows;
  await setup(db); await closeDatabase();
  await dispatchInvitations(await database());
  assert.deepEqual((await (await database()).query(`SELECT id FROM inbox_items WHERE kind='invitation' ORDER BY id`)).rows, all);
 } finally { setInvitationClock(null); await closeDatabase(); }
});

test('P4 recipient limits: 1 per 24 hours and 3 per 7 days, sliding; no candidates means no rows', async () => {
 const db = await fresh('limits');
 let now = A;
 setInvitationClock(() => new Date(now));
 try {
  await project(db, 'mia-done', 'student-mia', 'finished', ['maps'], -90 * D, { outcomes: ['Fictional.'] });
  for (const id of ['t1', 't2', 't3', 't4', 't5']) await project(db, id, 'student-alex', 'paused', ['maps'], -20 * D);
  await project(db, 'no-match', 'student-alex', 'paused', ['quantum'], -40 * D);
  await project(db, 'no-tags', 'student-alex', 'paused', [], -40 * D);
  const miaCount = async () => (await invitations('student-mia')).length;
  for (const [offset, expected] of [[0, 1], [D - 1000, 1], [D, 2], [2 * D, 3], [3 * D, 3], [6 * D, 3], [7 * D, 4]] as [number, number][]) {
   now = A + offset; await dispatchInvitations(db);
   assert.equal(await miaCount(), expected, `offset ${offset / D}d`);
  }
  assert.equal((await db.query(`SELECT count(*)::int AS n FROM inbox_items WHERE "eventKey" IN ('invite:pickup:no-match','invite:pickup:no-tags')`)).rows[0].n, 0);
  // Highest P3 score first: all t* tie at 10 points by age, so order is by exact createdAt then id.
  const order = (await invitations('student-mia')).map((i: any) => i.projectId).reverse();
  assert.deepEqual(order, ['t1', 't2', 't3', 't4']);
 } finally { setInvitationClock(null); await closeDatabase(); }
});

test('P4 runner: explicit enable, Node-only, never during build, no overlap, stop, and dispatch race with replies', async () => {
 const db = await fresh('runner');
 const env = { ...process.env };
 try {
  // register() guards.
  for (const [vars, started] of [[{ NEXT_RUNTIME: 'edge', INVITATION_RUNNER_ENABLED: '1' }, false], [{ NEXT_RUNTIME: 'nodejs' }, false], [{ NEXT_RUNTIME: 'nodejs', INVITATION_RUNNER_ENABLED: '1', NEXT_PHASE: 'phase-production-build' }, false], [{ NEXT_RUNTIME: 'nodejs', INVITATION_RUNNER_ENABLED: '1' }, true]] as [Record<string, string>, boolean][]) {
   delete process.env.NEXT_RUNTIME; delete process.env.INVITATION_RUNNER_ENABLED; delete process.env.NEXT_PHASE;
   Object.assign(process.env, vars);
   await register();
   assert.equal(!!(globalThis as any).buckeyeInvitationRunner?.started, started, JSON.stringify(vars));
   stopInvitationRunner();
  }
  assert.equal((await request('invitationStatus', undefined, 'GET', 'staff-kevin')).data.enabled, false);
  // Loop: next check only after the previous one finishes.
  let active = 0, maxActive = 0, runs = 0;
  const check = async () => { active++; maxActive = Math.max(maxActive, active); runs++; await new Promise(r => setTimeout(r, 30)); active--; };
  const state = startInvitationRunner(10, check);
  assert.equal(startInvitationRunner(10, check), state);
  assert.equal((await request('invitationStatus', undefined, 'GET', 'staff-kevin')).data.enabled, true);
  await new Promise(r => setTimeout(r, 200));
  stopInvitationRunner();
  const stoppedAt = runs;
  await new Promise(r => setTimeout(r, 100));
  assert.ok(stoppedAt >= 3); assert.equal(maxActive, 1); assert.ok(runs <= stoppedAt + 1);

  // Race semantics on the same locked path: a reply committed first prevents a stale invitation;
  // a dispatch committed first is cancelled by the reply.
  let now = A;
  setInvitationClock(() => new Date(now));
  await project(db, 'race-history', 'student-mia', 'finished', ['race'], -90 * D, { outcomes: ['Fictional.'] });
  await project(db, 'race-target', 'student-alex', 'ongoing', ['race'], -30 * D);
  await question(db, 'race-q', 'race-target', 'student-alex', -5 * D);
  await db.query(`INSERT INTO project_referrals (id,"questionId","staffId","mentorId",reason,"createdAt") VALUES ('ref-race','race-q','staff-kevin','mentor-sarah','Fits.',$1)`, [at(-4 * D)]);
  const [, reply] = await Promise.all([dispatchInvitations(db), request('questionPosts', 'race-q', 'POST', 'mentor-sarah', { body: 'Answer.', kind: 'mentor_reply' })]);
  assert.equal(reply.status, 201);
  const pendingForRound = (await db.query(`SELECT count(*)::int AS n FROM inbox_items WHERE "eventKey"='invite:help:race-q' AND status='pending'`)).rows[0].n;
  assert.equal(pendingForRound, 0);
  assert.ok((await invitations('student-mia')).every((i: any) => i.questionId !== 'race-q' || i.status === 'cancelled'));
  // Single-connection PGlite serializes these transactions: this proves ordering logic and constraints, not multi-connection pg.
 } finally {
  stopInvitationRunner(); setInvitationClock(null);
  for (const key of ['NEXT_RUNTIME', 'INVITATION_RUNNER_ENABLED', 'NEXT_PHASE']) { if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key]; }
  await closeDatabase();
 }
});
