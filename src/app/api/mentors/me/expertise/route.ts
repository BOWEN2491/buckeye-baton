import { handle } from '@/server/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>handle(req,'mentorExpertise');
export const PATCH=(req:Request)=>handle(req,'mentorExpertise');
