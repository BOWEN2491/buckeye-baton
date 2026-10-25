import type { BrowseProject } from './p2-types';
import type { QuestionThread } from './relay-types';

// P3 contract (docs/P3_CONTRACT.md). Deterministic server rules; points are product rules, not probabilities.
export type PriorityReasonCode = 'no_pickup' | 'waiting_for_reply' | 'reply_due_soon' | 'reply_overdue';
export interface PriorityReason { code: PriorityReasonCode; label: string; points: number; questionId: string | null }
export interface QuestionPriority { score: number; pendingSince: string; waitingHours: number; reasons: PriorityReason[]; asOf: string }
export interface ProjectPriority { score: number; reasons: PriorityReason[]; asOf: string }
export interface RecommendedProject extends BrowseProject { priority: ProjectPriority }
export interface PrioritizedThread extends QuestionThread { priority: QuestionPriority | null }
export interface PrioritizedWorkbench { needsReferral: PrioritizedThread[]; referred: PrioritizedThread[]; awaitingReply: PrioritizedThread[]; replied: PrioritizedThread[] }
export type AdviceCode = 'improve_handoff' | 'narrow_question' | 'review_reply_date';
export interface OwnerAdvice { code: AdviceCode; message: string; questionId: string | null }
export interface ProjectPriorityDetail {
  projectId: string;
  priority: ProjectPriority;
  questions: { questionId: string; priority: QuestionPriority | null }[];
  advice: OwnerAdvice[];
}
export type ProjectSort = 'recommended' | 'newest';
export type WorkbenchSort = 'priority' | 'oldest';
