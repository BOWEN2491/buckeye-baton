import { z } from 'zod';

// One schema for model output, owner confirmation and the client editor.
const sentenceCount = (value: string) => [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(value)].filter(s => s.segment.trim()).length;
const sentence = z.string({ error: 'Each sentence must be text' }).trim()
  .min(1, 'Sentences cannot be empty')
  .max(280, 'Each sentence can be at most 280 characters')
  .refine(value => sentenceCount(value) === 1, 'Write exactly one sentence per line');
const tag = z.string({ error: 'Each tag must be text' }).trim().toLowerCase()
  .min(1, 'Tags cannot be empty')
  .max(32, 'Each tag can be at most 32 characters')
  .regex(/^[^\r\n]+$/, 'Tags cannot contain line breaks');
export const introductionShape = {
  sentences: z.array(sentence, { error: 'Provide sentences' }).min(1, 'Write at least one sentence').max(3, 'Use at most three sentences')
    .refine(list => list.join(' ').length <= 600, 'The introduction can be at most 600 characters'),
  tags: z.array(tag, { error: 'Provide tags' }).max(12, 'Use at most six tags')
    .transform(list => [...new Set(list)])
    .refine(list => list.length >= 1, 'Add at least one tag')
    .refine(list => list.length <= 6, 'Use at most six tags'),
};
export const introductionContent = z.object(introductionShape).strict();
export const publishIntroductionInput = z.object({ ...introductionShape, draftId: z.string({ error: 'Missing draft' }).min(1, 'Missing draft'), sourceHash: z.string({ error: 'Missing source version' }).min(1, 'Missing source version') }).strict();
