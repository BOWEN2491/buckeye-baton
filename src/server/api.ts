import * as recommendations from './recommendations';
import { enqueueProject, enqueueQuestion } from './ai-jobs';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { database } from './db';
import * as v from './validation';
import { ApiFailure, fail, json, rows, one, actor, role, ownProject, parse, validateProject, insert, update } from './http';
import * as relay from './relay';
import * as intro from './introductions';
import * as inbox from './inbox';
import * as invitations from './invitations';
export { ApiFailure };
// An absent sort keeps the original response; any present but unsupported value (even empty) is rejected.
function sortParam<T extends string>(search: URLSearchParams, allowed: T[]): T | undefined {
 if(!search.has('sort')) return undefined;
 const value=search.get('sort') as T;
 return allowed.includes(value)?value:fail(400,'INVALID_INPUT',`sort must be one of: ${allowed.join(', ')}`);
}
export async function handle(req: Request, resource: string, id?: string): Promise<Response> {
 try {
  if(resource==='adoptions'||resource==='adoption') fail(410,'FEATURE_RETIRED','Lesson adoption has been retired. Experience is now part of the project.');
  const db=await database(); const method=req.method; const search=new URL(req.url).searchParams;
  if(resource==='health') { await db.query('SELECT 1'); return json({status:'ok',databaseMode:db.mode,demoIdentity:true}); }
  if(resource==='users'&&method==='GET') return json(await rows(db,'SELECT * FROM users ORDER BY name'));
  if(resource==='projects'&&method==='GET') {
   const q=search.get('q')??''; const status=search.get('status'); if(status&&!['ongoing','finished','paused'].includes(status)) fail(400,'INVALID_INPUT','Invalid project status');
   const sort=sortParam(search,['recommended','newest']);
   const browse=await intro.browseProjects(db,await rows(db,'SELECT * FROM projects WHERE (title ILIKE $1 OR summary ILIKE $1) AND ($2::text IS NULL OR status=$2) ORDER BY "createdAt" DESC, id ASC',[`%${q}%`,status]));
   return json(sort==='recommended'?await relay.recommend(db,browse):browse);
  }
  if(resource==='project'&&method==='GET') return json(await relay.projectDetail(db,id!));
  if(resource==='projectQuestions'&&method==='GET') return await relay.listQuestions(db,id!);
  if(resource==='projectPriority'&&method==='GET') return await relay.projectPriorityDetail(db,id!);
  if(resource==='lessons'&&method==='GET') {const q=`%${search.get('q')??''}%`;return json(await rows(db,'SELECT * FROM lessons WHERE title ILIKE $1 OR assumed ILIKE $1 OR happened ILIKE $1 OR change ILIKE $1 OR conditions ILIKE $1 ORDER BY "createdAt" DESC',[q]));}
  if(resource==='lesson'&&method==='GET') {
   const lesson=await one(db,'lessons',id!);
   return json({lesson,project:await one(db,'projects',lesson.projectId)});
  }
  if(resource==='comments'&&method==='GET') {
   await one(db,'lessons',id!); const comments=await rows(db,'SELECT * FROM comments WHERE "lessonId"=$1 ORDER BY "createdAt", id',[id]); const referrals=await rows(db,'SELECT * FROM referrals WHERE "lessonId"=$1 ORDER BY "createdAt"',[id]);
   return json({comments:await Promise.all(comments.map(async c=>({...c,author:await one(db,'users',c.authorId)}))),referrals:await Promise.all(referrals.map(async r=>({...r,mentor:await one(db,'users',r.mentorId),staff:await one(db,'users',r.staffId)})))});
  }
  const user=await actor(req,db);
  if(resource==='mentorExpertise'&&(method==='GET'||method==='PATCH'))return await recommendations.profile(req,db,user);
  if(resource==='questionRecommendations'&&method==='GET')return json(await recommendations.recommendations(db,user,id!));
  if(resource==='questionAnalysisRetry'&&method==='POST'){
   const question=await one(db,'project_questions',id!);
   if(user.role!=='staff'&&question.authorId!==user.id)fail(403,'FORBIDDEN','Only the asker or Staff can retry analysis');
   if(!question.wantsMentor)fail(409,'MENTOR_NOT_REQUESTED','This is an open discussion');
   await parse(req,z.object({}).strict());await db.transaction(sql=>enqueueQuestion(sql,id!,true));
   return json(await recommendations.recommendations(db,user,id!,true),202);
  }
  if(resource==='pickups'&&method==='POST') return await relay.pickup(req,db,user,id!);
  if(resource==='projectQuestions'&&method==='POST') return await relay.askQuestion(req,db,user,id!);
  if(resource==='questionPosts'&&method==='POST') return await relay.addPost(req,db,user,id!);
  if(resource==='projectPost'&&method==='DELETE') return await relay.deletePost(db,user,id!);
  if(resource==='questionReferral'&&method==='POST') return await relay.refer(req,db,user,id!);
  if(resource==='workbench'&&method==='GET') return await relay.workbench(db,user,sortParam(search,['priority','oldest']));
  if(resource==='projectQuestion'&&method==='PATCH') return await relay.updateDueAt(req,db,user,id!);
  if(resource==='inbox'&&method==='GET') return await inbox.listInbox(req,db,user);
  if(resource==='inboxItem'&&method==='PATCH') return await inbox.markRead(req,db,user,id!);
  if(resource==='inboxPreferences'&&method==='GET') return await inbox.getPreferences(db,user);
  if(resource==='inboxPreferences'&&method==='PATCH') return await invitations.setPreferences(req,db,user);
  if(resource==='invitationRespond'&&method==='POST') return await invitations.respond(req,db,user,id!);
  if(resource==='interestedHelpers'&&method==='GET') return await invitations.interestedHelpers(db,user,id!);
  if(resource==='invitationStatus'&&method==='GET') return await invitations.runnerStatus(db,user);
  if(resource==='mentorWorkload'&&method==='GET') return await relay.mentorWorkload(db,user);
  if(resource==='introduction'&&method==='GET') return await intro.getEditor(db,user,id!);
  if(resource==='introduction'&&method==='PATCH') return await intro.publish(req,db,user,id!);
  if(resource==='introductionGenerate'&&method==='POST') return await intro.generate(req,db,user,id!);
  if(resource==='projects'&&method==='POST') {
   role(user,'student'); const input=await parse(req,v.projectInput);
   const data=validateProject({tags:[],demoUrl:null,...input,status:input.status??'ongoing',reflection:{...v.emptyReflection(),...input.reflection}});
   const saved=await db.transaction(async sql=>{const project=await insert(sql,'projects',{id:randomUUID(),ownerId:user.id,...data});await enqueueProject(sql,project.id);return project;});return json((await intro.browseProjects(db,[saved]))[0],201);
  }
  if(resource==='project'&&method==='PATCH') {
   const input=await parse(req,v.projectInput.partial());
   if (!Object.keys(input).length) fail(400,'INVALID_INPUT','Provide at least one field');
   const project=await db.transaction(async sql=> {
    await inbox.lockDispatch(sql);
    const current=(await rows(sql,'SELECT * FROM projects WHERE id=$1 FOR UPDATE',[id]))[0]??fail(404,'NOT_FOUND','Record not found');
    role(user,'student'); if(current.ownerId!==user.id) fail(403,'FORBIDDEN','Only the project owner can edit this project');
    const {title,summary,courseOrClub,term,tags,status,codeUrl,demoUrl}=current;
    const data=validateProject({title,summary,courseOrClub,term,tags,status,codeUrl,demoUrl,...input,reflection:{...v.emptyReflection(),...current.reflection,...input.reflection}});
    const saved=await update(sql,'projects',id!,data);
    if(recommendations.sourceHash(current)!==recommendations.sourceHash(saved))await enqueueProject(sql,id!);
    await invitations.settlePickup(sql,id!); // leaving Paused ends pending pickup invitations
    return saved;
   }); return json((await intro.browseProjects(db,[project]))[0]);
  }
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
  return fail(405,'METHOD_NOT_ALLOWED','Unsupported operation');
 } catch(error) {
  if(error instanceof ApiFailure)return Response.json({error:{code:error.code,message:error.message}},{status:error.status});
  if((error as {code?:string}).code==='23505')return Response.json({error:{code:'CONFLICT',message:'This record already exists'}},{status:409});
  console.error('API request failed',error instanceof Error?error.message:'Unknown failure');return Response.json({error:{code:'SERVER_ERROR',message:'Unable to complete request. Check server database configuration.'}},{status:500});
 }
}
