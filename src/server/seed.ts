import type { Sql } from './db';
import { demoUsers, demoProjects, demoLessons } from '../shared/fixtures';
export async function seed(db: Sql) {
 for (const [table, records] of [['users',demoUsers],['projects',demoProjects],['lessons',demoLessons]] as const) {
  for(const record of records) {const entries=Object.entries(record);await db.query(`INSERT INTO ${table} (${entries.map(([key])=>`"${key}"`).join(',')}) VALUES (${entries.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (id) DO NOTHING`,entries.map(([,value])=>Array.isArray(value)?JSON.stringify(value):value));}
 }
}
