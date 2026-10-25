import { randomUUID } from 'node:crypto';
import type { Sql } from './db';
import * as v from './validation';
import { z } from 'zod';
import * as priority from './priority';
import { fail, json, rows, one, role, parse, insert } from './http';
import type { User } from '../shared/types';
import type { QuestionState, QuestionThread, RelayLink, RelayProjectDetail, Workbench } from '../shared/relay-types';

type Row = Record<string, any>;
interface Storage extends Sql { transaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> }
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : value as string;
const isUniqueViolation = (error: unknown) => (error as { code?: string })?.code === '23505';

async function link(sql: Sql, relation: Row, projectId: string): Promise<RelayLink> {
 const project = await one(sql, 'projects', projectId);
 return { project: project as never, owner: await one(sql, 'users', project.ownerId) as never, pickupType: relation.pickupType, goal: relation.goal, pickedUpAt: iso(relation.createdAt) };
}

export async function projectDetail(sql: Sql, id: string): Promise<RelayProjectDetail> {
 const project = await one(sql, 'projects', id);
 const lessons = await rows(sql, 'SELECT * FROM lessons WHERE "projectId"=$1 ORDER BY "createdAt"', [id]);
 const source = (await rows(sql, 'SELECT * FROM project_relations WHERE "projectId"=$1', [id]))[0];
 const successors = await rows(sql, 'SELECT * FROM project_relations WHERE "sourceProjectId"=$1 ORDER BY "createdAt", id', [id]);
 const successorLinks: RelayLink[] = [];
 for (const relation of successors) successorLinks.push(await link(sql, relation, relation.projectId));
 return { project: project as never, lessons: lessons as never, source: source ? await link(sql, source, source.sourceProjectId) : null, successors: successorLinks };
}

// Creates the successor project and its relation in one transaction; (ownerId, requestId) makes retries idempotent.
export async function pickup(req: Request, db: Storage, user: User, sourceId: string) {
 role(user, 'student');
 const input = await parse(req, v.pickupInput);
 const attempt = () => db.transaction(async sql => {
  const existing = (await rows(sql, 'SELECT * FROM project_relations WHERE "ownerId"=$1 AND "requestId"=$2', [user.id, input.requestId]))[0];
  if (existing) return { existing };
  const source = (await rows(sql, 'SELECT * FROM projects WHERE id=$1 FOR SHARE', [sourceId]))[0] ?? fail(404, 'NOT_FOUND', 'Record not found');
  if (source.status === 'ongoing') fail(409, 'SOURCE_ONGOING', 'Only Finished or Paused projects can be picked up');
  const projectId = randomUUID();
  await insert(sql, 'projects', { id: projectId, ownerId: user.id, title: input.title, summary: input.goal, courseOrClub: source.courseOrClub, term: source.term, tags: source.tags, codeUrl: null, demoUrl: null, status: 'ongoing', reflection: v.emptyReflection() });
  await insert(sql, 'project_relations', { id: randomUUID(), sourceProjectId: sourceId, projectId, ownerId: user.id, requestId: input.requestId, pickupType: input.pickupType, title: input.title, goal: input.goal });
  return { created: await projectDetail(sql, projectId) };
 });
 let result;
 try { result = await attempt(); }
 catch (error) { if (!isUniqueViolation(error)) throw error; result = await attempt(); } // a concurrent retry won the insert
 if (result.created) return json(result.created, 201);
 const e = result.existing!;
 if (e.sourceProjectId !== sourceId || e.pickupType !== input.pickupType || e.title !== input.title || e.goal !== input.goal)
  fail(409, 'REQUEST_CONFLICT', 'This pickup request was already submitted with different details. Reload the form to start a new pickup.');
 return json(await projectDetail(db, e.projectId), 200);
}

function threadState(question: Row, posts: Row[], referral: Row | undefined): QuestionState {
 if (!question.wantsMentor) return 'discussion';
 if (!referral) return 'needs_referral';
 let lastReply = -1, lastFollowUp = -1;
 posts.forEach((post, index) => { if (post.kind === 'mentor_reply') lastReply = index; if (post.kind === 'follow_up') lastFollowUp = index; });
 return lastReply < 0 || lastFollowUp > lastReply ? 'awaiting_reply' : 'replied';
}

