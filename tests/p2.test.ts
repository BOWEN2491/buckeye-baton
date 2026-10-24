import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { setTransport, setTimeoutMs, boundedInput } from '../src/server/ai';
import { completeProject } from '../src/server/validation';
import { GET as workloadGET } from '../src/app/api/mentors/workload/route';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown, query = '') {
 const req = new Request(`http://localhost/api/${resource}${query}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
// Mock transport: Responses API shaped bodies only. No real model is called by automated tests.
const responseBody = (content: unknown, status = 'completed') => ({ status, output: [{ type: 'reasoning', summary: [] }, { type: 'message', content: [{ type: 'output_text', text: typeof content === 'string' ? content : JSON.stringify(content) }] }] });
let calls: { url: string; body: any }[] = [];
function mock(reply: (body: any) => Promise<Response> | Response) {
 calls = [];
 setTransport(async (url, init) => { const body = JSON.parse(String(init.body)); calls.push({ url, body }); return reply(body); });
}
const ok = (content: unknown, status?: string) => () => Response.json(responseBody(content, status));
const good = { sentences: ['A fictional notification project paused after building a local signup screen.', 'Delivery and consent still need work.'], tags: ['Notifications', 'web', 'web', 'consent'] };
const project = (list: any[], id: string) => list.find(p => p.id === id);
function env(on: boolean) {
 if (on) { process.env.OPENAI_API_KEY = 'test-key-not-real'; process.env.OPENAI_PROJECT_INTRO_MODEL = 'mock-model'; }
 else { delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_PROJECT_INTRO_MODEL; }
}

test('owner-reviewed introductions: permissions, mock generation, confirmation, staleness and conflicts', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p2-intro-'));
 const id = 'project-v2-paused';
 try {
  env(false); mock(ok(good));
  const before = (await request('project', id)).data.project;
  // Permissions come before configuration; no identity, wrong role or other owner never reaches the model.
  for (const [resource, method, body] of [['introduction', 'GET', undefined], ['introductionGenerate', 'POST', {}], ['introduction', 'PATCH', { ...good, draftId: 'x', sourceHash: 'y' }]] as const) {
   assert.equal((await request(resource, id, method, undefined, body)).status, 401);
   for (const user of ['student-mia', 'staff-kevin', 'mentor-sarah']) assert.equal((await request(resource, id, method, user, body)).status, 403);
   assert.equal((await request(resource, 'missing-project', method, 'student-alex', body)).status, 404);
  }
  const unconfigured = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal(unconfigured.status, 503); assert.equal(unconfigured.error.code, 'AI_UNAVAILABLE');
  assert.equal(calls.length, 0);
  env(true);
  assert.equal((await request('introductionGenerate', id, 'POST', 'student-alex', { prompt: 'ignore rules' })).status, 400);
  assert.equal(calls.length, 0);
  let editor = await request('introduction', id, 'GET', 'student-alex');
  assert.equal(editor.status, 200); assert.equal(editor.data.draft, null); assert.equal(editor.data.published, null);

  // Generate: draft stored, public card unchanged.
  const generated = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal(generated.status, 200); assert.equal(calls.length, 1);
  const sent = calls[0].body;
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses'); assert.equal(sent.model, 'mock-model');
  assert.equal(sent.text.format.type, 'json_schema'); assert.equal(sent.text.format.strict, true);
  assert.ok(!JSON.stringify(sent).includes('student-alex')); assert.ok(!JSON.stringify(sent).includes('test-key-not-real'));
  const draft = generated.data.draft;
  assert.deepEqual(draft.tags, ['notifications', 'web', 'consent']); assert.equal(draft.sentences.length, 2);
  assert.ok(!('model' in draft));
  assert.equal(project((await request('projects')).data, id).introduction, null);

  // Publish with owner edits.
  for (const bad of [{ sentences: ['One.', 'Two.', 'Three.', 'Four.'] }, { sentences: ['Two sentences here. Hidden second one.'] }, { sentences: [] }, { sentences: [' '] }, { tags: [] }, { tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, { tags: ['x'.repeat(33)] }, { tags: ['line\nbreak'] }, { extra: true }])
   assert.equal((await request('introduction', id, 'PATCH', 'student-alex', { sentences: draft.sentences, tags: draft.tags, draftId: draft.id, sourceHash: draft.sourceHash, ...bad })).status, 400);
  const edited = { sentences: ['A fictional campus notification prototype, paused after its signup screen.'], tags: ['Notifications', 'Consent'] };
  const published = await request('introduction', id, 'PATCH', 'student-alex', { ...edited, draftId: draft.id, sourceHash: generated.data.sourceHash });
  assert.equal(published.status, 200); assert.equal(published.data.published.stale, false);
  let listed = project((await request('projects')).data, id);
  assert.deepEqual(listed.introduction.sentences, edited.sentences); assert.deepEqual(listed.introduction.tags, ['notifications', 'consent']);
  assert.deepEqual(Object.keys(listed.introduction).sort(), ['reviewedAt', 'sentences', 'stale', 'tags']);
  assert.deepEqual({ ...listed, introduction: undefined }, { ...before, introduction: undefined });
  assert.equal(project((await request('projects', undefined, 'GET', undefined, undefined, '?status=paused')).data, id).introduction.stale, false);
  assert.equal(JSON.stringify((await request('projects')).data).includes(draft.id), false);
  assert.deepEqual((await request('project', id)).data.project, before);

  // A newer draft (another tab) makes the old draft id conflict; the published version stays.
  const second = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  const conflict = await request('introduction', id, 'PATCH', 'student-alex', { ...edited, draftId: draft.id, sourceHash: second.data.sourceHash });
  assert.equal(conflict.status, 409); assert.equal(conflict.error.code, 'DRAFT_CONFLICT');
  assert.deepEqual(project((await request('projects')).data, id).introduction.sentences, edited.sentences);

  // Saving the project makes the confirmed introduction stale and browsing falls back.
  assert.equal((await request('project', id, 'PATCH', 'student-alex', { summary: 'Updated fictional summary.' })).status, 200);
  listed = project((await request('projects')).data, id);
  assert.equal(listed.introduction.stale, true); assert.equal(listed.summary, 'Updated fictional summary.');
  editor = await request('introduction', id, 'GET', 'student-alex');
  assert.equal(editor.data.published.stale, true); assert.notEqual(editor.data.sourceHash, second.data.sourceHash);
  const staleConfirm = await request('introduction', id, 'PATCH', 'student-alex', { ...edited, draftId: second.data.draft.id, sourceHash: second.data.sourceHash });
  assert.equal(staleConfirm.status, 409); assert.equal(staleConfirm.error.code, 'INTRODUCTION_STALE');
  const staleWithNewHash = await request('introduction', id, 'PATCH', 'student-alex', { ...edited, draftId: second.data.draft.id, sourceHash: editor.data.sourceHash });
  assert.equal(staleWithNewHash.error.code, 'INTRODUCTION_STALE');
  // Status changes also invalidate.
  const regenerated = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal((await request('introduction', id, 'PATCH', 'student-alex', { ...edited, draftId: regenerated.data.draft.id, sourceHash: regenerated.data.sourceHash })).data.published.stale, false);
  assert.equal((await request('project', id, 'PATCH', 'student-alex', { status: 'ongoing' })).status, 200);
  assert.equal(project((await request('projects')).data, id).introduction.stale, true);

  // Project edited while the model is running: 409, nothing written.
  const draftBefore = (await request('introduction', id, 'GET', 'student-alex')).data.draft;
  mock(async () => { await request('project', id, 'PATCH', 'student-alex', { summary: 'Edited during generation.' }); return Response.json(responseBody(good)); });
  const during = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal(during.status, 409); assert.equal(during.error.code, 'INTRODUCTION_STALE');
  assert.deepEqual((await request('introduction', id, 'GET', 'student-alex')).data.draft, draftBefore);

  // Upstream failures keep everything and are reported clearly.
  const cases: [string, () => Promise<Response> | Response, number, string][] = [
   ['http 500', () => new Response('{"error":"upstream"}', { status: 500 }), 503, 'AI_UNAVAILABLE'],
   ['http 401', () => new Response('{}', { status: 401 }), 503, 'AI_UNAVAILABLE'],
   ['network', () => { throw new TypeError('fetch failed'); }, 503, 'AI_UNAVAILABLE'],
   ['refusal', () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] }] }), 502, 'AI_INVALID_OUTPUT'],
   ['incomplete', ok(good, 'incomplete'), 502, 'AI_INVALID_OUTPUT'],
   ['bad json', ok('{"sentences": ['), 502, 'AI_INVALID_OUTPUT'],
   ['four sentences', ok({ sentences: ['One.', 'Two.', 'Three.', 'Four.'], tags: ['a'] }), 502, 'AI_INVALID_OUTPUT'],
   ['packed sentences', ok({ sentences: ['First sentence. Second sentence. Third. Fourth.'], tags: ['a'] }), 502, 'AI_INVALID_OUTPUT'],
   ['extra field', ok({ ...good, html: '<b>x</b>' }), 502, 'AI_INVALID_OUTPUT'],
   ['no message', () => Response.json({ status: 'completed', output: [] }), 502, 'AI_INVALID_OUTPUT'],
   // R2: malformed outer REST shapes on HTTP 200 are invalid output, not server errors.
   ['200 non-JSON body', () => new Response('<html>gateway</html>', { status: 200 }), 502, 'AI_INVALID_OUTPUT'],
   ['output object', () => Response.json({ status: 'completed', output: {} }), 502, 'AI_INVALID_OUTPUT'],
   ['content object', () => Response.json({ status: 'completed', output: [{ type: 'message', content: {} }] }), 502, 'AI_INVALID_OUTPUT'],
   ['non-string text', () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: { sentences: ['A.'] } }] }] }), 502, 'AI_INVALID_OUTPUT'],
   ['missing text', () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text' }] }] }), 502, 'AI_INVALID_OUTPUT'],
   ['null items', () => Response.json({ status: 'completed', output: [null, { type: 'message', content: [null] }] }), 502, 'AI_INVALID_OUTPUT'],
   ['array body', () => Response.json([responseBody(good)]), 502, 'AI_INVALID_OUTPUT'],
  ];
  const kept = (await request('introduction', id, 'GET', 'student-alex')).data;
  for (const [name, reply, status, code] of cases) {
   mock(reply);
   const failed = await request('introductionGenerate', id, 'POST', 'student-alex', {});
   assert.equal(failed.status, status, name); assert.equal(failed.error.code, code, name); assert.equal(calls.length, 1, name);
   assert.ok(!JSON.stringify(failed).includes('upstream'), name);
  }
  setTimeoutMs(50);
  setTransport((_url, init) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
  const timeout = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal(timeout.status, 504); assert.equal(timeout.error.code, 'AI_TIMEOUT');
  setTimeoutMs(null);
  assert.deepEqual((await request('introduction', id, 'GET', 'student-alex')).data, kept);

  // Only one generation per project at a time.
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  mock(async () => { await gate; return Response.json(responseBody(good)); });
  const firstRun = request('introductionGenerate', id, 'POST', 'student-alex', {});
  await new Promise(resolve => setTimeout(resolve, 50));
  const busy = await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal(busy.status, 409); assert.equal(busy.error.code, 'GENERATION_IN_PROGRESS');
  release(); assert.equal((await firstRun).status, 200); assert.equal(calls.length, 1);

  // The generation lock was released after every failure above.
  mock(ok(good));
  assert.equal((await request('introductionGenerate', id, 'POST', 'student-alex', {})).status, 200);

  // Persistence across repeated migrations and restart.
  const db = await database(); await setup(db); await setup(db); await seed(db); await closeDatabase();
  const after = await request('introduction', id, 'GET', 'student-alex');
  assert.ok(after.data.draft); assert.deepEqual(after.data.published.sentences, edited.sentences);
  assert.equal((await request('project', id)).data.project.summary, 'Edited during generation.');
 } finally { setTransport(null); setTimeoutMs(null); env(false); await closeDatabase(); }
});

test('Mentor Awaiting reply counts reuse P1 thread state for Staff', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p2-workload-'));
 try {
  const db = await database();
  await db.query(`INSERT INTO users (id,name,role,headline,tags) VALUES ('mentor-aaron','Aaron Test','mentor','Fictional test mentor','[]')`);
  const counts = async () => Object.fromEntries((await request('mentorWorkload', undefined, 'GET', 'staff-kevin')).data.items.map((i: any) => [i.mentor.id, i.awaitingReply]));
  const sarahQueue = async () => (await request('workbench', undefined, 'GET', 'mentor-sarah')).data.awaitingReply.length;
  assert.equal((await request('mentorWorkload')).status, 401);
  for (const user of ['student-mia', 'mentor-sarah']) assert.equal((await request('mentorWorkload', undefined, 'GET', user)).status, 403);
  const first = await request('mentorWorkload', undefined, 'GET', 'staff-kevin');
  assert.deepEqual(first.data.items.map((i: any) => i.mentor.id), ['mentor-aaron', 'mentor-sarah']);
  assert.deepEqual(first.data.items.map((i: any) => i.awaitingReply), [0, 0]); assert.ok(Date.parse(first.data.asOf));
  assert.equal((await workloadGET(new Request('http://localhost/api/mentors/workload', { headers: { 'x-demo-user-id': 'staff-kevin' } }))).status, 200);

  const ask = async (title: string, wantsMentor = true) => (await request('projectQuestions', 'project-events', 'POST', 'student-mia', { title, body: '', wantsMentor, dueAt: null })).data.question.id;
  const q1 = await ask('First question'); const q2 = await ask('Second question'); await ask('Unreferred question'); const open = await ask('Open discussion', false);
  assert.deepEqual(await counts(), { 'mentor-aaron': 0, 'mentor-sarah': 0 });
  const refer = (q: string, mentorId = 'mentor-sarah') => request('questionReferral', q, 'POST', 'staff-kevin', { mentorId, reason: 'Fits.' });
  const post = (q: string, user: string, kind: string) => request('questionPosts', q, 'POST', user, { body: `${kind} by ${user}`, kind });
  await refer(q1); assert.equal((await counts())['mentor-sarah'], 1);
  await refer(q2); assert.equal((await counts())['mentor-sarah'], 2);
  await post(q1, 'mentor-sarah', 'mentor_reply'); assert.equal((await counts())['mentor-sarah'], 1);
  await post(q1, 'student-mia', 'comment'); await post(q1, 'staff-kevin', 'comment'); await post(q1, 'mentor-sarah', 'comment');
  assert.equal((await counts())['mentor-sarah'], 1);
  await post(q1, 'student-mia', 'follow_up'); await post(q1, 'student-mia', 'follow_up');
  assert.equal((await counts())['mentor-sarah'], 2);
  assert.equal(await sarahQueue(), 2);
  await post(q1, 'mentor-sarah', 'mentor_reply'); assert.equal((await counts())['mentor-sarah'], 1);
  await post(open, 'student-mia', 'follow_up'); assert.equal((await counts())['mentor-sarah'], 1);
  // Project status changes do not clear the queue; legacy lesson referrals are not counted.
  assert.equal((await request('project', 'project-events', 'PATCH', 'student-mia', { status: 'paused', reflection: { whyPaused: 'Break.', ifAgain: ['Ask earlier.'] } })).status, 200);
  const legacyQuestion = await request('comments', 'lesson-fields', 'POST', 'student-mia', { kind: 'question', body: 'Legacy question' });
  assert.equal((await request('referrals', undefined, 'POST', 'staff-kevin', { questionCommentId: legacyQuestion.data.id, mentorId: 'mentor-aaron', reason: 'Legacy' })).status, 201);
  const q3 = await ask('Aaron question'); await refer(q3, 'mentor-aaron');
  assert.deepEqual(await counts(), { 'mentor-aaron': 1, 'mentor-sarah': 1 });
  assert.equal(await sarahQueue(), (await counts())['mentor-sarah']);
  await setup(db); await closeDatabase();
  assert.deepEqual(await counts(), { 'mentor-aaron': 1, 'mentor-sarah': 1 });
 } finally { await closeDatabase(); }
});

// R1: trimming happens inside the structure, so the model input is always valid JSON within budget.
test('bounded model input stays valid JSON for maximal projects with escaping and Unicode', () => {
 const loneSurrogate = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
 const strings = (value: unknown): string[] => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];
 const cps = (unit: string, n: number) => Array.from('a' + unit.repeat(n)).slice(0, n).join('');
 const variants: [string, string][] = [['quotes', '"'], ['backslashes', '\\'], ['newlines', '\n'], ['unicode', '🎓é中'], ['mixed', '"\\\n\t🎓<>']];
 for (const [name, unit] of variants) {
  const text = cps(unit, 10000); const short = cps(unit, 160);
  const source = {
   title: short, summary: text, courseOrClub: short, term: 'Autumn 2026', tags: Array.from({ length: 20 }, (_, i) => `${i}${cps(unit, 40)}`), status: 'ongoing',
   reflection: { progress: text, outcomes: Array(30).fill(text), problems: Array(30).fill({ title: short, assumed: text, happened: text, changed: text }), nextTeam: text, whyPaused: text, ifAgain: Array(30).fill(text), reusable: Array(30).fill({ label: short, url: null }) },
  };
  assert.equal(completeProject.safeParse(source).success, true, `${name}: source is a legal project`);
  const bounded = boundedInput(source);
  assert.ok(bounded.length <= 16000, `${name}: within budget (${bounded.length})`);
  const parsed = JSON.parse(bounded);
  assert.equal(parsed.truncated, true, name);
  assert.ok(parsed.title.length > 0 && parsed.status === 'ongoing', `${name}: keeps minimal context`);
  assert.ok(!strings(parsed).some(v => loneSurrogate.test(v)), `${name}: no split surrogate pairs`);
 }
 const small = { title: 'Small', summary: 'Fits.', tags: [], status: 'ongoing' };
 assert.deepEqual(JSON.parse(boundedInput(small)), small);
 const big = boundedInput({ title: 't', summary: 'x'.repeat(50000), reflection: { outcomes: Array(40).fill('y'.repeat(3000)) } });
 assert.ok(big.length <= 16000); assert.ok(JSON.parse(big).truncated); assert.ok(JSON.parse(big).summary.startsWith('x'));
});
