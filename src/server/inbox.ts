import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Sql } from './db';
import { fail, json, rows, parse } from './http';
import type { User } from '../shared/types';
import type { ActivityEvent, ActivityItem, InboxFilter, InboxItem, InboxPreferences, RecipientReason } from '../shared/p4-types';
import { invitationView, inboxNow, effectiveStatuses } from './invitations';

type Row = Record<string, any>;
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : value as string;

// The singleton dispatch row doubles as the database lock that serializes dispatch with every write
// that can change invitation eligibility. Always taken first, before target or post rows.
export async function lockDispatch(sql: Sql) {
 await sql.query(`INSERT INTO invitation_dispatch_state (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING`);
 await sql.query(`SELECT id FROM invitation_dispatch_state WHERE id='singleton' FOR UPDATE`);
}

// Activity: one row per recipient per business event, inside the caller's transaction. Recipients are
// de-duplicated (reasons merged) and the actor is excluded. No body text is stored.
export async function notify(sql: Sql, e: { event: ActivityEvent; eventKey: string; actorId: string; projectId: string; questionId: string; postId?: string | null; referralId?: string | null; recipients: [string | null | undefined, RecipientReason][] }) {
 const byUser = new Map<string, RecipientReason[]>();
 for (const [userId, reason] of e.recipients) {
  if (!userId || userId === e.actorId) continue;
  byUser.set(userId, [...new Set([...(byUser.get(userId) ?? []), reason])]);
 }
 for (const [recipientId, reasons] of byUser)
  await sql.query('INSERT INTO inbox_items (id,"recipientId",kind,"eventKey",event,"actorId",reasons,"projectId","questionId","postId","referralId") VALUES ($1,$2,\'activity\',$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT ("recipientId","eventKey") DO NOTHING',
   [randomUUID(), recipientId, e.eventKey, e.event, e.actorId, JSON.stringify(reasons), e.projectId, e.questionId, e.postId ?? null, e.referralId ?? null]);
}

// At most 160 Unicode code points; never splits a surrogate pair. Rendered as plain text by the UI.
export const previewText = (text: string | null | undefined) => {
 if (!text) return null;
 const chars = Array.from(text.trim());
 return chars.length > 160 ? `${chars.slice(0, 159).join('')}…` : chars.join('');
};
const href = (projectId: string, questionId: string | null) => `/projects/${encodeURIComponent(projectId)}${questionId ? `#q-${encodeURIComponent(questionId)}` : ''}`;

async function activityViews(sql: Sql, items: Row[]): Promise<Map<string, ActivityItem>> {
 const out = new Map<string, ActivityItem>();
 if (!items.length) return out;
 const users = new Map((await rows(sql, 'SELECT * FROM users')).map(u => [u.id, u as User]));
 const projects = new Map((await rows(sql, 'SELECT id, title FROM projects WHERE id = ANY($1::text[])', [[...new Set(items.map(i => i.projectId))]])).map(p => [p.id, p.title]));
 const questionIds = [...new Set(items.map(i => i.questionId).filter(Boolean))];
 const questions = new Map((await rows(sql, 'SELECT id, title, body FROM project_questions WHERE id = ANY($1::text[])', [questionIds])).map(q => [q.id, q]));
 const posts = new Map((await rows(sql, 'SELECT id, kind, body, "deletedAt" FROM project_posts WHERE id = ANY($1::text[])', [items.map(i => i.postId).filter(Boolean)])).map(p => [p.id, p]));
 const referrals = new Map((await rows(sql, 'SELECT id, reason FROM project_referrals WHERE id = ANY($1::text[])', [items.map(i => i.referralId).filter(Boolean)])).map(r => [r.id, r]));
 for (const i of items) {
  const post = i.postId ? posts.get(i.postId) : null;
  const question = i.questionId ? questions.get(i.questionId) : null;
  // Deleted posts: keep the event, never their text.
  const removed = !!post?.deletedAt;
  const preview = i.event === 'post_created' ? (removed ? null : previewText(post?.body)) : i.event === 'referral_created' ? previewText(referrals.get(i.referralId)?.reason) : previewText(question?.body);
  out.set(i.id, { id: i.id, kind: 'activity', createdAt: iso(i.createdAt), readAt: i.readAt ? iso(i.readAt) : null, projectId: i.projectId, projectTitle: projects.get(i.projectId) ?? 'Project', questionId: i.questionId, href: href(i.projectId, i.questionId), event: i.event, actor: users.get(i.actorId)!, reasons: i.reasons, postKind: post?.kind ?? null, questionTitle: question?.title ?? null, preview, removed });
 }
 return out;
}

