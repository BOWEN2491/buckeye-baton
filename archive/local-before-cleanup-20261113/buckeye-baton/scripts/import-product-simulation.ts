import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { database, closeDatabase } from '../src/server/db';
import { rows } from '../src/server/http';
import { importSimulation } from './product-simulation';

async function main() {
 const args = process.argv.slice(2);
 const value = (key: string) => args[args.indexOf(key) + 1];
 if (!args.includes('--stopped-preview') || !args.includes('--runtime') || !args.includes('--report')) throw new Error('Usage: tsx scripts/import-product-simulation.ts --stopped-preview --runtime <manifest> --report <new-report.json>. Stop the preview and back up its database first.');
 const runtime = JSON.parse(await readFile(value('--runtime'), 'utf8'));
 const dataDir = path.resolve(runtime.dataDirectory);
 if (!path.isAbsolute(runtime.dataDirectory) || !runtime.port || !dataDir.includes('buckeye-baton-p4-review')) throw new Error('Unexpected preview manifest. This command is limited to the preserved local P4 database.');
 await new Promise<void>((resolve, reject) => {
  const socket = net.createConnection({ host: '127.0.0.1', port: runtime.port });
  socket.once('connect', () => { socket.destroy(); reject(new Error('Preview is still listening. Refusing a second PGlite connection.')); });
  socket.once('error', (error: NodeJS.ErrnoException) => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
  socket.setTimeout(2000, () => { socket.destroy(); reject(new Error('Could not establish that the preview is stopped.')); });
 });
 process.env.DATABASE_MODE = 'pglite'; process.env.PGLITE_DATA_DIR = dataDir;
 delete process.env.DATABASE_URL;
 const db = await database();
 try {
  const result = await db.transaction(async sql => {
   const tables = ['users', 'projects', 'lessons', 'comments', 'referrals', 'adoptions', 'project_relations', 'project_questions', 'project_posts', 'project_referrals', 'project_introductions', 'inbox_items', 'inbox_preferences'];
   const snapshots = await Promise.all(tables.map(async table => ({ table, key: table === 'project_introductions' ? 'projectId' : table === 'inbox_preferences' ? 'userId' : 'id', records: await rows(sql, `SELECT * FROM ${table}`) })));
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
main().catch(error => { console.error(error.message); process.exitCode = 1; });
