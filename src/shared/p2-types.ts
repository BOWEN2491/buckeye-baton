import type { Project, User } from './types';

// P2 contract (docs/P2_CONTRACT.md). Dates are ISO UTC strings.
export interface IntroductionContent { sentences: string[]; tags: string[] }
export type IntroductionDraft = import('./p5-types').P5IntroductionDraft;
export type PublishedIntroduction = import('./p5-types').P5PublishedIntroduction;
export type IntroductionEditor = import('./p5-types').P5IntroductionEditor;
export type PublishIntroductionInput = import('./p5-types').P5PublishIntroductionInput;
export interface BrowseProject extends Project { introduction: PublishedIntroduction | null }
export interface MentorWorkload { mentor: User; awaitingReply: number }
export interface MentorWorkloadResult { items: MentorWorkload[]; asOf: string }
