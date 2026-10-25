import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { database, closeDatabase, setup } from '../src/server/db';
import { setTransport } from '../src/server/ai';
import { readGitHubSources, setGitHubTransport } from '../src/server/github';
import { runAnalysisStep, recoverAIJobs, setAIJobClock } from '../src/server/ai-jobs';
import { startAIRunner, stopAIRunner } from '../src/server/ai-runner';
import { expertiseScoresSchema, EXPERTISE } from '../src/shared/p5-types';
import { normalizeGitHubUrl } from '../src/shared/p5-validation';
import { githubResponse, modelResponse, validIntroduction } from './p5-helpers';

async function request(resource: string, id?: string, method = 'GET', user?: string, body?: unknown) {
 const req = new Request(`http://localhost/api/${resource}`, { method, headers: { ...(user ? { 'x-demo-user-id': user } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 const response = await handle(req, resource, id); return { status: response.status, ...await response.json() };
}
async function fresh(name: string) { process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), `buckeye-baton-p5-${name}-`)); return database(); }
const scores = () => Object.fromEntries(EXPERTISE.map((key, i) => [key, { score: [90, 80, 20, 80, 35][i], reason: `Mock relevance for ${key}.` }]));
const configure = () => { process.env.GITHUB_API_BASE_URL = 'http://127.0.0.1:1'; process.env.OPENAI_API_KEY = 'test-not-real'; process.env.OPENAI_PROJECT_INTRO_MODEL = 'mock-model'; };
const reset = async () => { stopAIRunner(); setAIJobClock(null); setTransport(null); setGitHubTransport(null); delete process.env.GITHUB_API_BASE_URL; delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_PROJECT_INTRO_MODEL; await closeDatabase(); };

test('P5 expertise validation, question classification and dynamic top-three manual recommendations', async () => {
 const db = await fresh('recommendations'); configure(); let calls = 0;
 setTransport(async () => { calls++; return modelResponse(scores()); });
 try {
  assert.equal((await request('mentorExpertise')).status, 401);
  for (const user of ['student-alex', 'student-mia', 'staff-kevin']) assert.equal((await request('mentorExpertise', undefined, 'PATCH', user, { expertise: ['database'] })).status, 403);
  assert.deepEqual((await request('mentorExpertise', undefined, 'GET', 'mentor-sarah')).data.expertise, []);
  for (const expertise of [['unknown'], ['database', 'database']]) assert.equal((await request('mentorExpertise', undefined, 'PATCH', 'mentor-sarah', { expertise })).status, 400);
  assert.equal((await request('mentorExpertise', undefined, 'PATCH', 'mentor-sarah', { expertise: ['front-end', 'back-end'] })).status, 200);
  for (const [id, domains] of [['mentor-a', ['database']], ['mentor-b', ['back-end']], ['mentor-c', ['brainstorming']], ['mentor-unset', []]] as const) await db.query('INSERT INTO users(id,name,role,headline,tags,expertise) VALUES($1,$1,\'mentor\',\'Fictional mock mentor\',\'[]\',$2)', [id, JSON.stringify(domains)]);
  const ask = async (title: string, wantsMentor = true) => (await request('projectQuestions', 'project-events', 'POST', 'student-mia', { title, body: 'Which interface should show persisted database results?', wantsMentor, dueAt: null })).data.question.id;
  const open = await ask('Open discussion', false);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ai_jobs WHERE "targetId"=$1', [open])).rows[0].n, 0);
  const id = await ask('Specific mentor request');
  const rec = () => request('questionRecommendations', id, 'GET', 'staff-kevin');
  for (const user of ['student-mia', 'student-alex', 'mentor-sarah']) assert.equal((await request('questionRecommendations', id, 'GET', user)).status, 403);
  assert.equal((await rec()).data.status, 'pending'); assert.equal(calls, 0);
  await runAnalysisStep(db); let ready = (await rec()).data;
  assert.equal(ready.status, 'ready'); assert.deepEqual(Object.keys(ready.scores).sort(), [...EXPERTISE].sort());
  assert.deepEqual(ready.candidates.map((m: any) => m.mentor.id), ['mentor-sarah', 'mentor-a', 'mentor-b']);
  assert.equal(ready.candidates[0].score, 90, 'multiple expertise never sums scores');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM project_referrals')).rows[0].n, 0, 'recommendations never assign');
  await request('questionReferral', id, 'POST', 'staff-kevin', { mentorId: 'mentor-a', reason: 'Human confirmed database experience.' });
  ready = (await rec()).data;
  assert.deepEqual(ready.candidates.map((m: any) => [m.mentor.id, m.awaitingReply]), [['mentor-sarah', 0], ['mentor-b', 0], ['mentor-a', 1]]);
  const beforeCalls = calls;
  await request('mentorExpertise', undefined, 'PATCH', 'mentor-sarah', { expertise: [] });
  ready = (await rec()).data; assert.equal(calls, beforeCalls);
  assert.deepEqual(ready.candidates.map((m: any) => m.mentor.id), ['mentor-b', 'mentor-a', 'mentor-c']);
  assert.equal(ready.candidates[2].lowRelevance, true);
  assert.ok(!ready.candidates.some((m: any) => m.mentor.id === 'mentor-unset'));
  const post = (user: string, kind: string, body: string) => request('questionPosts', id, 'POST', user, { kind, body });
  await post('mentor-a', 'mentor_reply', 'Use an indexed query.');
  await post('student-mia', 'comment', 'Thank you.'); assert.equal(calls, beforeCalls);
  const follow = await post('student-mia', 'follow_up', 'How should the index support sorting?');
  assert.equal((await rec()).data.scores, null, 'prior analysis is never presented as current');
  await runAnalysisStep(db); assert.equal((await rec()).data.status, 'ready');
  assert.equal((await request('projectPost', follow.data.posts.at(-1).id, 'DELETE', 'student-mia')).status, 200);
  assert.equal((await rec()).data.scores, null); await runAnalysisStep(db);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM project_referrals WHERE "questionId"=$1', [id])).rows[0].n, 1);
  assert.equal((await request('questionAnalysisRetry', id, 'POST', 'student-alex', {})).status, 403);
  const authorRetry = await request('questionAnalysisRetry', id, 'POST', 'student-mia', {}); assert.equal(authorRetry.status, 202); assert.deepEqual(authorRetry.data.candidates, []); assert.equal(authorRetry.data.scores, null);
  setTransport(async () => modelResponse({ ...scores(), database: { score: 101, reason: 'Invalid relevance.' } }));
  await runAnalysisStep(db); assert.equal((await rec()).data.status, 'failed'); assert.equal((await rec()).data.error.code, 'AI_INVALID_OUTPUT'); assert.equal((await rec()).data.scores, null);
  await request('questionAnalysisRetry', id, 'POST', 'staff-kevin', {}); setTransport(async () => modelResponse(scores())); await runAnalysisStep(db); assert.equal((await rec()).data.status, 'ready');
  const scoredCalls = calls;
  for (const mentor of ['mentor-sarah', 'mentor-a', 'mentor-b', 'mentor-c']) await request('mentorExpertise', undefined, 'PATCH', mentor, { expertise: [] });
  assert.deepEqual((await rec()).data.candidates, [], 'no matching expertise means no fabricated three-person list'); assert.equal(calls, scoredCalls);
  assert.equal((await request('questionAnalysisRetry', open, 'POST', 'student-mia', {})).status, 409);
  await setup(db); await setup(db);
 } finally { await reset(); }
});

test('P5 strict scoring enums and GitHub root URLs reject untrusted paths before network access', () => {
 assert.equal(expertiseScoresSchema.safeParse(scores()).success, true);
 for (const bad of [-1, 101, '90', null, NaN]) assert.equal(expertiseScoresSchema.safeParse({ ...scores(), database: { score: bad, reason: 'x' } }).success, false);
 for (const bad of [{ ...scores(), security: { score: 90, reason: 'x' } }, { database: { score: 90, reason: 'x' } }]) assert.equal(expertiseScoresSchema.safeParse(bad).success, false);
 assert.equal(normalizeGitHubUrl('https://github.com/example/repository.git/'), 'https://github.com/example/repository');
 for (const url of ['http://github.com/a/b', 'https://github.com.evil/a/b', 'https://user:pass@github.com/a/b', 'https://github.com/a/b/tree/main', 'https://github.com/a/b?x=1', 'https://github.com/a/b#x', 'https://127.0.0.1/a/b', 'https://github.com/a/..']) assert.throws(() => normalizeGitHubUrl(url), url);
});

test('P5 GitHub provenance, pinned reads, caching, missing files and bounded response validation', async () => {
 const db = await fresh('github'); const calls: string[] = [];
 setGitHubTransport(async url => { calls.push(String(url)); return githubResponse(String(url)); });
 try {
  const snapshot = await readGitHubSources(db, 'https://github.com/example/source');
  assert.equal(snapshot.sources.commit?.length, 40); assert.equal(snapshot.sources.missingREADME, false);
  assert.deepEqual(snapshot.sources.files.map(f => f.path), ['README.md', 'package.json']);
  assert.ok(calls.filter(u => /readme|contents/.test(u)).every(u => u.includes(`ref=${snapshot.sources.commit}`)));
  const n = calls.length; assert.deepEqual(await readGitHubSources(db, 'https://github.com/example/source'), snapshot); assert.equal(calls.length, n);
  const manifestCalls: string[] = [];
  setGitHubTransport(async url => { manifestCalls.push(String(url)); return String(url).includes('/contents/pom.xml') ? Response.json({ type: 'file', path: 'pom.xml', size: 8, encoding: 'base64', content: Buffer.from('<java />').toString('base64') }) : githubResponse(String(url)); });
  const manifests = await readGitHubSources(db, 'https://github.com/example/two-manifests');
  assert.equal(manifests.sources.files.filter(f => f.path !== 'README.md').length, 2); assert.equal(manifestCalls.some(u => u.includes('requirements.txt')), false);
  setGitHubTransport(async url => String(url).includes('/readme') ? new Response('{}', { status: 404 }) : githubResponse(String(url)));
  const missing = await readGitHubSources(db, 'https://github.com/example/no-readme'); assert.equal(missing.sources.missingREADME, true); assert.ok(!missing.sources.files.some(f => f.path === 'README.md'));
  setGitHubTransport(async () => Response.json({ private: false, default_branch: 'main', description: null, size: 0 }));
  const empty = await readGitHubSources(db, 'https://github.com/example/empty'); assert.equal(empty.sources.commit, null); assert.deepEqual(empty.sources.files, []);
  setGitHubTransport(async () => new Response('{}', { status: 404 }));
  await assert.rejects(readGitHubSources(db, 'https://github.com/example/private'), (e: any) => e.code === 'GITHUB_NOT_PUBLIC');
  setGitHubTransport(async () => new Response('{}', { status: 429 }));
  await assert.rejects(readGitHubSources(db, 'https://github.com/example/limited'), (e: any) => e.code === 'GITHUB_RATE_LIMITED');
  setGitHubTransport(async () => new Response('x'.repeat(70000)));
  await assert.rejects(readGitHubSources(db, 'https://github.com/example/oversize'), (e: any) => e.code === 'GITHUB_INVALID_RESPONSE');
  setGitHubTransport(async url => String(url).includes('/readme') ? Response.json({ type: 'file', path: 'README.md', size: 31000, encoding: 'base64', content: Buffer.from('🎓'.repeat(6000) + 'a'.repeat(7000)).toString('base64') }) : githubResponse(String(url)));
  const long = await readGitHubSources(db, 'https://github.com/example/long'); assert.equal(long.sources.files[0].truncated, true); assert.ok(!/[\ud800-\udbff]$/.test(long.files[0].text));
 } finally { await reset(); }
});

test('P5 durable retries, deduplication, processing recovery and runner error isolation', async () => {
 const db = await fresh('jobs'); configure(); setGitHubTransport(async url => githubResponse(String(url)));
 try {
  const projectInput = { title: 'Required repository', summary: 'Fictional.', courseOrClub: 'OSU', term: '2026' };
  assert.equal((await request('projects', undefined, 'POST', 'student-alex', projectInput)).status, 400);
  assert.equal((await request('projects', undefined, 'POST', 'student-alex', { ...projectInput, codeUrl: 'https://github.com/example/repository', tags: ['front-end'] })).status, 400);
  assert.equal((await request('project', 'project-events', 'PATCH', 'student-mia', { tags: ['database'] })).status, 400);
  assert.equal((await request('projects', undefined, 'POST', 'student-alex', { ...projectInput, codeUrl: 'http://127.0.0.1/private' })).status, 400);
  const queued = await request('projects', undefined, 'POST', 'student-alex', { title: 'Durable prototype', summary: 'Fictional.', courseOrClub: 'OSU', term: '2026', codeUrl: 'https://github.com/example/durable' });
  assert.equal(queued.status, 201); const id = queued.data.id;
  await request('introductionGenerate', id, 'POST', 'student-alex', {}); await request('introductionGenerate', id, 'POST', 'student-alex', {});
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ai_jobs WHERE "targetId"=$1', [id])).rows[0].n, 1);
  setTransport(async () => { throw new TypeError('network unavailable'); });
  const now = new Date(); let clock = now; setAIJobClock(() => clock); await runAnalysisStep(db, now);
  let job = (await db.query('SELECT * FROM ai_jobs WHERE "targetId"=$1', [id])).rows[0] as any;
  assert.equal(job.status, 'pending'); assert.equal(job.attempts, 1); assert.equal(new Date(job.availableAt).getTime() - now.getTime(), 30000);
  assert.equal((await runAnalysisStep(db, now)).processed, false);
  clock = new Date(now.getTime() + 30000); await runAnalysisStep(db, clock); job = (await db.query('SELECT * FROM ai_jobs WHERE "targetId"=$1', [id])).rows[0] as any;
  assert.equal(job.attempts, 2); assert.equal(new Date(job.availableAt).getTime() - now.getTime(), 150000);
  clock = new Date(now.getTime() + 150000); await runAnalysisStep(db, clock); job = (await db.query('SELECT * FROM ai_jobs WHERE "targetId"=$1', [id])).rows[0] as any; assert.equal(job.status, 'failed'); assert.equal(job.attempts, 3);
  setTransport(async () => modelResponse(validIntroduction)); await request('introductionGenerate', id, 'POST', 'student-alex', {});
  await db.query('UPDATE ai_jobs SET status=\'processing\' WHERE "targetId"=$1', [id]); await recoverAIJobs(db);
  await runAnalysisStep(db); assert.equal((await request('introduction', id, 'GET', 'student-alex')).data.status, 'ready');
  let loops = 0; const unhandled: unknown[] = []; const listener = (e: unknown) => unhandled.push(e); process.on('unhandledRejection', listener);
  try { startAIRunner(10, async () => { loops++; if (loops < 3) throw new Error('test outage'); }); await new Promise(r => setTimeout(r, 90)); stopAIRunner(); const stopped = loops; await new Promise(r => setTimeout(r, 35)); assert.ok(stopped >= 3); assert.equal(loops, stopped); assert.deepEqual(unhandled, []); } finally { process.off('unhandledRejection', listener); }
 } finally { await reset(); }
});
