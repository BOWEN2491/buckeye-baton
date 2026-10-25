import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db';
import { fail, json, rows, parse, role } from './http';
import * as priority from './priority';
import { lockDispatch } from './inbox';
import type { User } from '../shared/types';
import type { InvitationItem, InvitationKind, InvitationRunnerStatus, InvitationStatus, MatchEvidence } from '../shared/p4-types';

type Row = Record<string, any>;
interface Storage extends Sql { transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> }
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : value as string;
const HOUR = 3_600_000, DAY = 24 * HOUR;
export const PICKUP_AGE = 14 * DAY, EXPIRY = 7 * DAY;

// Production uses database time after the lock is taken; tests inject a fixed clock (internal only).
let testClock: (() => Date) | null = null;
export function setInvitationClock(next: (() => Date) | null) { testClock = next; }
export async function inboxNow(sql: Sql) {
 return testClock ? testClock() : new Date((await rows(sql, 'SELECT clock_timestamp() AS now'))[0].now);
}

const normalizeTags = (tags: unknown) => [...new Set((Array.isArray(tags) ? tags : []).map(t => String(t).trim().toLowerCase()).filter(Boolean))];
const pickupKey = (projectId: string) => `invite:pickup:${projectId}`;

// ---- Targets: computed from shared threads and project facts, never a second state machine. ----
interface Target { kind: InvitationKind; eventKey: string; cycleKey: string; project: Row; score: number; timeKey: bigint; id: string }
async function successorCounts(sql: Sql, ids: string[]) {
 return new Map((await rows(sql, 'SELECT "sourceProjectId" AS id, count(*)::int AS n FROM project_relations WHERE "sourceProjectId" = ANY($1::text[]) GROUP BY "sourceProjectId"', [ids])).map(r => [r.id, r.n as number]));
}
const projectsSql = `SELECT *, (extract(epoch FROM "createdAt") * 1000000)::bigint::text AS "createdAtUs" FROM projects`;
async function eligibleTargets(sql: Sql, now: Date): Promise<Target[]> {
 const projects = await rows(sql, projectsSql);
 const succ = await successorCounts(sql, projects.map(p => p.id));
 const targets: Target[] = [];
 for (const p of projects) {
  const pickup = priority.noPickup(p as never, succ.get(p.id) ?? 0, now);
  if (pickup && pickup.hours * HOUR >= PICKUP_AGE) targets.push({ kind: 'pickup', eventKey: pickupKey(p.id), cycleKey: p.id, project: p, score: pickup.points, timeKey: BigInt(p.createdAtUs), id: p.id });
 }
 // P3 score first; ties: exact wait start / project createdAt, then kind, then id.
 const cmp = (x: bigint | string, y: bigint | string) => (x < y ? -1 : x > y ? 1 : 0);
 return targets.sort((a, b) => b.score - a.score || cmp(a.timeKey, b.timeKey) || cmp(a.kind, b.kind) || cmp(a.id, b.id));
}