async function views(sql: Sql, items: Row[], now: Date): Promise<InboxItem[]> {
 const activity = await activityViews(sql, items.filter(i => i.kind === 'activity'));
 const invitations = await invitationView(sql, items.filter(i => i.kind === 'invitation'), now);
 return items.map(i => (i.kind === 'activity' ? activity.get(i.id) : invitations.get(i.id))!);
}

// Unread = unread activity + unread invitations that are still effectively pending.
async function unreadCount(sql: Sql, userId: string, now: Date) {
 const activity = (await rows(sql, `SELECT count(*)::int AS n FROM inbox_items WHERE "recipientId"=$1 AND kind='activity' AND "readAt" IS NULL`, [userId]))[0].n as number;
 const pending = await rows(sql, `SELECT * FROM inbox_items WHERE "recipientId"=$1 AND kind='invitation' AND "readAt" IS NULL AND status='pending'`, [userId]);
 const statuses = await effectiveStatuses(sql, pending, now);
 return activity + pending.filter(i => statuses.get(i.id) === 'pending').length;
}

const filterSql: Record<InboxFilter, string> = { all: '', unread: ' AND "readAt" IS NULL', invitations: ` AND kind='invitation'` };
// Unread uses the same meaning as unreadCount: unread Activity plus unread invitations that are still
// effectively pending. Persisted/obviously expired rows are excluded in SQL; eligibility-based
// cancellation is checked per row. Rows are scanned in exact (createdAt, id) order and filtered
// before the page boundary, so invalid rows never hide later unread messages.
const unreadSql = ` AND "readAt" IS NULL AND (kind='activity' OR (status='pending' AND "expiresAt" > $NOW))`;
export async function listInbox(req: Request, db: Sql, user: User) {
 const search = new URL(req.url).searchParams;
 const filter = (search.get('filter') ?? 'all') as InboxFilter;
 if (!(filter in filterSql)) fail(400, 'INVALID_INPUT', 'filter must be all, unread or invitations');
 const limitText = search.get('limit') ?? '20';
 const limit = Number(limitText);
 if (!/^\d+$/.test(limitText) || limit < 1 || limit > 50) fail(400, 'INVALID_INPUT', 'limit must be between 1 and 50');
 const cursor = search.get('cursor');
 // The cursor is the last returned item id; its exact database createdAt is read in SQL, never a JS millisecond value.
 if (cursor && !(await rows(db, 'SELECT id FROM inbox_items WHERE id=$1 AND "recipientId"=$2', [cursor, user.id])).length) fail(400, 'INVALID_INPUT', 'Unknown cursor');
 const now = await inboxNow(db);
 const kept: Row[] = [];
 let after = cursor; // keyset position of the last scanned row
 const batch = Math.max(limit + 1, 50);
 for (;;) {
  const params: unknown[] = [user.id];
  let where = `"recipientId"=$1`;
  if (filter === 'unread') { params.push(now); where += unreadSql.replace('$NOW', `$${params.length}`); }
  else where += filterSql[filter];
  if (after) { params.push(after); where += ` AND ("createdAt", id) < (SELECT "createdAt", id FROM inbox_items WHERE id=$${params.length})`; }
  params.push(filter === 'unread' ? batch : limit + 1);
  const scanned = await rows(db, `SELECT * FROM inbox_items WHERE ${where} ORDER BY "createdAt" DESC, id DESC LIMIT $${params.length}`, params);
  if (filter !== 'unread') { kept.push(...scanned); break; }
  const statuses = await effectiveStatuses(db, scanned.filter(r => r.kind === 'invitation'), now);
  for (const row of scanned) {
   if (row.kind === 'activity' || statuses.get(row.id) === 'pending') kept.push(row);
   if (kept.length > limit) break;
  }
  if (kept.length > limit || scanned.length < batch) break;
  after = scanned[scanned.length - 1].id;
 }
 const items = await views(db, kept.slice(0, limit), now);
 return json({ items, nextCursor: kept.length > limit ? items[items.length - 1].id : null, unreadCount: await unreadCount(db, user.id, now), asOf: now.toISOString() });
}

export async function markRead(req: Request, db: Sql, user: User, id: string) {
 await parse(req, z.object({ read: z.literal(true, { error: 'Send {"read": true}' }) }).strict());
 const item = (await rows(db, 'UPDATE inbox_items SET "readAt"=COALESCE("readAt", clock_timestamp()) WHERE id=$1 AND "recipientId"=$2 RETURNING *', [id, user.id]))[0] ?? fail(404, 'NOT_FOUND', 'Message not found');
 return json((await views(db, [item], await inboxNow(db)))[0]);
}

export async function getPreferences(db: Sql, user: User) {
 const row = (await rows(db, 'SELECT "automaticInvitations" FROM inbox_preferences WHERE "userId"=$1', [user.id]))[0];
 return json({ automaticInvitations: row ? row.automaticInvitations : true } satisfies InboxPreferences);
}
