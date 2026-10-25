import { handle } from '@/server/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The model call can take up to 30 seconds.
export const maxDuration = 40;
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handle(req, 'introductionGenerate', id); }
