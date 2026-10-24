import { handle } from '@/server/api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(req: Request) { return handle(req, 'projects'); }
export async function POST(req: Request) { return handle(req, 'projects'); }
