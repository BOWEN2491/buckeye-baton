import { randomUUID } from 'node:crypto';
import type { Sql } from './db';
import { database } from './db';
import { z } from 'zod';
import * as v from './validation';
import type { User } from '../shared/types';
export class ApiFailure extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
const fail = (status: number, code: string, message: string): never => { throw new ApiFailure(status,code,message); };
const json = (data: unknown, status = 200) => Response.json({data}, {status});
async function rows(sql: Sql, query: string, params: unknown[] = []) { return (await sql.query(query, params)).rows as Record<string, any>[]; }
async function one(sql: Sql, table: string, id: string) { const row = (await rows(sql, `SELECT * FROM ${table} WHERE id=$1`,[id]))[0]; return row ?? fail(404,'NOT_FOUND','Record not found'); }
async function actor(req: Request, sql: Sql): Promise<User> { const id = req.headers.get('x-demo-user-id'); if (!id) fail(401,'UNAUTHENTICATED','Choose a demo identity'); const user = (await rows(sql,'SELECT * FROM users WHERE id=$1',[id]))[0]; return user as User ?? fail(401,'UNAUTHENTICATED','Unknown demo identity'); }
function role(user: User, expected: string) { if (user.role !== expected) fail(403,'FORBIDDEN',`This action requires ${expected} role`); }
async function ownProject(sql: Sql, id: string, user: User) { const p = await one(sql,'projects',id); role(user,'student'); if(p.ownerId !== user.id) fail(403,'FORBIDDEN','Only the project owner can edit this project'); return p; }
async function parse(req: Request, schema: z.ZodType) { let body; try {body = await req.json();} catch {fail(400,'INVALID_INPUT','Malformed JSON body');} const parsed=schema.safeParse(body); if(!parsed.success) fail(400,'INVALID_INPUT',parsed.error.issues[0]?.message ?? 'Invalid input'); return parsed.data as Record<string, any>; }
async function insert(sql: Sql, table: string, data: Record<string, any>, conflict = '') { const entries=Object.entries(data); const keys=entries.map(([key])=>`"${key}"`).join(','); const args=entries.map(([,value]) => Array.isArray(value) ? JSON.stringify(value) : value); return (await rows(sql,`INSERT INTO ${table} (${keys}) VALUES (${args.map((_,i)=>`$${i+1}`).join(',')}) ${conflict} RETURNING *`,args))[0]; }
async function update(sql: Sql, table: string, id: string, data: Record<string,any>) { const entries=Object.entries(data); if(!entries.length) fail(400,'INVALID_INPUT','Provide at least one field'); return (await rows(sql,`UPDATE ${table} SET ${entries.map(([k],i)=>`"${k}"=$${i+1}`).join(',')}, "updatedAt"=now() WHERE id=$${entries.length+1} RETURNING *`,[...entries.map(([,val])=>Array.isArray(val)?JSON.stringify(val):val),id]))[0]; }
async function enrichAdoptions(sql: Sql, records: Record<string,any>[]): Promise<Record<string, any>[]> { return Promise.all(records.map(async a=>({...a,project:await one(sql,'projects',a.adoptingProjectId),author:await one(sql,'users',a.authorId)}))); }
export async function handle(req: Request, resource: string, id?: string): Promise<Response> {
 try {
  const db=await database(); const method=req.method; const search=new URL(req.url).searchParams;
  if(resource==='health') { await db.query('SELECT 1'); return json({status:'ok',databaseMode:db.mode,demoIdentity:true}); }
  if(resource==='users'&&method==='GET') return json(await rows(db,'SELECT * FROM users ORDER BY name'));
  if(resource==='projects'&&method==='GET') {
   const q=search.get('q')??''; const status=search.get('status'); if(status&&!['ongoing','finished','paused'].includes(status)) fail(400,'INVALID_INPUT','Invalid project status');
   return json(await rows(db,'SELECT * FROM projects WHERE (title ILIKE $1 OR summary ILIKE $1) AND ($2::text IS NULL OR status=$2) ORDER BY "createdAt" DESC',[`%${q}%`,status]));
  }
  if(resource==='project'&&method==='GET') {
   const saved=await rows(db,'SELECT * FROM adoptions WHERE "adoptingProjectId"=$1 ORDER BY "updatedAt" DESC',[id]);
   const adoptedLessons=await Promise.all(saved.map(async adoption=>{const lesson=await one(db,'lessons',adoption.lessonId);return {adoption,lesson,sourceProject:await one(db,'projects',lesson.projectId)};}));
   return json({project:await one(db,'projects',id!),lessons:await rows(db,'SELECT * FROM lessons WHERE "projectId"=$1 ORDER BY "createdAt"',[id]),downstreamAdoptions:await enrichAdoptions(db,await rows(db,'SELECT a.* FROM adoptions a JOIN lessons l ON a."lessonId"=l.id WHERE l."projectId"=$1 AND a.result IS NOT NULL ORDER BY a."updatedAt" DESC',[id])),adoptedLessons});
  }
  if(resource==='lessons'&&method==='GET') {const q=`%${search.get('q')??''}%`;return json(await rows(db,'SELECT * FROM lessons WHERE title ILIKE $1 OR assumed ILIKE $1 OR happened ILIKE $1 OR change ILIKE $1 OR conditions ILIKE $1 ORDER BY "createdAt" DESC',[q]));}
  if(resource==='lesson'&&method==='GET') {
   const lesson=await one(db,'lessons',id!); const adoptions=await enrichAdoptions(db,await rows(db,'SELECT * FROM adoptions WHERE "lessonId"=$1 ORDER BY "updatedAt" DESC',[id]));
   const stats={total:0,worked:0,partial:0,failed:0}; for(const a of adoptions) {if(a.result) {stats.total++; stats[a.result as 'worked'|'partial'|'failed']++;}}
   return json({lesson,project:await one(db,'projects',lesson.projectId),adoptions,stats});
  }
  if(resource==='comments'&&method==='GET') {
   await one(db,'lessons',id!); const comments=await rows(db,'SELECT * FROM comments WHERE "lessonId"=$1 ORDER BY "createdAt", id',[id]); const referrals=await rows(db,'SELECT * FROM referrals WHERE "lessonId"=$1 ORDER BY "createdAt"',[id]);
   return json({comments:await Promise.all(comments.map(async c=>({...c,author:await one(db,'users',c.authorId)}))),referrals:await Promise.all(referrals.map(async r=>({...r,mentor:await one(db,'users',r.mentorId),staff:await one(db,'users',r.staffId)})))});
  }
  const user=await actor(req,db);
  if(resource==='projects'&&method==='POST') {role(user,'student'); return json(await insert(db,'projects',{id:randomUUID(),ownerId:user.id,codeUrl:null,demoUrl:null,...await parse(req,v.projectInput)}),201);}
  if(resource==='project'&&method==='PATCH') {await ownProject(db,id!,user);return json(await update(db,'projects',id!,await parse(req,v.projectInput.partial())));}
  if(resource==='projectLessons'&&method==='POST') {await ownProject(db,id!,user);return json(await insert(db,'lessons',{id:randomUUID(),projectId:id,authorId:user.id,...await parse(req,v.lessonInput)}),201);}
  if(resource==='lesson'&&method==='PATCH') {const lesson=await one(db,'lessons',id!);await ownProject(db,lesson.projectId,user);return json(await update(db,'lessons',id!,await parse(req,v.lessonInput.partial())));}
  if(resource==='comments'&&method==='POST') {
   await one(db,'lessons',id!);const data=await parse(req,v.commentInput);const parentId=data.parentId??null;
   if(data.kind==='reply'&&!parentId) fail(400,'INVALID_INPUT','A reply needs a parent comment');
   if(data.kind!=='reply'&&parentId) fail(400,'INVALID_INPUT','Only replies can have a parent');
   if(parentId) {const parent=await one(db,'comments',parentId);if(parent.lessonId!==id)fail(400,'INVALID_INPUT','Parent must belong to this lesson');}
   return json(await insert(db,'comments',{id:randomUUID(),lessonId:id,authorId:user.id,...data,parentId,referralId:null}),201);
  }
  if(resource==='referrals'&&method==='POST') {
   role(user,'staff');const data=await parse(req,v.referralInput);const question=await one(db,'comments',data.questionCommentId);if(question.kind!=='question')fail(400,'INVALID_INPUT','Only a question can be referred');const mentor=await one(db,'users',data.mentorId);if(mentor.role!=='mentor')fail(400,'INVALID_INPUT','Select a mentor');
   return json(await insert(db,'referrals',{id:randomUUID(),lessonId:question.lessonId,staffId:user.id,...data,status:'pending'}),201);
  }
  if(resource==='referralReply'&&method==='POST') {
   role(user,'mentor');const data=await parse(req,v.replyInput);
   const reply=await db.transaction(async sql=> { const r=(await rows(sql,'SELECT * FROM referrals WHERE id=$1 FOR UPDATE',[id]))[0]??fail(404,'NOT_FOUND','Referral not found');if(r.mentorId!==user.id)fail(403,'FORBIDDEN','Only the assigned mentor can complete this referral');if(r.status==='completed')fail(409,'CONFLICT','This referral has already been answered');
    const comment=await insert(sql,'comments',{id:randomUUID(),lessonId:r.lessonId,authorId:user.id,kind:'reply',body:data.body,parentId:r.questionCommentId,referralId:r.id});await sql.query("UPDATE referrals SET status='completed' WHERE id=$1",[id]);return comment;});return json(reply,201);
  }
  if(resource==='adoptions'&&method==='POST') {
   role(user,'student');const data=await parse(req,v.adoptionInput);const lesson=await one(db,'lessons',id!);await ownProject(db,data.adoptingProjectId,user);if(lesson.projectId===data.adoptingProjectId)fail(400,'INVALID_INPUT','Choose a different project from the source project');
   return json(await insert(db,'adoptions',{id:randomUUID(),lessonId:id,adoptingProjectId:data.adoptingProjectId,authorId:user.id,result:null,note:'',artifactUrl:null},'ON CONFLICT ("lessonId","adoptingProjectId") DO UPDATE SET "lessonId"=EXCLUDED."lessonId"'),201);
  }
  if(resource==='adoption'&&method==='PATCH') {const adoption=await one(db,'adoptions',id!);await ownProject(db,adoption.adoptingProjectId,user);const data=await parse(req,v.adoptionUpdate);return json(await update(db,'adoptions',id!,{...data,artifactUrl:data.artifactUrl??null}));}
  return fail(405,'METHOD_NOT_ALLOWED','Unsupported operation');
 } catch(error) {
  if(error instanceof ApiFailure)return Response.json({error:{code:error.code,message:error.message}},{status:error.status});
  if((error as {code?:string}).code==='23505')return Response.json({error:{code:'CONFLICT',message:'This record already exists'}},{status:409});
  console.error('API request failed',error instanceof Error?error.message:'Unknown failure');return Response.json({error:{code:'SERVER_ERROR',message:'Unable to complete request. Check server database configuration.'}},{status:500});
 }
}
