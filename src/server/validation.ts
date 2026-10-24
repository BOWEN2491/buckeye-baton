import { z } from 'zod';
import type { ProjectReflection } from '../shared/types';
export const text = z.string().trim().min(1).max(10000);
const url = z.string().url().refine(value => ['http:', 'https:'].includes(new URL(value).protocol), 'Use an http or https URL');
const link = url.nullable().optional();
const optionalText = z.string().trim().max(10000);
export const emptyReflection = (): ProjectReflection => ({ progress: '', outcomes: [], problems: [], nextTeam: '', whyPaused: '', ifAgain: [], reusable: [] });
export const projectReflection = z.object({ progress: optionalText, outcomes: z.array(text).max(30), problems: z.array(z.object({ title: text.max(160), assumed: text, happened: text, changed: text }).strict()).max(30), nextTeam: optionalText, whyPaused: optionalText, ifAgain: z.array(text).max(30), reusable: z.array(z.object({ label: text.max(160), url: url.nullable() }).strict()).max(30) }).strict();
export const projectInput = z.object({ title: text.max(160), summary: text, courseOrClub: text.max(160), term: text.max(80), tags: z.array(text.max(50)).max(20), status: z.enum(['ongoing','finished','paused']).optional(), codeUrl: link, demoUrl: link, reflection: projectReflection.partial().optional() }).strict();
export const completeProject = projectInput.extend({ status: z.enum(['ongoing','finished','paused']), reflection: projectReflection }).superRefine((project, ctx) => {
 if (project.status === 'finished') {
  if (!project.reflection.outcomes.length) ctx.addIssue({ code: 'custom', path: ['reflection','outcomes'], message: 'Finished projects need at least one outcome' });
  if (!project.reflection.nextTeam) ctx.addIssue({ code: 'custom', path: ['reflection','nextTeam'], message: 'Finished projects need advice for the next team' });
 }
 if (project.status === 'paused') {
  if (!project.reflection.whyPaused) ctx.addIssue({ code: 'custom', path: ['reflection','whyPaused'], message: 'Paused projects need a reason for pausing' });
  if (!project.reflection.ifAgain.length) ctx.addIssue({ code: 'custom', path: ['reflection','ifAgain'], message: 'Paused projects need at least one suggestion for restarting' });
 }
});
export const lessonInput = z.object({ type: z.enum(['worked','pitfall','next_team']), title: text.max(160), assumed: text, happened: text, change: text, conditions: text, artifacts: z.array(z.object({label: text.max(160), url}).strict()).max(10) }).strict();
export const commentInput = z.object({body: text, kind: z.enum(['question','comment','reply']), parentId: text.nullable().optional()}).strict();
export const referralInput = z.object({questionCommentId: text, mentorId: text, reason: text}).strict();
export const adoptionInput = z.object({adoptingProjectId: text}).strict();
export const adoptionUpdate = z.object({result: z.enum(['worked','partial','failed']), note: text, artifactUrl: link}).strict();
export const replyInput = z.object({body: text}).strict();
