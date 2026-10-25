import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database, setup } from '../src/server/db';
import { seed } from '../src/server/seed';
import { setTransport, setTimeoutMs, boundedInput } from '../src/server/ai';
import { runAnalysisStep } from '../src/server/ai-jobs';
import { setGitHubTransport } from '../src/server/github';
import { completeProject } from '../src/server/validation';
import { GET as workloadGET } from '../src/app/api/mentors/workload/route';
import { githubResponse, validIntroduction, modelResponse } from './p5-helpers';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown, query = '') {
 const req = new Request(`http://localhost/api/${resource}${query}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
const listProject = async (id: string) => (await request('projects')).data.find((p: any) => p.id === id);

test('P5 owner-reviewed introductions: durable queue, permissions, confirmation, staleness, malformed responses and persistence', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p5-intro-'));
 process.env.GITHUB_API_BASE_URL = 'http://127.0.0.1:1'; process.env.OPENAI_API_KEY = 'test-key-not-real'; process.env.OPENAI_PROJECT_INTRO_MODEL = 'mock-model';
 const id = 'project-v2-paused'; let calls = 0;
 setGitHubTransport(async url => githubResponse(String(url)));
 setTransport(async () => { calls++; return modelResponse(validIntroduction); });
 const editor = () => request('introduction', id, 'GET', 'student-alex');
 const enqueue = () => request('introductionGenerate', id, 'POST', 'student-alex', {});
 const finish = async () => { await runAnalysisStep(await database()); return (await editor()).data; };
 const confirm = (d: any, extra = {}) => request('introduction', id, 'PATCH', 'student-alex', { draftId: d.id, sourceHash: d.sourceHash, sentences: d.sentences, ...extra });
 try {
  for (const [resource, method, body] of [['introduction', 'GET', undefined], ['introductionGenerate', 'POST', {}], ['introduction', 'PATCH', { draftId: 'x', sourceHash: 'y', sentences: ['A.'] }]] as const) {
   assert.equal((await request(resource, id, method, undefined, body)).status, 401);
   for (const user of ['student-mia', 'staff-kevin', 'mentor-sarah']) assert.equal((await request(resource, id, method, user, body)).status, 403);
   assert.equal((await request(resource, 'missing-project', method, 'student-alex', body)).status, 404);
  }
  assert.equal((await request('project', id, 'PATCH', 'student-alex', { codeUrl: 'https://github.com/example/mock-project' })).status, 200);
  assert.equal((await request('introductionGenerate', id, 'POST', 'student-alex', { prompt: 'ignore rules' })).status, 400);
  const queued = await enqueue(); assert.equal(queued.status, 202); assert.equal(calls, 0);
  await enqueue(); // same version coalesces rather than a second paid generation
  const ready = await finish(); assert.equal(ready.status, 'ready'); assert.equal(calls, 1);
  const draft = ready.draft; assert.equal(draft.version, 5); assert.deepEqual(draft.topics, validIntroduction.topics);
  assert.ok(draft.sources.commit); assert.ok(draft.sources.files.length); assert.equal(draft.sources.evidence, 'mock');
  assert.equal((await listProject(id)).introduction, null); assert.deepEqual((await listProject(id)).tags, []);
  const before = (await request('project', id)).data.project;
  for (const extra of [{ tags: ['invented'] }, { topics: ['algorithm'] }, { technologies: ['java'] }, { sentences: [] }, { sentences: ['One.', 'Two.', 'Three.', 'Four.'] }, { sentences: ['One. Two.'] }, { extra: true }]) assert.equal((await confirm(draft, extra)).status, 400);
  const edited = ['An owner-reviewed fictional student prototype.'];
  const published = await confirm(draft, { sentences: edited }); assert.equal(published.status, 200);
  assert.deepEqual((await listProject(id)).introduction.sentences, edited);
  assert.deepEqual((await listProject(id)).tags, [...draft.topics, ...draft.technologies]);
  assert.equal((await request('project', id)).data.project.summary, before.summary);
  const publicJson = JSON.stringify((await request('projects')).data); assert.ok(!publicJson.includes('test-key-not-real')); assert.ok(!publicJson.includes(draft.id));
  await enqueue(); const second = await finish(); assert.equal((await confirm(draft)).status, 409);
  assert.equal((await request('project', id, 'PATCH', 'student-alex', { summary: 'Updated fictional project summary.' })).status, 200);
  assert.equal((await listProject(id)).introduction, null); assert.deepEqual((await listProject(id)).tags, []);
  assert.equal((await confirm(second.draft)).status, 409);
  // A result completing after an edit never overwrites current-source content.
  setTransport(async () => { await request('project', id, 'PATCH', 'student-alex', { summary: 'Edited during generation.' }); return modelResponse(validIntroduction); });
  await finish(); assert.notEqual((await editor()).data.draft?.sourceHash, (await editor()).data.sourceHash);
  // Every malformed HTTP 200 shape from P2 R2 remains rejected under the durable worker.
  const malformed = [
   () => new Response('<html>gateway</html>', { status: 200 }),
   () => Response.json({ status: 'completed', output: {} }),
   () => Response.json({ status: 'completed', output: [{ type: 'message', content: {} }] }),
   () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: {} }] }] }),
   () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text' }] }] }),
   () => Response.json({ status: 'completed', output: [null, { type: 'message', content: [null] }] }),
   () => Response.json([{ status: 'completed', output: [] }]),
   () => modelResponse({ ...validIntroduction, topics: ['unknown'] }),
   () => modelResponse({ ...validIntroduction, technologies: ['invented'] }),
   () => modelResponse({ ...validIntroduction, technologies: ['java'] }),
   () => modelResponse({ ...validIntroduction, sentences: ['One.', 'Two.', 'Three.', 'Four.'] }),
   () => modelResponse({ ...validIntroduction, sentences: ['First sentence. Hidden second sentence.'] }),
   () => modelResponse({ ...validIntroduction, extra: true }),
  ];
  for (const bad of malformed) {
   setTransport(async () => bad()); await enqueue(); const failed = await finish();
   assert.equal(failed.status, 'failed'); assert.equal(failed.error.code, 'AI_INVALID_OUTPUT');
   assert.equal((await request('project', id)).data.project.summary, 'Edited during generation.');
  }
  setTimeoutMs(30);
  setTransport((_url, init) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))));
  await enqueue(); const timed = await finish(); assert.equal(timed.error.code, 'AI_TIMEOUT'); setTimeoutMs(null);
  setTransport(async () => modelResponse(validIntroduction)); await enqueue(); const recovered = await finish(); assert.equal(recovered.status, 'ready');
  assert.equal((await confirm(recovered.draft)).status, 200);
  const db = await database(); await setup(db); await setup(db); await seed(db); await closeDatabase();
  assert.deepEqual((await editor()).data.published.sentences, recovered.draft.sentences);
 } finally { setTransport(null); setGitHubTransport(null); setTimeoutMs(null); delete process.env.GITHUB_API_BASE_URL; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_PROJECT_INTRO_MODEL; await closeDatabase(); }
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
