import { z } from 'zod';
import { introductionShape } from './p2-validation';
import { expertiseSchema, technologySchema } from './p5-types';
const unique = <T>(values: T[]) => new Set(values).size === values.length;
export const topicContentSchema = z.object({ sentences: introductionShape.sentences, topics: z.array(expertiseSchema).min(1).max(3).refine(unique), technologies: z.array(technologySchema).max(6).refine(unique) }).strict();
export const publishP5Schema = z.object({ draftId: z.string().min(1), sourceHash: z.string().min(1), sentences: introductionShape.sentences }).strict();
export function normalizeGitHubUrl(value: string): string {
 if(!/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}\/?$/.test(value)) throw new Error('Use a GitHub repository root URL');
 const u = new URL(value);
 if(u.protocol !== 'https:' || u.hostname !== 'github.com' || u.port || u.username || u.password || u.search || u.hash) throw new Error('Use a public https://github.com/owner/repo repository URL');
 const path = u.pathname.replace(/\/$/, '').replace(/\.git$/, '');
 if(!/^\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(path) || path.split('/').some(p => p === '.' || p === '..')) throw new Error('Use a GitHub repository root URL');
 return `https://github.com${path}`;
}
export const githubUrlSchema = z.string().trim().transform((value,ctx) => { try { return normalizeGitHubUrl(value); } catch {ctx.addIssue({code:'custom',message:'Use a public https://github.com/owner/repo repository URL'}); return z.NEVER;} });