// ---- Matching: author tags and real public evidence only. ----
interface Candidate { user: User; matchedTags: string[]; evidence: { projectId: string; kind: MatchEvidence['kind'] }[] }
const hasReflection = (r: Row | null) => !!r && ((r.outcomes?.length ?? 0) > 0 || !!String(r.progress ?? '').trim() || (r.problems?.length ?? 0) > 0 || !!String(r.nextTeam ?? '').trim());
async function candidates(sql: Sql, target: Target): Promise<Candidate[]> {
 const tags = normalizeTags(target.project.tags);
 if (!tags.length) return [];
 const users = new Map((await rows(sql, 'SELECT * FROM users')).map(u => [u.id, u as User]));
 const prefsOff = new Set((await rows(sql, 'SELECT "userId" FROM inbox_preferences WHERE "automaticInvitations"=false')).map(r => r.userId));
 const found = new Map<string, { tags: Set<string>; evidence: Map<string, MatchEvidence['kind']> }>();
 const add = (userId: string, projectId: string, projectTags: unknown, kind: MatchEvidence['kind']) => {
  const shared = normalizeTags(projectTags).filter(t => tags.includes(t));
  if (!shared.length) return;
  const entry = found.get(userId) ?? { tags: new Set<string>(), evidence: new Map() };
  shared.forEach(t => entry.tags.add(t)); entry.evidence.set(projectId, kind); found.set(userId, entry);
 };
 // Students: own Finished projects with real reflection content or retained historical lessons.
 for (const p of await rows(sql, `SELECT p.id, p."ownerId", p.tags, p.reflection, (SELECT count(*) FROM lessons l WHERE l."projectId"=p.id)::int AS lessons FROM projects p JOIN users u ON u.id=p."ownerId" WHERE p.status='finished' AND u.role='student'`))
  if (hasReflection(p.reflection) || p.lessons > 0) add(p.ownerId, p.id, p.tags, 'shared_experience');
 const excluded = new Set([target.project.ownerId]);
 return [...found.entries()]
  .filter(([id]) => users.has(id) && !excluded.has(id) && !prefsOff.has(id) && users.get(id)!.role === 'student')
  .map(([id, e]) => ({ user: users.get(id)!, matchedTags: tags.filter(t => e.tags.has(t)), evidence: [...e.evidence].map(([projectId, kind]) => ({ projectId, kind })) }))
  .sort((a, b) => b.matchedTags.length - a.matchedTags.length || b.evidence.length - a.evidence.length || (a.user.id < b.user.id ? -1 : 1));
}

// ---- Effective status (computed on read; persisted only by dispatch and related writes). ----
async function validity(sql: Sql, items: Row[]) {
 const projectIds = [...new Set(items.map(i => i.projectId))];
 const projects = new Map((await rows(sql, 'SELECT id, status FROM projects WHERE id = ANY($1::text[])', [projectIds])).map(p => [p.id, p]));
 const succ = await successorCounts(sql, projectIds);
 return (i: Row) => i.invitationKind === 'pickup' && projects.get(i.projectId)?.status === 'paused' && !(succ.get(i.projectId) ?? 0);
}
export async function effectiveStatuses(sql: Sql, items: Row[], now: Date): Promise<Map<string, InvitationStatus>> {
 const out = new Map<string, InvitationStatus>();
 const pending = items.filter(i => i.status === 'pending');
 items.filter(i => i.status !== 'pending').forEach(i => out.set(i.id, i.status));
 if (!pending.length) return out;
 const valid = await validity(sql, pending);
 const prefsOff = new Set((await rows(sql, 'SELECT "userId" FROM inbox_preferences WHERE "automaticInvitations"=false AND "userId" = ANY($1::text[])', [pending.map(i => i.recipientId)])).map(r => r.userId));
 for (const i of pending) out.set(i.id, new Date(i.expiresAt).getTime() <= now.getTime() ? 'expired' : prefsOff.has(i.recipientId) || !valid(i) ? 'cancelled' : 'pending');
 return out;
}
// Persist expired/cancelled for pending invitations (optionally only some targets), inside the caller's locked transaction.
export async function settleInvitations(sql: Sql, now: Date, eventKeys?: string[]) {
 const pending = await rows(sql, `SELECT * FROM inbox_items WHERE kind='invitation' AND status='pending'${eventKeys ? ' AND "eventKey" = ANY($1::text[])' : ''}`, eventKeys ? [eventKeys] : []);
 const statuses = await effectiveStatuses(sql, pending, now);
 for (const i of pending) { const s = statuses.get(i.id); if (s && s !== 'pending') await sql.query('UPDATE inbox_items SET status=$2 WHERE id=$1 AND status=\'pending\'', [i.id, s]); }
}
export const settlePickup = async (sql: Sql, projectId: string) => settleInvitations(sql, await inboxNow(sql), [pickupKey(projectId)]);

