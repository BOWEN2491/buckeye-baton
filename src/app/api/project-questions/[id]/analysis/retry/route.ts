import { handle } from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req:Request,context:{params:Promise<{id:string}>}){return handle(req,'questionAnalysisRetry',(await context.params).id);}
