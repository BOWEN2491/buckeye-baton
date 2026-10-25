import { z } from 'zod';
import type { User } from './types';

// Frozen P5 wire contract. Labels and validators must use these same enums.
export const EXPERTISE = ['front-end', 'back-end', 'algorithm', 'database', 'brainstorming'] as const;
export type Expertise = typeof EXPERTISE[number];
export const TECHNOLOGIES = ['javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'react', 'nextjs', 'vue', 'nodejs', 'express', 'spring-boot', 'fastapi', 'django', 'postgresql', 'mysql', 'sqlite', 'mongodb', 'redis', 'docker', 'aws'] as const;
export type Technology = typeof TECHNOLOGIES[number];
export const AI_STATUSES = ['pending', 'processing', 'ready', 'failed', 'stale'] as const;
export type AIStatus = typeof AI_STATUSES[number];
export interface AIError { code: string; message: string }
export const expertiseSchema = z.enum(EXPERTISE);
export const technologySchema = z.enum(TECHNOLOGIES);
export const expertiseInputSchema = z.object({ expertise: z.array(expertiseSchema).max(5).refine(values => new Set(values).size === values.length, 'Choose each expertise only once') }).strict();
export interface ExpertiseProfile { expertise: Expertise[] }

export const domainAssessmentSchema = z.object({ score: z.number().min(0).max(100), reason: z.string().trim().min(1).max(600) }).strict();
export const expertiseScoresSchema = z.object({
  'front-end': domainAssessmentSchema,
  'back-end': domainAssessmentSchema,
  algorithm: domainAssessmentSchema,
  database: domainAssessmentSchema,
  brainstorming: domainAssessmentSchema,
}).strict();
export type ExpertiseScores = z.infer<typeof expertiseScoresSchema>;
export interface MentorCandidate {
  mentor: User;
  matchedExpertise: Expertise[];
  score: number;
  reason: string;
  awaitingReply: number;
  lowRelevance: boolean;
}
export interface QuestionRecommendations {
  status: AIStatus | null;
  error: AIError | null;
  scores: ExpertiseScores | null;
  candidates: MentorCandidate[];
  asOf: string;
}

export interface GitHubSourceFile { path: string; truncated: boolean }
export interface GitHubSources {
  repoUrl: string;
  commit: string | null;
  readAt: string;
  files: GitHubSourceFile[];
  missingREADME: boolean;
  // Non-live evidence must never be presented as an actual GitHub/model read.
  evidence: 'github' | 'mock' | 'simulation';
}
export interface TopicContent { sentences: string[]; topics: Expertise[]; technologies: Technology[] }
export interface P5IntroductionDraft extends TopicContent {
  id: string;
  sourceHash: string;
  generatedAt: string;
  version: 5;
  sources: GitHubSources;
  tags: string[];
}
export interface P5PublishedIntroduction extends TopicContent {
  reviewedAt: string;
  stale: boolean;
  version: 5;
  sources: GitHubSources;
  tags: string[];
}
export interface P5IntroductionEditor {
  sourceHash: string;
  draft: P5IntroductionDraft | null;
  published: P5PublishedIntroduction | null;
  status: AIStatus | null;
  error: AIError | null;
  sources: GitHubSources | null;
}
// Labels are copied from the identified server draft, never accepted from callers.
export interface P5PublishIntroductionInput { draftId: string; sourceHash: string; sentences: string[] }
