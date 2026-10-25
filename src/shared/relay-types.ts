import type { Lesson, Project, User } from './types';

// P1 relay contract (docs/P1_CONTRACT.md). Dates are ISO UTC strings.
export type PickupType = 'reproduce' | 'continue' | 'improve';
export const pickupTypes: PickupType[] = ['reproduce', 'continue', 'improve'];
export interface PickupInput { requestId: string; pickupType: PickupType; title: string; goal: string; codeUrl: string }
export interface RelayLink { project: Project; owner: User; pickupType: PickupType; goal: string; pickedUpAt: string }
export interface RelayProjectDetail { project: Project; lessons: Lesson[]; source: RelayLink | null; successors: RelayLink[] }

export type ProjectPostKind = 'comment' | 'follow_up' | 'mentor_reply';
export type QuestionState = 'discussion' | 'needs_referral' | 'awaiting_reply' | 'replied';
export interface ProjectQuestion { id: string; projectId: string; authorId: string; title: string; body: string; wantsMentor: boolean; dueAt: string | null; createdAt: string }
export interface ProjectPost { id: string; questionId: string; authorId: string; body: string; kind: ProjectPostKind; createdAt: string }
export interface ProjectReferral { id: string; questionId: string; staffId: string; mentorId: string; reason: string; createdAt: string }
export interface QuestionThread {
  question: ProjectQuestion;
  author: User;
  posts: (ProjectPost & { author: User })[];
  referral: (ProjectReferral & { staff: User; mentor: User }) | null;
  state: QuestionState;
}
export interface Workbench { needsReferral: QuestionThread[]; referred: QuestionThread[]; awaitingReply: QuestionThread[]; replied: QuestionThread[] }

export interface QuestionInput { title: string; body: string; wantsMentor: boolean; dueAt: string | null }
export interface PostInput { body: string; kind: ProjectPostKind }
export interface ProjectReferralInput { mentorId: string; reason: string }
