import type { QuestionThread } from '../shared/relay-types';
import type { OwnerAdvice, PrioritizedThread, PriorityReason, ProjectPriority, QuestionPriority } from '../shared/p3-types';

// The single source of P3 scoring, reasons and ordering (docs/P3_CONTRACT.md §2–§5).
// One asOf is captured per request; tests replace the clock, clients never supply it.
let clock = () => new Date();
export function setClock(next: (() => Date) | null) { clock = next ?? (() => new Date()); }
export const now = () => clock();

const HOUR = 3_600_000;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const hoursSince = (start: string | Date, asOf: Date) => Math.max(0, (asOf.getTime() - new Date(start).getTime()) / HOUR);
const pendingStates = new Set(['needs_referral', 'awaiting_reply']);

// pendingSince follows the shared thread order (SQL createdAt, id; deleted posts already excluded).
export function pendingSince(thread: QuestionThread) {
 let lastReply = -1;
 thread.posts.forEach((post, index) => { if (post.kind === 'mentor_reply') lastReply = index; });
 if (lastReply < 0) return thread.question.createdAt;
 const firstFollowUp = thread.posts.slice(lastReply + 1).find(post => post.kind === 'follow_up');
 return firstFollowUp?.createdAt ?? thread.question.createdAt;
}

export function questionPriority(thread: QuestionThread, asOf: Date): QuestionPriority | null {
 if (!pendingStates.has(thread.state)) return null;
 const since = pendingSince(thread);
 const waitingHours = hoursSince(since, asOf);
 const days = Math.floor(waitingHours / 24);
 const reasons: PriorityReason[] = [];
 const waitPoints = Math.min(30, 5 * days);
 if (waitPoints > 0) reasons.push({ code: 'waiting_for_reply', label: `Waiting ${plural(days, 'day')} for a reply`, points: waitPoints, questionId: thread.question.id });
 if (thread.question.dueAt) {
  const diff = new Date(thread.question.dueAt).getTime() - asOf.getTime();
  if (diff <= 0) reasons.push({ code: 'reply_overdue', label: 'Reply date passed', points: 50, questionId: thread.question.id });
  else if (diff <= 24 * HOUR) reasons.push({ code: 'reply_due_soon', label: 'Reply date within 24 hours', points: 35, questionId: thread.question.id });
  else if (diff <= 72 * HOUR) reasons.push({ code: 'reply_due_soon', label: 'Reply date within 3 days', points: 20, questionId: thread.question.id });
 }
 return { score: reasons.reduce((sum, r) => sum + r.points, 0), pendingSince: since, waitingHours, reasons, asOf: asOf.toISOString() };
}

type Scored = { thread: QuestionThread; priority: QuestionPriority };
// Highest score first; ties: pendingSince, question.createdAt, question.id ascending.
const byQuestionPriority = (a: Scored, b: Scored) => b.priority.score - a.priority.score
 || a.priority.pendingSince.localeCompare(b.priority.pendingSince)
 || a.thread.question.createdAt.localeCompare(b.thread.question.createdAt)
 || (a.thread.question.id < b.thread.question.id ? -1 : a.thread.question.id > b.thread.question.id ? 1 : 0);

export interface ProjectFacts { id: string; status: string; createdAt: string | Date }
function noPickup(project: ProjectFacts, successorCount: number, asOf: Date) {
 if (project.status !== 'paused' || successorCount > 0) return null;
 const hours = hoursSince(project.createdAt, asOf);
 return { hours, days: Math.floor(hours / 24), points: Math.min(20, 5 * Math.floor(hours / 168)) };
}

export function projectPriority(project: ProjectFacts, successorCount: number, threads: QuestionThread[], asOf: Date): { priority: ProjectPriority; scored: Scored[] } {
 const reasons: PriorityReason[] = [];
 const pickup = noPickup(project, successorCount, asOf);
 if (pickup && pickup.points > 0) reasons.push({ code: 'no_pickup', label: `Shared ${plural(pickup.days, 'day')} ago · no pickup yet`, points: pickup.points, questionId: null });
 const scored = threads.flatMap(thread => { const priority = questionPriority(thread, asOf); return priority ? [{ thread, priority }] : []; }).sort(byQuestionPriority);
 // Only the single highest question contributes, so many questions never stack up points.
 if (scored[0] && scored[0].priority.score > 0) reasons.push(...scored[0].priority.reasons);
 return { priority: { score: reasons.reduce((sum, r) => sum + r.points, 0), reasons, asOf: asOf.toISOString() }, scored };
}

export function ownerAdvice(project: ProjectFacts, successorCount: number, scored: Scored[], asOf: Date): OwnerAdvice[] {
 const advice: OwnerAdvice[] = [];
 const pickup = noPickup(project, successorCount, asOf);
 if (pickup && pickup.hours >= 14 * 24)
  advice.push({ code: 'improve_handoff', message: 'No team has picked this project up yet. Consider adding reusable materials and a clear goal for the next team.', questionId: null });
 for (const { thread, priority } of scored) if (priority.waitingHours >= 72)
  advice.push({ code: 'narrow_question', message: `“${thread.question.title}” has waited ${plural(Math.floor(priority.waitingHours / 24), 'day')}. Consider narrowing it or adding context others can reproduce in the discussion.`, questionId: thread.question.id });
 for (const { thread } of scored) if (thread.question.dueAt && new Date(thread.question.dueAt).getTime() <= asOf.getTime() + 24 * HOUR)
  advice.push({ code: 'review_reply_date', message: `“${thread.question.title}” has a reply date that has passed or is within 24 hours. The asker can extend or remove it if plans changed.`, questionId: thread.question.id });
 return advice;
}

// Workbench Priority order within one group: pending items first by score, the rest keep createdAt, id order.
export function prioritize(threads: QuestionThread[], asOf: Date): PrioritizedThread[] {
 const withPriority = threads.map(thread => ({ thread, priority: questionPriority(thread, asOf) }));
 const pending = withPriority.filter((t): t is Scored => t.priority !== null).sort(byQuestionPriority);
 const rest = withPriority.filter(t => t.priority === null);
 return [...pending, ...rest].map(({ thread, priority }) => ({ ...thread, priority }));
}