export async function threads(sql: Sql, where: string, params: unknown[]): Promise<QuestionThread[]> {
 const questions = await rows(sql, `SELECT * FROM project_questions WHERE ${where} ORDER BY "createdAt", id`, params);
 if (!questions.length) return [];
 const ids = questions.map(q => q.id);
 // Posts keep database order (microsecond timestamp, then id); state is derived from this order.
 const posts = await rows(sql, 'SELECT * FROM project_posts WHERE "questionId" = ANY($1::text[]) AND "deletedAt" IS NULL ORDER BY "createdAt", id', [ids]);
 const referrals = new Map((await rows(sql, 'SELECT * FROM project_referrals WHERE "questionId" = ANY($1::text[])', [ids])).map(r => [r.questionId, r]));
 const users = new Map((await rows(sql, 'SELECT * FROM users')).map(u => [u.id, u as User]));
 return questions.map(q => {
  const own = posts.filter(p => p.questionId === q.id);
  const referral = referrals.get(q.id);
  return {
   question: { id: q.id, projectId: q.projectId, authorId: q.authorId, title: q.title, body: q.body, wantsMentor: q.wantsMentor, dueAt: q.dueAt === null ? null : iso(q.dueAt), createdAt: iso(q.createdAt) },
   author: users.get(q.authorId)!,
   posts: own.map(p => ({ id: p.id, questionId: p.questionId, authorId: p.authorId, body: p.body, kind: p.kind, createdAt: iso(p.createdAt), author: users.get(p.authorId)! })),
   referral: referral ? { id: referral.id, questionId: referral.questionId, staffId: referral.staffId, mentorId: referral.mentorId, reason: referral.reason, createdAt: iso(referral.createdAt), staff: users.get(referral.staffId)!, mentor: users.get(referral.mentorId)! } : null,
   state: threadState(q, own, referral),
  };
 });
}
const thread = async (sql: Sql, id: string) => (await threads(sql, 'id=$1', [id]))[0] ?? fail(404, 'NOT_FOUND', 'Question not found');

export async function listQuestions(db: Sql, projectId: string) {
 await one(db, 'projects', projectId);
 return json(await threads(db, '"projectId"=$1', [projectId]));
}

export async function askQuestion(req: Request, db: Sql, user: User, projectId: string) {
 role(user, 'student');
 await one(db, 'projects', projectId);
 const input = await parse(req, v.questionInput);
 const id = randomUUID();
 await insert(db, 'project_questions', { id, projectId, authorId: user.id, title: input.title, body: input.body, wantsMentor: input.wantsMentor, dueAt: input.dueAt });
 return json(await thread(db, id), 201);
}

export async function addPost(req: Request, db: Sql, user: User, questionId: string) {
 const question = (await rows(db, 'SELECT * FROM project_questions WHERE id=$1', [questionId]))[0] ?? fail(404, 'NOT_FOUND', 'Question not found');
 const input = await parse(req, v.postInput);
 if (input.kind === 'follow_up' && question.authorId !== user.id) fail(403, 'FORBIDDEN', 'Only the person who asked this question can post a follow-up');
 if (input.kind === 'mentor_reply') {
  const referral = (await rows(db, 'SELECT * FROM project_referrals WHERE "questionId"=$1', [questionId]))[0];
  if (!referral || referral.mentorId !== user.id) fail(403, 'FORBIDDEN', 'Only the referred mentor can post a mentor reply');
 }
 await insert(db, 'project_posts', { id: randomUUID(), questionId, authorId: user.id, body: input.body, kind: input.kind });
 return json(await thread(db, questionId), 201);
}

export async function refer(req: Request, db: Sql, user: User, questionId: string) {
 role(user, 'staff');
 const question = (await rows(db, 'SELECT * FROM project_questions WHERE id=$1', [questionId]))[0] ?? fail(404, 'NOT_FOUND', 'Question not found');
 const input = await parse(req, v.projectReferralInput);
 if (!question.wantsMentor) fail(409, 'MENTOR_NOT_REQUESTED', 'The asker did not request a mentor for this open discussion');
 const mentor = (await rows(db, 'SELECT * FROM users WHERE id=$1', [input.mentorId]))[0];
 if (mentor?.role !== 'mentor') fail(400, 'INVALID_INPUT', 'Choose a mentor from the directory');
 const alreadyReferred = () => fail(409, 'ALREADY_REFERRED', 'Already referred. Another Staff member referred this question. Nothing was sent.');
 // The unique questionId constraint settles concurrent referrals; the pre-check only gives a faster answer.
 if ((await rows(db, 'SELECT id FROM project_referrals WHERE "questionId"=$1', [questionId])).length) alreadyReferred();
 try { await insert(db, 'project_referrals', { id: randomUUID(), questionId, staffId: user.id, mentorId: input.mentorId, reason: input.reason }); }
 catch (error) { if (isUniqueViolation(error)) alreadyReferred(); throw error; }
 return json(await thread(db, questionId), 201);
}

export async function deletePost(db: Storage, user: User, postId: string) {
 return json(await db.transaction(async sql => {
  const post = (await rows(sql, 'SELECT post.*, project."ownerId" AS "projectOwnerId" FROM project_posts post JOIN project_questions question ON question.id=post."questionId" JOIN projects project ON project.id=question."projectId" WHERE post.id=$1 FOR UPDATE OF post', [postId]))[0] ?? fail(404, 'NOT_FOUND', 'Comment not found');
  if (post.authorId !== user.id && post.projectOwnerId !== user.id)
   fail(403, 'FORBIDDEN', 'Only the comment author or project owner can delete this comment');
  // Keep the original record for history, but exclude it from discussions and queue state.
  if (!post.deletedAt) await sql.query('UPDATE project_posts SET "deletedAt"=clock_timestamp(), "deletedBy"=$2 WHERE id=$1', [postId, user.id]);
  return thread(sql, post.questionId);
 }));
}

