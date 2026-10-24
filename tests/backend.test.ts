import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { handle } from '../src/server/api';
import { closeDatabase, database } from '../src/server/db';
import { GET as projectGET } from '../src/app/api/projects/[id]/route';
import { GET as usersGET } from '../src/app/api/users/route';

async function request(resource: string, id?: string, method='GET', user?: string, body?: unknown, query='') {
 const req = new Request(`http://localhost/api/${resource}${query}`, {method,headers:{...(user?{'x-demo-user-id':user}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const response=await handle(req,resource,id); return {status:response.status,...await response.json()};
}
test('complete journey uses real PostgreSQL engine, permissions, idempotence and restart persistence', async () => {
 process.env.DATABASE_MODE='pglite'; process.env.PGLITE_DATA_DIR=await mkdtemp(path.join(tmpdir(),'pass-it-on-test-'));
 try {
  assert.equal((await request('health')).data.databaseMode,'pglite');
  assert.equal((await request('users')).data.length,4);
  assert.equal((await usersGET(new Request('http://localhost/api/users'))).status,200);
  const wrapper=await projectGET(new Request('http://localhost/api/projects/project-signup'),{params:Promise.resolve({id:'project-signup'})});assert.equal((await wrapper.json()).data.project.id,'project-signup');
  assert.equal((await request('projects',undefined,'GET',undefined,undefined,'?status=ongoing')).data.length,1);
  assert.equal((await request('projects',undefined,'GET',undefined,undefined,'?status=wrong')).status,400);
  assert.ok((await request('lessons',undefined,'GET',undefined,undefined,'?q=information')).data.some((lesson: {id:string})=>lesson.id==='lesson-fields'));
  const projectInput={title:'New project',summary:'A new project',courseOrClub:'OSU',term:'Fall 2026',tags:['web'],status:'ongoing'};
  assert.equal((await request('projects',undefined,'POST',undefined,projectInput)).status,401);
  assert.equal((await request('projects',undefined,'POST','staff-kevin',projectInput)).status,403);
  assert.equal((await request('project','project-signup','PATCH','student-mia',{status:'paused'})).status,403);
  const created=await request('projects',undefined,'POST','student-alex',projectInput);assert.equal(created.status,201);
  const lessonData={type:'worked',title:'A lesson',assumed:'Assumption',happened:'Observation',change:'Action',conditions:'Conditions',artifacts:[{label:'Evidence',url:'https://example.com'}]};
  const lesson=await request('projectLessons',created.data.id,'POST','student-alex',lessonData);assert.equal(lesson.status,201);
  assert.equal((await request('lesson',lesson.data.id,'PATCH','student-mia',{title:'Changed'})).status,403);
  assert.equal((await request('lesson',lesson.data.id,'PATCH','student-alex',{conditions:'Updated'})).status,200);
  assert.equal((await request('projectLessons',created.data.id,'POST','student-alex',{...lessonData,artifacts:[{label:'Bad',url:'javascript:alert(1)'}]})).status,400);
  const question=await request('comments',lesson.data.id,'POST','student-mia',{kind:'question',body:'Does this fit our event?'});assert.equal(question.status,201);
  assert.equal((await request('comments','lesson-fields','POST','student-mia',{kind:'reply',body:'Wrong lesson',parentId:question.data.id})).status,400);
  assert.equal((await request('referrals',undefined,'POST','student-mia',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Relevant expertise'})).status,403);
  assert.equal((await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'student-alex',reason:'Relevant expertise'})).status,400);
  const referral=await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Relevant expertise'});assert.equal(referral.status,201);
  assert.equal((await request('referrals',undefined,'POST','staff-kevin',{questionCommentId:question.data.id,mentorId:'mentor-sarah',reason:'Again'})).status,409);
  assert.equal((await request('referralReply',referral.data.id,'POST','student-alex',{body:'Advice'})).status,403);
  const concurrentReplies=await Promise.all([request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Test required fields with your users.'}),request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Duplicate concurrent reply.'})]);assert.deepEqual(concurrentReplies.map(r=>r.status).sort(),[201,409]);
  assert.equal((await request('referralReply',referral.data.id,'POST','mentor-sarah',{body:'Again'})).status,409);
  const discussion=await request('comments',lesson.data.id);assert.equal(discussion.data.referrals[0].status,'completed');assert.equal(discussion.data.comments.length,2);assert.equal(discussion.data.comments[1].author.id,'mentor-sarah');
  assert.equal((await request('adoptions',lesson.data.id,'POST','student-alex',{adoptingProjectId:created.data.id})).status,400);
  const adoption=await request('adoptions',lesson.data.id,'POST','student-mia',{adoptingProjectId:'project-events'});assert.equal(adoption.status,201);
  const concurrentAdoptions=await Promise.all([request('adoptions',lesson.data.id,'POST','student-mia',{adoptingProjectId:'project-events'}),request('adoptions',lesson.data.id,'POST','student-mia',{adoptingProjectId:'project-events'})]);assert.ok(concurrentAdoptions.every(r=>r.status===201&&r.data.id===adoption.data.id));
  assert.equal((await request('lesson',lesson.data.id)).data.stats.total,0);
  const savedOnDestination=(await request('project','project-events')).data.adoptedLessons;assert.equal(savedOnDestination.length,1);assert.equal(savedOnDestination[0].adoption.result,null);assert.equal(savedOnDestination[0].lesson.id,lesson.data.id);assert.equal(savedOnDestination[0].sourceProject.id,created.data.id);
  assert.equal((await request('adoption',adoption.data.id,'PATCH','student-alex',{result:'worked',note:'Worked'})).status,403);
  assert.equal((await request('adoption',adoption.data.id,'PATCH','student-mia',{result:'worked',note:''})).status,400);
  assert.equal((await request('adoption',adoption.data.id,'PATCH','student-mia',{result:'partial',note:'Adjusted the questions.'})).status,200);
  assert.equal((await request('adoption',adoption.data.id,'PATCH','student-mia',{result:'worked',note:'Worked after testing.'})).status,200);
  assert.equal((await request('lesson',lesson.data.id)).data.stats.total,1);
  assert.equal((await request('project','project-events')).data.adoptedLessons[0].adoption.result,'worked');
  assert.equal((await request('project',created.data.id,'PATCH','student-alex',{status:'paused'})).status,200);
  assert.equal((await request('project',created.data.id)).data.downstreamAdoptions.length,1);
  assert.equal((await request('lesson','missing')).status,404);
  const malformed=await handle(new Request('http://localhost/api/projects',{method:'POST',headers:{'x-demo-user-id':'student-alex'},body:'{'}),'projects');assert.equal(malformed.status,400);
  await closeDatabase();
  assert.equal((await request('lesson',lesson.data.id)).data.stats.total,1);
  assert.equal((await request('project','project-events')).data.adoptedLessons[0].adoption.result,'worked');
  assert.equal((await request('comments',lesson.data.id)).data.comments.length,2);
  // Transaction rollback prevents partial writes.
  const db=await database();await assert.rejects(db.transaction(async sql=>{await sql.query('UPDATE projects SET title=$1 WHERE id=$2',['Never persist',created.data.id]);throw new Error('rollback');}));
  assert.equal((await request('project',created.data.id)).data.project.title,'New project');
 } finally {await closeDatabase();}
});
