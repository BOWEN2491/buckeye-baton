import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { database, closeDatabase } from '../src/server/db';
import { rows } from '../src/server/http';
import { importSimulation } from './product-simulation';
import { pathToFileURL } from 'node:url';

const holder = 'C:/Users/23678/.codex/workspaces/buckeye-baton-p4-review';
export const preservedPreviewDirectory = `${holder}/.data/p4-preview-e2e-737dae5553fa44779b0d1d0ce0ff3459`;
const previewApps = ['C:/Users/23678/.codex/workspaces/buckeye-baton-p4-product-revision', 'C:/Users/23678/.codex/workspaces/buckeye-baton-p5-implementation'];
const canonicalWindowsPath = (value: unknown) => typeof value === 'string' && path.win32.isAbsolute(value) ? path.win32.normalize(value).replace(/[\\/]+$/, '').toLowerCase() : null;

// This operator command is intentionally limited to this one preserved preview, not any PGlite
// folder that happens to contain a familiar directory name. Validate before networking or storage.
export function validatePreviewRuntime(value: unknown): { port: 3001; dataDirectory: string } {
 const runtime = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
 if (runtime.port !== 3001 || runtime.url !== 'http://127.0.0.1:3001'
  || canonicalWindowsPath(runtime.dataDirectory) !== canonicalWindowsPath(preservedPreviewDirectory)
  || !previewApps.some(app => canonicalWindowsPath(runtime.appDirectory) === canonicalWindowsPath(app))
  || canonicalWindowsPath(runtime.aiEnvFile) !== canonicalWindowsPath(`${holder}/.env.local`)
  || typeof runtime.appSourceSha !== 'string' || !/^[a-f0-9]{40}$/i.test(runtime.appSourceSha)) {
  throw new Error('Unexpected preview manifest. This command requires the exact preserved Buckeye Baton preview database, approved app directory and port3001.');
 }
 return { port: 3001, dataDirectory: path.resolve(preservedPreviewDirectory) };
}

async function main() {
 const args = process.argv.slice(2);
 const value = (key: string) => args[args.indexOf(key) + 1];
 if (!args.includes('--stopped-preview') || !args.includes('--runtime') || !args.includes('--report')) throw new Error('Usage: tsx scripts/import-product-simulation.ts --stopped-preview --runtime <manifest> --report <new-report.json>. Stop the preview and back up its database first.');
 const runtime = JSON.parse(await readFile(value('--runtime'), 'utf8'));
 const validated = validatePreviewRuntime(runtime);
 const dataDir = validated.dataDirectory;
 await new Promise<void>((resolve, reject) => {
  const socket = net.createConnection({ host: '127.0.0.1', port: validated.port });
  socket.once('connect', () => { socket.destroy(); reject(new Error('Preview is still listening. Refusing a second PGlite connection.')); });
  socket.once('error', (error: NodeJS.ErrnoException) => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
  socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Could not establish that the preview is stopped.')); });
 });
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = dataDir;
 delete process.env.DATABASE_URL;
 const db = await database();
 try {
  const result = await db.transaction(async sql => {
   const tables = ['users', 'projects', 'lessons', 'comments', 'referrals', 'adoptions', 'project_relations', 'project_questions', 'project_posts', 'project_referrals', 'project_introductions', 'inbox_items', 'inbox_preferences', 'ai_jobs', 'question_analyses', 'github_source_cache'];
   const snapshots = await Promise.all(tables.map(async table => ({ table, key: table === 'project_introductions' ? 'projectId' : table === 'question_analyses' ? 'questionId' : table === 'github_source_cache' ? 'repoUrl' : table === 'inbox_preferences' ? 'userId' : 'id', records: await rows(sql, `SELECT * FROM ${table}`) })));
   const imported = await importSimulation({ query: (q, p) => sql.query(q, p), transaction: fn => fn(sql) });
   for (const { table, key, records } of snapshots) {
    const old = new Map(records.map(r => [r[key], r]));
    const after = await rows(sql, `SELECT * FROM ${table} WHERE "${key}"=ANY($1::text[])`, [[...old.keys()]]);
    assert.equal(after.length, old.size, `Original ${table} row missing`);
    for (const row of after) assert.deepEqual(row, old.get(row[key]), `Original ${table} changed`);
   }
   return { ...imported, preservedExistingRows: Object.fromEntries(snapshots.map(s => [s.table, s.records.length])) };
  });
  await writeFile(value('--report'), JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(result));
 } finally { await closeDatabase(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