// sort=undefined keeps the original Workbench response; 'priority' adds per-thread priority (P3).
export async function workbench(db: Sql, user: User, sort?: 'priority' | 'oldest') {
 const empty: Workbench = { needsReferral: [], referred: [], awaitingReply: [], replied: [] };
 let groups: Workbench;
 if (user.role === 'staff') {
  const all = await threads(db, '"wantsMentor"', []);
  groups = { ...empty, needsReferral: all.filter(t => t.state === 'needs_referral'), referred: all.filter(t => t.referral) };
 } else if (user.role === 'mentor') {
  const mine = await threads(db, 'id IN (SELECT "questionId" FROM project_referrals WHERE "mentorId"=$1)', [user.id]);
  groups = { ...empty, awaitingReply: mine.filter(t => t.state === 'awaiting_reply'), replied: mine.filter(t => t.state === 'replied') };
 } else return fail(403, 'FORBIDDEN', 'The workbench is for Staff and Mentors');
 if (sort !== 'priority') return json(groups);
 const asOf = priority.now();
 return json({ needsReferral: priority.prioritize(groups.needsReferral, asOf), referred: priority.prioritize(groups.referred, asOf), awaitingReply: priority.prioritize(groups.awaitingReply, asOf), replied: priority.prioritize(groups.replied, asOf) });
}

// Batch facts for P3 scoring: successor counts over all relations and shared threads per project.
async function priorityFacts(db: Sql, projectIds: string[]) {
 const counts = new Map((await rows(db, 'SELECT "sourceProjectId" AS id, count(*)::int AS n FROM project_relations WHERE "sourceProjectId" = ANY($1::text[]) GROUP BY "sourceProjectId"', [projectIds])).map(r => [r.id, r.n as number]));
 const byProject = new Map<string, QuestionThread[]>();
 for (const t of await threads(db, '"projectId" = ANY($1::text[])', [projectIds])) byProject.set(t.question.projectId, [...(byProject.get(t.question.projectId) ?? []), t]);
 return { successors: (id: string) => counts.get(id) ?? 0, threadsOf: (id: string) => byProject.get(id) ?? [] };
}

// Recommended: input rows arrive in Newest order (createdAt desc, id asc at DB precision); a stable
// sort by score keeps that order for ties.
export async function recommend<T extends Record<string, any>>(db: Sql, projects: T[]) {
 if (!projects.length) return [];
 const asOf = priority.now();
 const facts = await priorityFacts(db, projects.map(p => p.id));
 return projects.map(p => ({ ...p, priority: priority.projectPriority(p as never, facts.successors(p.id), facts.threadsOf(p.id), asOf).priority }))
  .sort((a, b) => b.priority.score - a.priority.score);
}

export async function projectPriorityDetail(db: Sql, id: string) {
 const project = await one(db, 'projects', id);
 const asOf = priority.now();
 const facts = await priorityFacts(db, [id]);
 const list = facts.threadsOf(id);
 const { priority: score, scored } = priority.projectPriority(project as never, facts.successors(id), list, asOf);
 return json({ projectId: id, priority: score, questions: list.map(t => ({ questionId: t.question.id, priority: priority.questionPriority(t, asOf) })), advice: priority.ownerAdvice(project as never, facts.successors(id), scored, asOf) });
}

// Only the asker may change or clear the hoped-for reply date; nothing else on the question changes.
export async function updateDueAt(req: Request, db: Storage, user: User, questionId: string) {
 const question = (await rows(db, 'SELECT * FROM project_questions WHERE id=$1', [questionId]))[0] ?? fail(404, 'NOT_FOUND', 'Question not found');
 if (user.role !== 'student' || question.authorId !== user.id) fail(403, 'FORBIDDEN', 'Only the student who asked this question can change its reply date');
 const input = await parse(req, z.object({ dueAt: v.dueAt }).strict());
 return json(await db.transaction(async sql => {
  const current = (await rows(sql, 'SELECT "authorId" FROM project_questions WHERE id=$1 FOR UPDATE', [questionId]))[0] ?? fail(404, 'NOT_FOUND', 'Question not found');
  if (current.authorId !== user.id) fail(403, 'FORBIDDEN', 'Only the student who asked this question can change its reply date');
  await sql.query('UPDATE project_questions SET "dueAt"=$2 WHERE id=$1', [questionId, input.dueAt]);
  return thread(sql, questionId);
 }));
}

// Staff-wide Awaiting reply counts; same thread state as the Mentor workbench above.
export async function mentorWorkload(db: Sql, user: User) {
 role(user, 'staff');
 const mentors = await rows(db, "SELECT * FROM users WHERE role='mentor' ORDER BY name, id");
 const referred = await threads(db, 'id IN (SELECT "questionId" FROM project_referrals)', []);
 const counts = new Map<string, number>();
 for (const t of referred) if (t.state === 'awaiting_reply') counts.set(t.referral!.mentorId, (counts.get(t.referral!.mentorId) ?? 0) + 1);
 return json({ items: mentors.map(m => ({ mentor: m, awaitingReply: counts.get(m.id) ?? 0 })), asOf: new Date().toISOString() });
}
