import { z } from 'zod';
import type { Sql } from './db';
import { fail, json, rows, ownProject, parse } from './http';
import { publishP5Schema, topicContentSchema, normalizeGitHubUrl } from '../shared/p5-validation';
import type { User } from '../shared/types';
import { sourceHash } from './recommendations';
import { repositoryHash, currentRepositoryHash } from './github';
import { enqueueProject, type AIStorage } from './ai-jobs';
export { sourceHash } from './recommendations';
type Row=Record<string,any>;
export function publicIntroduction(p:Row|null|undefined,hash:string,repoHash:string|null){
 if(!p||p.version!==5||p.sourceHash!==hash||!repoHash||p.repositoryHash!==repoHash||!topicContentSchema.safeParse({sentences:p.sentences,topics:p.topics,technologies:p.technologies}).success)return null;
 return{sentences:p.sentences,topics:p.topics,technologies:p.technologies,tags:[...p.topics,...p.technologies],version:5 as const,sources:p.sources,reviewedAt:p.reviewedAt,stale:false};
}
export async function browseProjects(db:Sql,projects:Row[]):Promise<Row[]>{
 if(!projects.length)return projects;
 const map=new Map((await rows(db,'SELECT "projectId",published FROM project_introductions WHERE "projectId"=ANY($1::text[])',[projects.map(p=>p.id)])).map(p=>[p.projectId,p.published]));
 const repoUrls=projects.map(p=>p.codeUrl??map.get(p.id)?.sources?.repoUrl).filter(Boolean);
 const repoHashes=new Map((await rows(db,'SELECT "repoUrl",snapshot FROM github_source_cache WHERE "repoUrl"=ANY($1::text[])',[repoUrls])).map(r=>[r.repoUrl,repositoryHash(r.snapshot)]));
 return projects.map(p=>{const published=map.get(p.id);const introduction=publicIntroduction(published,sourceHash(p),repoHashes.get(p.codeUrl??published?.sources?.repoUrl)??null);return{...p,tags:introduction?.tags??[],introduction};});
}
export async function introductionEditor(db:Sql,project:Row){
 const intro=(await rows(db,'SELECT * FROM project_introductions WHERE "projectId"=$1',[project.id]))[0];const hash=sourceHash(project);
 const job=(await rows(db,'SELECT * FROM ai_jobs WHERE kind=\'project\' AND "targetId"=$1 ORDER BY "updatedAt" DESC LIMIT 1',[project.id]))[0];
 const repoHash=project.codeUrl?await currentRepositoryHash(db,project.codeUrl):null;
 const draft=intro?.draft?.version===5&&intro.draft.sourceHash===hash&&intro.draft.repositoryHash===repoHash?intro.draft:null;
 const stale=job?.sourceHash!==hash||(intro?.draft?.version===5&&!draft&&job?.status==='ready');
 return{sourceHash:hash,draft,published:publicIntroduction(intro?.published,hash,repoHash),status:job?(stale?'stale':job.status):null,error:job?.error??null,sources:draft?.sources??null};
}
export async function getEditor(db:Sql,user:User,id:string){return json(await introductionEditor(db,await ownProject(db,id,user)));}
export async function generate(req:Request,db:AIStorage,user:User,id:string){const project=await ownProject(db,id,user);await parse(req,z.object({}).strict());try{normalizeGitHubUrl(project.codeUrl??'');}catch{fail(400,'GITHUB_REQUIRED','Add a public GitHub repository URL before generating.');}await db.transaction(sql=>enqueueProject(sql,id,true));return json(await introductionEditor(db,project),202);}
export async function publish(req:Request,db:AIStorage,user:User,id:string){
 await ownProject(db,id,user);const input=await parse(req,publishP5Schema);
 return json(await db.transaction(async sql=>{
  const project=(await rows(sql,'SELECT * FROM projects WHERE id=$1 FOR UPDATE',[id]))[0];
  const intro=(await rows(sql,'SELECT * FROM project_introductions WHERE "projectId"=$1 FOR UPDATE',[id]))[0];const hash=sourceHash(project);
  if(intro?.draft?.version!==5||intro.draft.id!==input.draftId)fail(409,'DRAFT_CONFLICT','A newer draft replaced this one. Reload to review it.');
  const repoHash=project.codeUrl?await currentRepositoryHash(sql,project.codeUrl,true):null;
  if(input.sourceHash!==hash||intro.draft.sourceHash!==hash||!repoHash||intro.draft.repositoryHash!==repoHash)fail(409,'INTRODUCTION_STALE','The project or repository sources changed. Generate a current draft.');
  const published={...intro.draft,sentences:input.sentences,reviewedAt:new Date().toISOString(),reviewerId:user.id};
  await sql.query('UPDATE project_introductions SET published=$2,"updatedAt"=clock_timestamp() WHERE "projectId"=$1',[id,JSON.stringify(published)]);
  return introductionEditor(sql,project);
 }));
}
