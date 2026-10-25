import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { database, closeDatabase } from '../src/server/db';
import { handle } from '../src/server/api';
import { setTransport } from '../src/server/ai';
import { readGitHubSources, setGitHubTransport } from '../src/server/github';
import { runAnalysisStep, setAIJobClock } from '../src/server/ai-jobs';
import { githubResponse, modelResponse, validIntroduction } from './p5-helpers';

async function request(resource: string, id?: string, method = 'GET', body?: unknown) {
 const response = await handle(new Request(`http://localhost/api/${resource}`, { method, headers: { 'x-demo-user-id': 'student-alex', 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), resource, id);
 return { status: response.status, ...await response.json() };
}

test('P5 review: repository material changes stale confirmed labels and reject old-tab confirmation', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p5-repository-stale-'));
 process.env.OPENAI_API_KEY = 'test-not-real'; process.env.OPENAI_PROJECT_INTRO_MODEL = 'mock-model'; process.env.GITHUB_API_BASE_URL = 'http://127.0.0.1:1';
 const db = await database(); const repo = 'https://github.com/example/repository-freshness';
 let revision = 'a';
 setGitHubTransport(async url => {
  const normal = githubResponse(String(url));
  if (String(url).includes('/commits/')) return Response.json({ sha: revision.repeat(40) });
  return normal;
 });
 setTransport(async () => modelResponse(validIntroduction));
 try {
  const created = await request('projects', undefined, 'POST', { title: 'Repository freshness', summary: 'Fictional source freshness experiment.', courseOrClub: 'OSU', term: '2026', codeUrl: repo });
  assert.equal(created.status, 201); const id = created.data.id;
  const editor = async () => (await request('introduction', id)).data;
  const listed = async () => (await request('projects')).data.find((p: any) => p.id === id);
  const publish = (draft: any) => request('introduction', id, 'PATCH', { draftId: draft.id, sourceHash: draft.sourceHash, sentences: draft.sentences });
  const expire = () => db.query('UPDATE github_source_cache SET "expiresAt"=clock_timestamp()-interval \'1 second\' WHERE "repoUrl"=$1', [repo]);
  await runAnalysisStep(db); const first = (await editor()).draft;
  assert.equal((await publish(first)).status, 200); assert.ok((await listed()).introduction);
  await expire(); await readGitHubSources(db, repo);
  assert.ok((await listed()).introduction, 'readAt-only refresh is not a source change');
  revision = 'b'; await expire(); await readGitHubSources(db, repo);
  assert.equal((await listed()).introduction, null); assert.deepEqual((await listed()).tags, []);
  assert.equal((await publish(first)).status, 409, 'an unchanged authored post cannot conceal changed repository sources');
  await request('introductionGenerate', id, 'POST', {}); await runAnalysisStep(db);
  const second = (await editor()).draft; assert.ok(second); assert.equal(second.sources.commit, 'b'.repeat(40));
  assert.equal((await publish(second)).status, 200); assert.ok((await listed()).introduction);
 } finally { setTransport(null); setGitHubTransport(null); delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_PROJECT_INTRO_MODEL; delete process.env.GITHUB_API_BASE_URL; await closeDatabase(); }
});

test('P5 review: long failing requests wait30s then120s after failure, not after task start', async () => {
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'buckeye-baton-p5-retry-failure-time-'));
 process.env.OPENAI_API_KEY = 'test-not-real'; process.env.OPENAI_PROJECT_INTRO_MODEL = 'mock-model'; process.env.GITHUB_API_BASE_URL = 'http://127.0.0.1:1';
 const db = await database(); setGitHubTransport(async url => githubResponse(String(url)));
 try {
  const created = await request('projects', undefined, 'POST', { title: 'Slow failed request', summary: 'Fictional.', courseOrClub: 'OSU', term: '2026', codeUrl: 'https://github.com/example/slow-failure' });
  assert.equal(created.status, 201); const id = created.data.id; const started = new Date(); let clock = started;
  setAIJobClock(() => clock);
  setTransport(async () => { clock = new Date(started.getTime() + 60000); throw new TypeError('simulated slow network failure'); });
  await runAnalysisStep(db, started);
  const job = async () => (await db.query('SELECT * FROM ai_jobs WHERE "targetId"=$1', [id])).rows[0] as any;
  assert.equal(new Date((await job()).availableAt).getTime(), started.getTime() + 90000);
  assert.equal((await runAnalysisStep(db, clock)).processed, false, 'failure does not make retry immediately eligible');
  setTransport(async () => { clock = new Date(started.getTime() + 180000); throw new TypeError('second simulated slow failure'); });
  await runAnalysisStep(db, new Date(started.getTime() + 90000));
  assert.equal(new Date((await job()).availableAt).getTime(), started.getTime() + 300000);
  assert.equal((await runAnalysisStep(db, new Date(started.getTime() + 210000))).processed, false);
  setTransport(async () => modelResponse(validIntroduction)); await runAnalysisStep(db, new Date(started.getTime() + 300000)); assert.equal((await job()).status, 'ready');
 } finally { setAIJobClock(null); setTransport(null); setGitHubTransport(null); delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_PROJECT_INTRO_MODEL; delete process.env.GITHUB_API_BASE_URL; await closeDatabase(); }
});
