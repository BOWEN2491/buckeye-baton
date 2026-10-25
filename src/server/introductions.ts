import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db';
import { fail, json, rows, one, parse } from './http';
import { generateIntroduction, aiConfig } from './ai';
import { publishIntroductionInput } from '../shared/p2-validation';
import type { User } from '../shared/types';
import type { IntroductionEditor, PublishedIntroduction } from '../shared/p2-types';

type Row = Record<string, any>;
interface Storage extends Sql { transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> }

// Stable serialization: sorted keys at every level; missing reflection is null.
function canonical(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(canonical);
 if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical((value as Row)[k])]));
 return value ?? null;
}
const sourceFields = (p: Row) => ({ title: p.title, summary: p.summary, courseOrClub: p.courseOrClub, term: p.term, tags: p.tags ?? [], status: p.status, reflection: p.reflection ?? null });
export const sourceHash = (project: Row) => createHash('sha256').update(JSON.stringify(canonical(sourceFields(project)))).digest('hex');

// Only these fields leave the server; model, reviewer and draft ids stay internal.
export function publicIntroduction(published: Row | null | undefined, hash: string): PublishedIntroduction | null {
 return published ? { sentences: published.sentences, tags: published.tags, reviewedAt: published.reviewedAt, stale: published.sourceHash !== hash } : null;
}
function editor(project: Row, intro: Row | undefined): IntroductionEditor {
 const hash = sourceHash(project); const d = intro?.draft;
 return { sourceHash: hash, draft: d ? { id: d.id, sentences: d.sentences, tags: d.tags, sourceHash: d.sourceHash, generatedAt: d.generatedAt } : null, published: publicIntroduction(intro?.published, hash) };
}
async function owned(db: Sql, id: string, user: User) {
 const project = await one(db, 'projects', id);
 if (user.role !== 'student' || project.ownerId !== user.id) fail(403, 'FORBIDDEN', 'Only the project owner can manage its introduction');
 return project;
}
const introRow = async (sql: Sql, id: string, lock = '') => (await rows(sql, `SELECT * FROM project_introductions WHERE "projectId"=$1 ${lock}`, [id]))[0];

export async function browseProjects(db: Sql, projects: Row[]) {
 if (!projects.length) return projects;
 const intros = new Map((await rows(db, 'SELECT "projectId", published FROM project_introductions WHERE "projectId" = ANY($1::text[]) AND published IS NOT NULL', [projects.map(p => p.id)])).map(r => [r.projectId, r.published]));
 return projects.map(p => ({ ...p, introduction: publicIntroduction(intros.get(p.id), sourceHash(p)) }));
}

export async function getEditor(db: Sql, user: User, id: string) {
 const project = await owned(db, id, user);
 return json(editor(project, await introRow(db, id)));
}

// In-process lock for the local single-process demo; not a multi-instance limiter.
const generating = new Set<string>();
export async function generate(req: Request, db: Storage, user: User, id: string) {
 const project = await owned(db, id, user);
 await parse(req, z.object({}).strict());
 if (generating.has(id)) fail(409, 'GENERATION_IN_PROGRESS', 'An introduction is already being generated for this project');
 if (!aiConfig()) fail(503, 'AI_UNAVAILABLE', 'AI introductions are not configured on this server. Your own summary and tags are still used.');
 generating.add(id);
 try {
  const hash = sourceHash(project);
  // No transaction is held while waiting for the model.
  const { content, model } = await generateIntroduction(sourceFields(project));
  const saved = await db.transaction(async sql => {
   const current = (await rows(sql, 'SELECT * FROM projects WHERE id=$1 FOR UPDATE', [id]))[0] ?? fail(404, 'NOT_FOUND', 'Record not found');
   if (sourceHash(current) !== hash) fail(409, 'INTRODUCTION_STALE', 'The project changed while the introduction was being generated. Nothing was saved; generate again.');
   const draft = { id: randomUUID(), ...content, sourceHash: hash, generatedAt: new Date().toISOString(), model };
   await sql.query('INSERT INTO project_introductions ("projectId", draft) VALUES ($1,$2) ON CONFLICT ("projectId") DO UPDATE SET draft=EXCLUDED.draft, "updatedAt"=clock_timestamp()', [id, JSON.stringify(draft)]);
   return editor(current, await introRow(sql, id));
  });
  return json(saved);
 } finally { generating.delete(id); }
}

export async function publish(req: Request, db: Storage, user: User, id: string) {
 await owned(db, id, user);
 const input = await parse(req, publishIntroductionInput);
 return json(await db.transaction(async sql => {
  const project = (await rows(sql, 'SELECT * FROM projects WHERE id=$1 FOR UPDATE', [id]))[0] ?? fail(404, 'NOT_FOUND', 'Record not found');
  const intro = await introRow(sql, id, 'FOR UPDATE');
  if (!intro?.draft || intro.draft.id !== input.draftId) fail(409, 'DRAFT_CONFLICT', 'A newer draft replaced this one, possibly in another tab. Reload to review it.');
  const hash = sourceHash(project);
  if (input.sourceHash !== hash || intro.draft.sourceHash !== hash) fail(409, 'INTRODUCTION_STALE', 'The project changed after this draft was generated. Generate a new introduction.');
  const published = { sentences: input.sentences, tags: input.tags, sourceHash: hash, reviewedAt: new Date().toISOString(), reviewerId: user.id, draftId: intro.draft.id, model: intro.draft.model };
  await sql.query('UPDATE project_introductions SET published=$2, "updatedAt"=clock_timestamp() WHERE "projectId"=$1', [id, JSON.stringify(published)]);
  return editor(project, await introRow(sql, id));
 }));
}
