import type { Sql } from './db';
import { demoUsers, demoProjects, demoLessons, demoQuestions } from '../shared/fixtures';
export async function seed(db: Sql) {
 for (const [table, records] of [['users',demoUsers],['projects',demoProjects],['lessons',demoLessons],['project_questions',demoQuestions]] as const) {
  for(const record of records) {const entries=Object.entries(record);await db.query(`INSERT INTO ${table} (${entries.map(([key])=>`"${key}"`).join(',')}) VALUES (${entries.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (id) DO NOTHING`,entries.map(([,value])=>value!==null&&typeof value==='object'?JSON.stringify(value):value));}
 }
}
