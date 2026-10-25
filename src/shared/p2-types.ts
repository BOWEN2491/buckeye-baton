import type { Project, User } from './types';

// P2 contract (docs/P2_CONTRACT.md). Dates are ISO UTC strings.
export interface IntroductionContent { sentences: string[]; tags: string[] }
export interface IntroductionDraft extends IntroductionContent { id: string; sourceHash: string; generatedAt: string }
export interface PublishedIntroduction extends IntroductionContent { reviewedAt: string; stale: boolean }
export interface IntroductionEditor { sourceHash: string; draft: IntroductionDraft | null; published: PublishedIntroduction | null }
export interface PublishIntroductionInput extends IntroductionContent { draftId: string; sourceHash: string }
export interface BrowseProject extends Project { introduction: PublishedIntroduction | null }
export interface MentorWorkload { mentor: User; awaitingReply: number }
export interface MentorWorkloadResult { items: MentorWorkload[]; asOf: string }