export function reasonText(kind: InvitationKind, evidence: { kind: MatchEvidence['kind'] }[], tags: string[]) {
 const list = tags.join(', ');
 if (evidence.some(e => e.kind === 'mentor_reply') && !evidence.some(e => e.kind === 'shared_experience')) return `You previously replied as a mentor on a ${list} project.`;
 return `You shared a finished project about ${list}. This project uses ${list} too.`;
}
export async function invitationView(sql: Sql, items: Row[], now: Date): Promise<Map<string, InvitationItem>> {
 const out = new Map<string, InvitationItem>();
 if (!items.length) return out;
 const statuses = await effectiveStatuses(sql, items, now);
 const valid = await validity(sql, items);
 const ids = [...new Set(items.flatMap(i => [i.projectId, ...(i.evidence ?? []).map((e: Row) => e.projectId)]))];
 const titles = new Map((await rows(sql, 'SELECT id, title FROM projects WHERE id = ANY($1::text[])', [ids])).map(p => [p.id, p.title]));
 for (const i of items) {
  const status = statuses.get(i.id)!;
  const evidence: MatchEvidence[] = (i.evidence ?? []).map((e: Row) => ({ projectId: e.projectId, projectTitle: titles.get(e.projectId) ?? 'Project', kind: e.kind }));
  out.set(i.id, {
   id: i.id, kind: 'invitation', createdAt: iso(i.createdAt), readAt: i.readAt ? iso(i.readAt) : null, projectId: i.projectId, projectTitle: titles.get(i.projectId) ?? 'Project', questionId: i.questionId,
   href: i.invitationKind === 'pickup' ? `/projects/${encodeURIComponent(i.projectId)}` : `/projects/${encodeURIComponent(i.projectId)}#q-${encodeURIComponent(i.questionId)}`,
   invitationKind: i.invitationKind, status, expiresAt: iso(i.expiresAt), respondedAt: i.respondedAt ? iso(i.respondedAt) : null,
   actionable: status === 'pending' || (status === 'accepted' && valid(i)), matchedTags: i.matchedTags ?? [], evidence, reason: reasonText(i.invitationKind, evidence, i.matchedTags ?? []),
  });
 }
 return out;
}

// ---- Dispatch: one locked transaction, database time, persistent limits and permanent de-duplication. ----
const count = async (sql: Sql, where: string, params: unknown[]) => (await rows(sql, `SELECT count(*)::int AS n FROM inbox_items WHERE kind='invitation' AND "invitationKind"='pickup' AND ${where}`, params))[0].n as number;
export async function dispatchInvitations(db: Storage) {
 return db.transaction(async sql => {
  await lockDispatch(sql);
  const now = await inboxNow(sql);
  const day = new Date(now.getTime() - DAY), week = new Date(now.getTime() - 7 * DAY);
  await settleInvitations(sql, now);
  let created = 0, checked = 0;
  for (const target of await eligibleTargets(sql, now)) {
   if (checked >= 100) break;
   // Per target: at most 1 in any 24 hours and 3 in its lifetime.
   if (await count(sql, '"eventKey"=$1', [target.eventKey]) >= 3) continue;
   if (await count(sql, '"eventKey"=$1 AND "createdAt" > $2', [target.eventKey, day]) >= 1) continue;
   checked++;
   for (const c of await candidates(sql, target)) {
    if (await count(sql, '"recipientId"=$1 AND "eventKey"=$2', [c.user.id, target.eventKey])) continue; // permanent per person + target
    if (await count(sql, '"recipientId"=$1 AND "createdAt" > $2', [c.user.id, day]) >= 1) continue;
    if (await count(sql, '"recipientId"=$1 AND "createdAt" > $2', [c.user.id, week]) >= 3) continue;
    await sql.query(`INSERT INTO inbox_items (id,"recipientId",kind,"eventKey","projectId","questionId","invitationKind",status,"cycleKey","matchedTags",evidence,"expiresAt","createdAt") VALUES ($1,$2,'invitation',$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)`,
     [randomUUID(), c.user.id, target.eventKey, target.project.id, null, target.kind, target.cycleKey, JSON.stringify(c.matchedTags), JSON.stringify(c.evidence), new Date(now.getTime() + EXPIRY), now]);
    created++;
    break;
   }
  }
  await sql.query(`UPDATE invitation_dispatch_state SET "lastCompletedAt"=$1, error=NULL WHERE id='singleton'`, [now]);
  return { created, checked, at: now.toISOString() };
 });
}
// `at` lets the runner record an earlier database outage once storage is reachable again.
export async function recordDispatchFailure(db: Storage, at?: Date) {
 await db.transaction(async sql => {
  await lockDispatch(sql);
  await sql.query(`UPDATE invitation_dispatch_state SET "lastFailureAt"=$1, error='DISPATCH_FAILED' WHERE id='singleton'`, [at ?? await inboxNow(sql)]);
 });
}

