import { handle } from '@/server/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) { const { id } = await context.params; return handle(req, 'adoptions', id); }
