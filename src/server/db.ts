import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface Sql { query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }> }
interface Database extends Sql { transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T>; close(): Promise<void>; mode: string }
const globalDb = globalThis as typeof globalThis & { passItOnDb?: Promise<Database> };
export async function database(): Promise<Database> {
  return globalDb.passItOnDb ??= connect().catch(error => { delete globalDb.passItOnDb; throw error; });
}
async function connect(): Promise<Database> {
  const mode = process.env.DATABASE_MODE ?? (process.env.DATABASE_URL ? 'postgres' : 'unconfigured');
  let db: Database;
  if (mode === 'pglite') {
    const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), '.data/pglite');
    if (dataDir !== 'memory://') await mkdir(path.dirname(path.resolve(dataDir)), { recursive: true });
    const pg = new PGlite(dataDir);
    await pg.waitReady;
    db = { mode, query: (sql, params) => pg.query(sql, params) as never, transaction: fn => pg.transaction(tx => fn({ query: (sql, params) => tx.query(sql, params) as never })), close: () => pg.close() };
  } else {
    if (mode !== 'postgres' || !process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL for postgres, or explicit DATABASE_MODE=pglite for local development.');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000 });
    db = { mode, query: (sql, params) => pool.query(sql, params) as never, transaction: async fn => {
      const client = await pool.connect();
      try { await client.query('BEGIN'); const value = await fn(client); await client.query('COMMIT'); return value; }
      catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    }, close: () => pool.end() };
  }
  // Schema setup is explicit in production; local embedded demo bootstraps itself.
  if (mode === 'pglite') { await setup(db); const { seed } = await import('./seed'); await seed(db); }
  return db;
}
export async function setup(db: Sql) {
  const schema = await readFile(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
  for (const statement of schema.split(';').filter(s => s.trim())) await db.query(statement);
}
export async function closeDatabase() { if (globalDb.passItOnDb) { const db = await globalDb.passItOnDb; await db.close(); delete globalDb.passItOnDb; } }