// ---- Recipient actions. ----
export async function respond(req: Request, db: Storage, user: User, id: string) {
 const input = await parse(req, z.object({ action: z.enum(['accept', 'ignore'], { error: 'action must be accept or ignore' }) }).strict());
 const outcome = await db.transaction(async sql => {
  await lockDispatch(sql);
  const row = (await rows(sql, `SELECT * FROM inbox_items WHERE id=$1 AND "recipientId"=$2 AND kind='invitation' AND "invitationKind"='pickup' FOR UPDATE`, [id, user.id]))[0] ?? fail(404, 'NOT_FOUND', 'Invitation not found');
  const now = await inboxNow(sql);
  const desired = input.action === 'accept' ? 'accepted' : 'ignored';
  if (row.status === desired) return { row, unavailable: false, now };
  const effective = (await effectiveStatuses(sql, [row], now)).get(row.id)!;
  if (effective !== 'pending') {
   if (row.status === 'pending') await sql.query('UPDATE inbox_items SET status=$2 WHERE id=$1', [row.id, effective]);
   return { row, unavailable: true, now };
  }
  const updated = (await rows(sql, 'UPDATE inbox_items SET status=$2, "respondedAt"=$3, "readAt"=COALESCE("readAt", $3) WHERE id=$1 RETURNING *', [row.id, desired, now]))[0];
  return { row: updated, unavailable: false, now };
 });
 if (outcome.unavailable) fail(409, 'INVITATION_UNAVAILABLE', 'This invitation is no longer available.');
 return json((await invitationView(db, [outcome.row], outcome.now)).get(outcome.row.id));
}

export async function setPreferences(req: Request, db: Storage, user: User) {
 const input = await parse(req, z.object({ automaticInvitations: z.boolean({ error: 'automaticInvitations must be true or false' }) }).strict());
 await db.transaction(async sql => {
  await lockDispatch(sql);
  await sql.query('INSERT INTO inbox_preferences ("userId","automaticInvitations") VALUES ($1,$2) ON CONFLICT ("userId") DO UPDATE SET "automaticInvitations"=EXCLUDED."automaticInvitations", "updatedAt"=clock_timestamp()', [user.id, input.automaticInvitations]);
  // Turning off cancels pending invitations; answered history stays. Turning on never re-sends.
  if (!input.automaticInvitations) await sql.query(`UPDATE inbox_items SET status='cancelled' WHERE "recipientId"=$1 AND kind='invitation' AND status='pending'`, [user.id]);
 });
 return json({ automaticInvitations: input.automaticInvitations });
}

// Retained compatibility endpoint: question-help invitations have been retired.
export async function interestedHelpers(db: Sql, user: User, questionId: string) {
 role(user, 'staff');
 if (!(await rows(db, 'SELECT id FROM project_questions WHERE id=$1', [questionId])).length) fail(404, 'NOT_FOUND', 'Question not found');
 return json([]);
}

export function runnerEnabled() {
 return !!(globalThis as { buckeyeInvitationRunner?: { started: boolean } }).buckeyeInvitationRunner?.started;
}
export async function runnerStatus(db: Sql, user: User) {
 role(user, 'staff');
 const row = (await rows(db, `SELECT * FROM invitation_dispatch_state WHERE id='singleton'`))[0];
 return json({ enabled: runnerEnabled(), intervalSeconds: 60, lastCompletedAt: row?.lastCompletedAt ? iso(row.lastCompletedAt) : null, lastFailureAt: row?.lastFailureAt ? iso(row.lastFailureAt) : null, error: row?.error ?? null } satisfies InvitationRunnerStatus);
}
