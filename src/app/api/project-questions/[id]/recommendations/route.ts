import { handle } from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:Request,context:{params:Promise<{id:string}>}){return handle(req,'questionRecommendations',(await context.params).id);}
